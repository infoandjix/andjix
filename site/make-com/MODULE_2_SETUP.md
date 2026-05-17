# Module 2 — Setup playbook pour André

**Objectif :** rendre opérationnelles les 3 automatisations Make.com et brancher tout le site `andjix.ca` dessus.

**Décision :** Voiceflow est **abandonné** — l'assistant IA déjà en ligne à `ai.andjix.ca` (Claude Opus 4.7 + Firebase + Resend) remplace avantageusement Voiceflow. Le site, le bot et les formulaires Typeform vont **tous** alimenter une seule base Airtable via Make.com.

---

## Ordre d'exécution (1 demi-journée)

### Étape 1 — Comptes à créer (15 min)

| Outil      | Compte                              | Plan           |
| ---------- | ----------------------------------- | -------------- |
| Typeform   | `info@andjix.ca`                    | Free           |
| Calendly   | `info@andjix.ca`                    | Free           |
| Airtable   | `info@andjix.ca`                    | Free           |
| Make.com   | `info@andjix.ca`                    | Free (1000 ops)|
| Gmail      | Connecter `info.andjix@gmail.com`   | Existant       |

Stocker tous les mots de passe dans **Bitwarden** (compte partagé avec Emile).

### Étape 2 — Airtable (30 min)

1. Créer le workspace **"Andjix Consulting"**.
2. Suivre `AIRTABLE_SCHEMA.md` pour créer les 3 bases (`Clients`, `Dossiers fiscaux`, `Candidats placement`).
3. Saisir **3 enregistrements de test** dans chaque base (le KanBan sera vide sans données).
4. Créer un **Personal Access Token** à `airtable.com/create/tokens` avec scopes :
   - `data.records:read`
   - `data.records:write`
   - `schema.bases:read`
   - Restreindre au workspace "Andjix Consulting".
   - Le sauvegarder dans Bitwarden — il ne s'affiche qu'une fois.

### Étape 3 — Typeform (45 min)

Créer 3 formulaires :

| Form              | Champs minimaux                                                    | Ref technique |
| ----------------- | ------------------------------------------------------------------ | ------------- |
| **Impôts**        | Nom, Courriel, Téléphone, Statut (particulier/autonome/entreprise), Année(s) concernée(s), Disponibilités | `impots`      |
| **Nouveau arrivant** | Nom, Courriel, Téléphone, Pays d'origine, Date d'arrivée, Besoins (logement/emploi/école/santé/documents) | `newcomer`    |
| **Placement**     | Nom, Courriel, Téléphone, Type de poste, Disponibilité, Expérience, Langues | `placement`   |

Sur chaque form :
- Activer la **redirection finale vers Calendly** (URL `https://calendly.com/andjix-consulting/consultation`).
- Activer la version **EN** (Typeform > Settings > Languages).

Copier les 3 URLs publiques (`https://andjix.typeform.com/to/XXXXXXXX`).

### Étape 4 — Calendly (20 min)

1. Connecter le Google Calendar d'André.
2. Créer **3 event types** :
   - `Consultation fiscale` — 60 min — `calendly.com/andjix-consulting/fiscal`
   - `Accueil arrivant` — 45 min — `calendly.com/andjix-consulting/arrivant`
   - `Entretien candidat` — 30 min — `calendly.com/andjix-consulting/candidat`
3. Activer rappels automatiques (24h + 1h avant).
4. Récupérer un **Personal Access Token** : `calendly.com/integrations/api_webhooks` → Generate token.

### Étape 5 — Faire pointer le site sur les bonnes URLs (5 min)

Sur le repo `andjix` :

1. Ouvrir `andjix-config.js`.
2. Remplacer :
   ```js
   typeform: {
     impots: "https://andjix.typeform.com/to/XXXXXXXX",
     newcomer: "https://andjix.typeform.com/to/YYYYYYYY",
     placement: "https://andjix.typeform.com/to/ZZZZZZZZ",
   },
   ```
3. Vérifier que `calendly` pointe bien sur l'URL générique.
4. Déployer :
   ```bash
   cd ~/ClaudeProjects/giovannielabs.ai/andjix
   vercel --prod --yes
   ```

Tester `andjix.ca` : les boutons "Démarrer mon dossier" et "Réserver une consultation" doivent ouvrir les bonnes pages. S'ils affichent l'alerte "à configurer", `andjix-config.js` n'a pas pris.

### Étape 6 — Make.com — Scénarios A, B, C (2h)

Suivre dans l'ordre :
1. **`SCENARIO_A_NEW_CLIENT.md`** — le plus complexe (4 sources → Airtable → 2 emails). Construire et tester avant de passer à B/C.
2. **`SCENARIO_B_REMINDER.md`** — relance lundi matin sur dossiers inactifs >7j.
3. **`SCENARIO_C_CALENDLY_RDV.md`** — sync Calendly → Airtable.

Garder `WEBHOOK_PAYLOADS.md` ouvert pour les payloads de test.

### Étape 7 — Brancher le bot IA sur Make (10 min)

Une fois le webhook custom du Scénario A créé :

1. Copier l'URL du webhook (format `https://hook.eu2.make.com/abc123...`).
2. L'ajouter au projet Vercel `andjix-ai` :
   ```bash
   cd ~/ClaudeProjects/giovannielabs.ai/andjix-ai
   echo "https://hook.eu2.make.com/abc123..." | vercel env add MAKE_LEAD_WEBHOOK_URL production
   vercel --prod --yes
   ```
3. Tester : ouvrir `ai.andjix.ca`, simuler une conversation jusqu'au formulaire lead, soumettre. La fiche doit apparaître dans Airtable avec `Source = "Bot IA"`.

### Étape 8 — Tests bout en bout (30 min)

| Test                                                | Résultat attendu                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| Soumettre Typeform Impôts (test)                    | Fiche Airtable créée + 2 emails (client + André)                    |
| Soumettre Typeform Arrivant (test)                  | Idem, Segment = "Nouveau arrivant"                                  |
| Soumettre Typeform Placement (test)                 | Idem, Segment = "Candidat placement"                                |
| Conversation bot IA jusqu'au formulaire lead        | Fiche Airtable avec transcript + 2 emails                           |
| Réserver un RDV Calendly avec courriel **connu**    | La fiche existante est mise à jour avec `Date RDV` et `Statut = "RDV planifié"` |
| Réserver un RDV Calendly avec courriel **inconnu**  | Nouvelle fiche créée, notif spéciale à André                        |
| Mettre `Dernière activité` à -10j sur un client de test, "Run once" Scénario B | Email de relance envoyé + `Dernière activité` repassée à aujourd'hui |

### Étape 9 — Activation finale

- Scénarios A et C : `Scheduling: Immediately` (réactifs).
- Scénario B : `Scheduling: As configured` (lundi 9h).
- Vérifier dans Make que les 3 scénarios montrent un point vert.

---

## Variables d'environnement Vercel

À ajouter au projet **`andjix-ai`** (Vercel dashboard ou CLI) :

| Nom                     | Valeur                                                  |
| ----------------------- | ------------------------------------------------------- |
| `MAKE_LEAD_WEBHOOK_URL` | URL du webhook custom du Scénario A (Make.com)          |

Les autres clés (`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `LEAD_EMAIL_TO`, `LEAD_EMAIL_FROM`, `NEXT_PUBLIC_CALENDLY_URL`) sont déjà en place.

---

## Suivi des opérations Make

Estimation mensuelle sur le plan gratuit (1000 ops/mois) :

| Scénario             | Ops/exécution | Volume mensuel attendu | Total ops/mois |
| -------------------- | ------------- | ---------------------- | -------------- |
| A — Nouveau client   | 4             | 50 leads               | 200            |
| B — Relance          | 2 + 1 search  | 20 relances/sem × 4    | 200            |
| C — Calendly RDV     | 4             | 30 RDV                 | 120            |
| **Total**            |               |                        | **~520**       |

Marge confortable. Passer au plan Make Core (9 $/mois, 10 000 ops) si on dépasse 200 leads/mois.

---

## Sécurité

- Tous les tokens (Airtable PAT, Calendly token, Make webhook URLs) restent **secrets**. Aucun ne va dans `andjix-config.js` ni dans le repo public.
- Les webhooks Make.com utilisent une URL aléatoire — c'est le seul mécanisme d'auth. Si la fuite est suspectée, régénérer le webhook dans Make et mettre à jour `MAKE_LEAD_WEBHOOK_URL` sur Vercel.
- Côté PIPEDA : Make.com Europe (`eu2.make.com`) traite les données en UE. Si conformité canadienne stricte requise, basculer sur la région US (`us1.make.com`) lors de la création du compte — pas modifiable ensuite.

---

## Phase 2 (deferred)

- Notification WhatsApp à André (module Make premium, ~9 $/mois)
- Sync inverse Airtable → bot IA (le bot connaît l'historique du client signé)
- Dashboard admin (`admin.andjix.ca`) lit les leads depuis Firestore — ajouter une vue qui pull aussi d'Airtable pour unifier
- Annulations Calendly → Airtable (Scénario C étendu)
