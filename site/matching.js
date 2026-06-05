/**
 * matching.js — Moteur de matching Andjix Placement
 *
 * Dépendances (chargées avant ce script) :
 *   - placement-config.js  → window.PLACEMENT_CONFIG
 *   - EmailJS SDK (CDN)    → window.emailjs
 *
 * Fonctions publiques exposées sur window.AndjixMatching :
 *   matchCandidats(employeur, candidats)  → [{candidat, score, criteresMatchés}]
 *   fetchEmployeurs()                     → Promise<record[]>
 *   fetchCandidatsDisponibles()           → Promise<record[]>
 *   sendMatchAlert(employeur, matches)    → Promise
 */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════════
     1. TABLES DE RÉFÉRENCE
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Fourchettes salariales ordonnées du plus bas au plus élevé.
   * Les valeurs ici doivent correspondre EXACTEMENT aux options Single Select
   * définies dans Airtable (champs "Salaire offert" et "Salaire souhaité").
   */
  const SALARY_ORDER = [
    '< 35 000 $',
    '35 000 – 45 000 $',
    '45 000 – 55 000 $',
    '55 000 – 70 000 $',
    '70 000 – 90 000 $',
    '> 90 000 $',
  ];

  /**
   * Délais de recrutement employeur → nombre de jours max.
   * Doit correspondre aux options du champ "Délai recrutement" dans Airtable.
   */
  const DELAI_JOURS = {
    'ASAP (< 2 semaines)': 14,
    '1 mois':              30,
    '2-3 mois':            75,
    'Flexible (> 3 mois)': 120,
  };

  /**
   * Disponibilité candidat → nombre de jours avant disponibilité.
   * Doit correspondre aux options du champ "Disponibilité" dans Airtable.
   */
  const DISPO_JOURS = {
    'Immédiatement':       0,
    'Dans les 2 semaines': 14,
    'Dans le mois':        30,
    'Dans 2 à 3 mois':    75,
    'Plus de 3 mois':      120,
  };


  /* ══════════════════════════════════════════════════════════════════════════
     2. FONCTIONS UTILITAIRES
     ══════════════════════════════════════════════════════════════════════════ */

  /** Normalise une chaîne : minuscules + trim pour comparaison souple. */
  function norm(s) {
    return (s || '').toLowerCase().trim();
  }

  /**
   * Compatibilité salariale.
   * Renvoie true si les deux fourchettes sont identiques ou adjacentes (±1 bucket).
   * Ex : "45 000–55 000 $" (idx 2) est compatible avec "55 000–70 000 $" (idx 3).
   */
  /** Normalise les tirets et espaces pour comparer les fourchettes salariales.
   *  Accepte "-", "–", "—" et variations d'espaces (ex: "55 000 - 70 000 $"). */
  function normSalary(s) {
    return (s || '').replace(/\s*[-–—]\s*/g, ' – ').trim();
  }

  function salaireCompatible(offert, souhaite) {
    const normOrder = SALARY_ORDER.map(normSalary);
    const a = normOrder.indexOf(normSalary(offert));
    const b = normOrder.indexOf(normSalary(souhaite));
    if (a === -1 || b === -1) return false;
    return Math.abs(a - b) <= 1;
  }

  /**
   * Compatibilité de disponibilité.
   * Renvoie true si le candidat est disponible avant ou au plus tard
   * à la date butoir de recrutement de l'employeur.
   */
  function dispoCompatible(delaiEmployeur, dispoCandidat) {
    const maxJours = DELAI_JOURS[delaiEmployeur];
    const joursCandidat = DISPO_JOURS[dispoCandidat];
    if (maxJours == null || joursCandidat == null) return false;
    return joursCandidat <= maxJours;
  }

  /**
   * Compatibilité linguistique.
   * languesRequises : tableau (multi-select Airtable) de l'employeur.
   * languesParlees  : tableau (multi-select Airtable) du candidat.
   *
   * Règle :
   *   - Si l'employeur exige "Bilingue FR/EN" → le candidat doit avoir
   *     "Bilingue FR/EN" OU (Français ET Anglais) dans ses langues.
   *   - Pour toute autre langue requise → au moins une langue requise
   *     doit figurer parmi les langues du candidat.
   */
  function langueCompatible(languesRequises, languesParlees) {
    const req = (languesRequises || []).map(norm);
    const has = (languesParlees  || []).map(norm);
    if (!req.length || !has.length) return false;

    for (const reqLang of req) {
      if (reqLang === 'bilingue fr/en') {
        const hasBilingual = has.includes('bilingue fr/en');
        const hasFr = has.some(l => l.includes('fran'));
        const hasEn = has.some(l => l.includes('angl') || l.includes('engl') || l === 'en');
        if (hasBilingual || (hasFr && hasEn)) return true;
      } else {
        if (has.some(l => l.includes(reqLang) || reqLang.includes(l))) return true;
      }
    }
    return false;
  }

  /**
   * Compatibilité de type de contrat.
   * Renvoie true s'il existe au moins une valeur commune entre
   * les types acceptés par l'employeur et ceux souhaités par le candidat.
   */
  function contratCompatible(contratsEmployeur, contratsCandidat) {
    const empC = (contratsEmployeur || []).map(norm);
    const canC = (contratsCandidat  || []).map(norm);
    if (!empC.length || !canC.length) return false;
    return empC.some(c => canC.includes(c));
  }


  /* ══════════════════════════════════════════════════════════════════════════
     3. ALGORITHME DE MATCHING (score /7)
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * matchCandidats(employeur, candidats)
   *
   * Compare un employeur avec une liste de candidats et attribue un score
   * sur 7 points selon 5 critères :
   *
   *   Critère              Points  Champs comparés
   *   ─────────────────────────────────────────────────────────────────
   *   Secteur identique      2     Employeur.Secteur ↔ Candidat."Secteurs ciblés"
   *   Langue compatible      2     Employeur."Langues requises" ↔ Candidat."Langues parlées"
   *   Type contrat           1     Employeur."Type contrat" ↔ Candidat."Type contrat"
   *   Fourchette salariale   1     Employeur."Salaire offert" ↔ Candidat."Salaire souhaité"
   *   Disponibilité          1     Employeur."Délai recrutement" ↔ Candidat."Disponibilité"
   *   ─────────────────────────────────────────────────────────────────
   *   TOTAL                  7
   *
   * @param {object}   employeur  Record Airtable (avec .fields) de Employeurs_Andjix
   * @param {object[]} candidats  Array de records Airtable de Candidats_Andjix
   * @returns {Array<{candidat:object, score:number, criteresMatchés:Array}>}
   *   Uniquement les candidats avec score ≥ 4, triés par score décroissant.
   *   Chaque élément de criteresMatchés : { critere, pts, detail }
   */
  function matchCandidats(employeur, candidats) {
    if (!employeur || !Array.isArray(candidats)) return [];

    const ef = employeur.fields || {};
    const results = [];

    for (const candidat of candidats) {
      const cf = candidat.fields || {};
      let score = 0;
      const criteresMatchés = [];

      // ── Critère 1 : Secteur (2 pts) ──────────────────────────────────────
      const empSecteur = ef['Secteur'] || '';
      const candSecteurs = cf['Secteurs ciblés'] || [];
      if (empSecteur && candSecteurs.includes(empSecteur)) {
        score += 2;
        criteresMatchés.push({
          critere: 'Secteur',
          pts: 2,
          detail: empSecteur,
        });
      }

      // ── Critère 2 : Langue (2 pts) ───────────────────────────────────────
      const empLangues = ef['Langues requises'] || [];
      const candLangues = cf['Langues parlées'] || [];
      if (langueCompatible(empLangues, candLangues)) {
        score += 2;
        criteresMatchés.push({
          critere: 'Langue',
          pts: 2,
          detail: empLangues.join(', '),
        });
      }

      // ── Critère 3 : Contrat (1 pt) ───────────────────────────────────────
      const empContrats = ef['Type contrat'] || [];
      const candContrats = cf['Type contrat'] || [];
      if (contratCompatible(empContrats, candContrats)) {
        const matched = empContrats.filter(c => candContrats.map(norm).includes(norm(c)));
        score += 1;
        criteresMatchés.push({
          critere: 'Contrat',
          pts: 1,
          detail: matched.join(', '),
        });
      }

      // ── Critère 4 : Salaire (1 pt) ───────────────────────────────────────
      if (salaireCompatible(ef['Salaire offert'], cf['Salaire souhaité'])) {
        score += 1;
        criteresMatchés.push({
          critere: 'Salaire',
          pts: 1,
          detail: cf['Salaire souhaité'] || '—',
        });
      }

      // ── Critère 5 : Disponibilité (1 pt) ────────────────────────────────
      if (dispoCompatible(ef['Délai recrutement'], cf['Disponibilité'])) {
        score += 1;
        criteresMatchés.push({
          critere: 'Disponibilité',
          pts: 1,
          detail: cf['Disponibilité'] || '—',
        });
      }

      if (score >= 4) {
        results.push({ candidat, score, criteresMatchés });
      }
    }

    // Tri décroissant par score
    return results.sort((a, b) => b.score - a.score);
  }


  /* ══════════════════════════════════════════════════════════════════════════
     4. AIRTABLE API
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * Récupère tous les enregistrements d'une table Airtable (gère la pagination).
   * @param {string} tableName   Nom exact de la table dans Airtable
   * @param {string} [formula]   Formule de filtre (ex: "{Statut}='Actif'")
   * @returns {Promise<object[]>} Tableau de records Airtable {id, fields}
   */
  async function airtableFetchAll(tableName, formula) {
    const cfg = window.PLACEMENT_CONFIG && window.PLACEMENT_CONFIG.airtable;
    if (!cfg || !cfg.token || cfg.token === 'REPLACE_ME') {
      throw new Error('Clé Airtable non configurée dans placement-config.js');
    }

    const baseUrl = `https://api.airtable.com/v0/${cfg.baseId}/${encodeURIComponent(tableName)}`;
    let allRecords = [];
    let offset = null;

    do {
      const params = new URLSearchParams();
      if (formula) params.set('filterByFormula', formula);
      params.set('pageSize', '100');
      if (offset) params.set('offset', offset);

      const response = await fetch(`${baseUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${cfg.token}`,
        },
      });

      if (!response.ok) {
        let errMsg = `HTTP ${response.status}`;
        try {
          const errData = await response.json();
          errMsg = errData.error?.message || errMsg;
        } catch (_) {}
        throw new Error(`Airtable API — ${tableName} : ${errMsg}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records || []);
      offset = data.offset || null;

    } while (offset);

    return allRecords;
  }

  /** Récupère tous les employeurs avec statut "Actif". */
  function fetchEmployeurs() {
    const table = window.PLACEMENT_CONFIG.airtable.tables.employeurs;
    return airtableFetchAll(table, `{Statut} = 'Actif'`);
  }

  /** Récupère tous les candidats avec statut "Disponible". */
  function fetchCandidatsDisponibles() {
    const table = window.PLACEMENT_CONFIG.airtable.tables.candidats;
    return airtableFetchAll(table, `{Statut} = 'Disponible'`);
  }


  /* ══════════════════════════════════════════════════════════════════════════
     5. NOTIFICATION EMAILJS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * sendMatchAlert(employeur, matches)
   *
   * Envoie un email récapitulatif à info.andjix@gmail.com via EmailJS.
   * Nécessite que le SDK EmailJS soit chargé (CDN dans admin-matching.html).
   *
   * @param {object}   employeur  Record Airtable de l'employeur
   * @param {object[]} matches    Résultats de matchCandidats()
   * @returns {Promise}
   */
  async function sendMatchAlert(employeur, matches) {
    const cfg = window.PLACEMENT_CONFIG && window.PLACEMENT_CONFIG.emailjs;
    if (!cfg || !cfg.userId || cfg.userId === 'REPLACE_ME') {
      throw new Error('EmailJS non configuré dans placement-config.js');
    }
    if (typeof emailjs === 'undefined') {
      throw new Error('SDK EmailJS non chargé (vérifier la balise <script> dans admin-matching.html)');
    }

    const ef = employeur.fields || {};

    // Construction de la liste de matchs en texte brut
    const matchList = matches.map((m, i) => {
      const cf = m.candidat.fields || {};
      const prenom = cf['Prénom'] || '';
      const nom    = cf['Nom'] || '';
      const criteres = m.criteresMatchés.map(c => `${c.critere} (+${c.pts})`).join(', ');
      const poste  = cf['Poste recherché'] || 'N/A';
      const dispo  = cf['Disponibilité'] || 'N/A';
      const mail   = cf['Courriel'] || '';
      const tel    = cf['Téléphone'] || '';
      return (
        `${i + 1}. ${prenom} ${nom} — Score ${m.score}/7\n` +
        `   Critères : ${criteres}\n` +
        `   Poste ciblé : ${poste} | Disponible : ${dispo}\n` +
        `   Contact : ${mail}${tel ? ' · ' + tel : ''}`
      );
    }).join('\n\n');

    const params = {
      to_email:           cfg.to,
      employeur_nom:      ef['Nom entreprise']    || 'N/A',
      employeur_secteur:  ef['Secteur']            || 'N/A',
      employeur_poste:    ef['Postes recherchés']  || 'N/A',
      match_count:        String(matches.length),
      match_list:         matchList,
      date_matching:      new Date().toLocaleDateString('fr-CA', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          }),
    };

    // Initialisation EmailJS (idempotente)
    emailjs.init(cfg.userId);

    return emailjs.send(cfg.serviceId, cfg.templateId, params);
  }


  /* ══════════════════════════════════════════════════════════════════════════
     6. EXPORT PUBLIC
     ══════════════════════════════════════════════════════════════════════════ */

  window.AndjixMatching = {
    matchCandidats,
    fetchEmployeurs,
    fetchCandidatsDisponibles,
    sendMatchAlert,
  };

})();
