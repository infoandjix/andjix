// Andjix — Matching Engine + Alertes EmailJS

// ─── Normalisation ───────────────────────────────────────────────────────────

function normalise(val) {
  if (!val) return '';
  return val.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function normaliseArr(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalise);
}

// ─── Compatibilité salariale ─────────────────────────────────────────────────

const SALARY_RANK = {
  'salaire minimum': 1, '17 - 20': 2, '20 - 25': 3,
  '25 - 30': 4, '30+': 5, 'ouvert': 99, 'a discuter': 99
};

function salaryKey(str) {
  const s = normalise(str);
  if (s.includes('minimum') || s.includes('17,20')) return 'salaire minimum';
  if (s.includes('17') && s.includes('20')) return '17 - 20';
  if (s.includes('20') && s.includes('25')) return '20 - 25';
  if (s.includes('25') && s.includes('30')) return '25 - 30';
  if (s.includes('30')) return '30+';
  if (s.includes('ouvert') || s.includes('discuter')) return 'ouvert';
  return null;
}

function salaryCompatible(offert, souhaite) {
  if (!offert || !souhaite) return false;
  const ko = SALARY_RANK[salaryKey(offert)];
  const ks = SALARY_RANK[salaryKey(souhaite)];
  if (!ko || !ks) return false;
  if (ks === 99 || ko === 99) return true;
  return ko >= ks;
}

// ─── Compatibilité disponibilité / délai ─────────────────────────────────────

const DISPO_RANK = {
  'immediate': 1, '2 semaines': 2, '1 mois': 3, 'plus': 4
};

function dispoKey(str) {
  const s = normalise(str);
  if (s.includes('immed') || s.includes('des que')) return 'immediate';
  if (s.includes('2 semaine') || s.includes('deux semaine')) return '2 semaines';
  if (s.includes('1 mois') || s.includes('un mois') || s.includes('mois')) return '1 mois';
  return 'plus';
}

function dispoCompatible(delaiEmployeur, dispoCandidat) {
  if (!delaiEmployeur || !dispoCandidat) return false;
  const ke = DISPO_RANK[dispoKey(delaiEmployeur)];
  const kc = DISPO_RANK[dispoKey(dispoCandidat)];
  if (!ke || !kc) return false;
  return kc <= ke;
}

// ─── Compatibilité langue ─────────────────────────────────────────────────────

function langueCompatible(languesRequises, languesParlees) {
  const req = normaliseArr(languesRequises);
  const parl = normaliseArr(languesParlees);
  if (req.length === 0 || parl.length === 0) return false;
  const candidatBilingue = parl.includes('bilingue') ||
    (parl.includes('francais') && parl.includes('anglais'));
  return req.some(r => {
    if (r === 'bilingue') return candidatBilingue;
    return parl.includes(r) || candidatBilingue;
  });
}

// ─── Compatibilité secteur ────────────────────────────────────────────────────

function secteurCompatible(secteurEmployeur, secteursCandidat) {
  if (!secteurEmployeur) return false;
  const se = normalise(secteurEmployeur);
  const sc = normaliseArr(secteursCandidat);
  return sc.some(s => se.includes(s) || s.includes(se));
}

// ─── Compatibilité contrat ────────────────────────────────────────────────────

function contratCompatible(contratsEmployeur, contratsCandidat) {
  const ce = normaliseArr(contratsEmployeur);
  const cc = normaliseArr(contratsCandidat);
  if (ce.length === 0 || cc.length === 0) return false;
  if (cc.includes('flexible')) return true;
  return ce.some(c => cc.includes(c));
}

// ─── Fonction principale de matching ─────────────────────────────────────────

/**
 * matchCandidats(employeur, candidats)
 *
 * @param {Object} employeur  - Enregistrement Airtable employeur (champs Airtable)
 * @param {Array}  candidats  - Tableau d'enregistrements Airtable candidats
 * @returns {Array} Candidats avec score >= 4, triés par score décroissant
 *   Format : [{ candidat, score, criteres_matches }]
 */
function matchCandidats(employeur, candidats) {
  const e = employeur.fields || employeur;

  return candidats
    .filter(c => {
      const statut = normalise((c.fields || c)['Statut'] || '');
      return statut === 'disponible';
    })
    .map(candidat => {
      const c = candidat.fields || candidat;
      const criteres = {};
      let score = 0;

      // Secteur identique → 2 pts
      if (secteurCompatible(e['Secteur'], c['Secteurs ciblés'])) {
        criteres.secteur = true;
        score += 2;
      }

      // Langue compatible → 2 pts
      if (langueCompatible(e['Langues requises'], c['Langues parlées'])) {
        criteres.langue = true;
        score += 2;
      }

      // Type contrat compatible → 1 pt
      if (contratCompatible(e['Type contrat'], c['Type contrat'])) {
        criteres.contrat = true;
        score += 1;
      }

      // Fourchette salariale compatible → 1 pt
      if (salaryCompatible(e['Salaire offert'], c['Salaire souhaité'])) {
        criteres.salaire = true;
        score += 1;
      }

      // Disponibilité dans les délais → 1 pt
      if (dispoCompatible(e['Délai recrutement'], c['Disponibilité'])) {
        criteres.disponibilite = true;
        score += 1;
      }

      return { candidat, score, criteres_matches: criteres };
    })
    .filter(r => r.score >= 4)
    .sort((a, b) => b.score - a.score);
}

// ─── Notification EmailJS ─────────────────────────────────────────────────────

/**
 * sendMatchAlert(employeur, matches)
 * Envoie un récapitulatif des matches à info.andjix@gmail.com via EmailJS.
 * Requiert EmailJS chargé dans la page et EMAILJS_* configurés dans config.js.
 */
async function sendMatchAlert(employeur, matches) {
  if (!matches || matches.length === 0) return;

  const e = employeur.fields || employeur;

  const lignes = matches.map(({ candidat, score, criteres_matches }) => {
    const c = candidat.fields || candidat;
    const criteres = Object.keys(criteres_matches)
      .map(k => ({ secteur: 'Secteur', langue: 'Langue', contrat: 'Contrat',
                   salaire: 'Salaire', disponibilite: 'Disponibilité' }[k])
      ).join(', ');
    return `• ${c['Prénom'] || ''} ${c['Nom'] || ''} — Score: ${score}/7 — Critères: ${criteres}\n  Poste: ${c['Poste recherché'] || 'N/A'} | Tél: ${c['Téléphone'] || 'N/A'} | ${c['Courriel'] || ''}`;
  }).join('\n\n');

  const templateParams = {
    to_email: 'info.andjix@gmail.com',
    employeur_nom: e['Nom entreprise'] || 'N/A',
    employeur_poste: e['Postes recherchés'] || 'N/A',
    nb_matches: matches.length,
    liste_matches: lignes,
    date: new Date().toLocaleDateString('fr-CA', { dateStyle: 'long' })
  };

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
    console.log('Alerte match envoyée à info.andjix@gmail.com');
  } catch (err) {
    console.error('Erreur EmailJS :', err);
  }
}
