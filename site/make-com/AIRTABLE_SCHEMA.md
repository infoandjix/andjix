# Airtable — schéma des bases Andjix

Créer **un seul workspace Airtable** ("Andjix Consulting") avec trois bases. Les noms de champs ci-dessous sont **exacts** : Make.com pointe sur ces noms-là dans les scénarios A, B, C.

---

## Base 1 — `Clients` (CRM principal)

Vue par défaut : Grid. Ajouter aussi une vue Kanban groupée par `Statut`.

| Champ              | Type                                                            | Notes                                             |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------- |
| `Nom`              | Single line text                                                | Primary field                                     |
| `Courriel`         | Email                                                           |                                                   |
| `Téléphone`        | Phone number                                                    |                                                   |
| `Segment`          | Single select : `Particulier`, `Travailleur autonome`, `Nouveau arrivant`, `PME`, `Candidat placement` |  |
| `Service demandé` | Single select : `Impôts`, `Accueil arrivant`, `Placement`, `Conseil admin`, `IA PME` | |
| `Statut`           | Single select : `Nouveau`, `En cours`, `En attente client`, `RDV planifié`, `Complété`, `Perdu` | Default : `Nouveau` |
| `Source`           | Single select : `Bot IA`, `Typeform impôts`, `Typeform arrivant`, `Typeform placement`, `Calendly direct`, `Référence` | |
| `Date de création` | Created time                                                    | Auto                                              |
| `Dernière activité`| Date (with time)                                                | Mise à jour manuellement OU via Make Scénario C   |
| `Date RDV`         | Date (with time)                                                | Renseignée par Scénario C                         |
| `Langue`           | Single select : `FR`, `EN`                                      | Default : `FR`                                    |
| `Besoin / Notes`   | Long text                                                       | Résumé du dossier                                 |
| `Transcript bot`   | Long text                                                       | Conversation IA si lead vient du bot              |
| `Dossiers fiscaux`  | Link to another record → base "Dossiers fiscaux"               |                                                   |
| `Candidatures`     | Link to another record → base "Candidats placement"             |                                                   |

---

## Base 2 — `Dossiers fiscaux`

| Champ              | Type                                                            | Notes                                             |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------- |
| `ID dossier`       | Autonumber                                                      | Primary field                                     |
| `Client`           | Link to `Clients`                                                | 1 client peut avoir plusieurs dossiers           |
| `Année fiscale`    | Single select : `2023`, `2024`, `2025`                          |                                                   |
| `Type`             | Single select : `T1 particulier`, `T2125 autonome`, `T2 société` | |
| `Documents reçus`  | Checkbox                                                        |                                                   |
| `Statut`           | Single select : `À recevoir`, `Préparation`, `Révision client`, `Soumis ARC`, `Remboursé` | |
| `Date soumission`  | Date                                                             |                                                   |
| `Honoraires`       | Currency (CAD)                                                  |                                                   |
| `Notes`            | Long text                                                       |                                                   |

---

## Base 3 — `Candidats placement`

| Champ              | Type                                                            | Notes                                             |
| ------------------ | --------------------------------------------------------------- | ------------------------------------------------- |
| `Nom`              | Single line text                                                | Primary field                                     |
| `Courriel`         | Email                                                           |                                                   |
| `Téléphone`        | Phone                                                           |                                                   |
| `Poste cible`      | Single line text                                                |                                                   |
| `Statut`           | Single select : `Nouveau`, `Entrevue interne`, `Présenté client`, `Embauché`, `Refusé` | |
| `Entreprise cliente`| Link to `Clients` (filtré sur Segment = PME)                  |                                                   |
| `Expérience`       | Long text                                                       |                                                   |
| `Langues`          | Multiple select : `FR`, `EN`, `Autres`                          |                                                   |
| `Disponibilité`    | Date                                                             |                                                   |
| `Notes`            | Long text                                                       |                                                   |

---

## Ordre de création

1. Créer la base `Clients` en premier (les autres y font référence).
2. Récupérer les `Table ID` et `Field ID` depuis l'URL Airtable une fois la base créée (Make.com les demande).
3. Créer les vues Kanban après avoir saisi 2-3 enregistrements de test, sinon les colonnes Kanban sont vides.

## Personal Access Token

Make.com s'authentifie via un **Airtable personal access token** (PAT), pas une clé API (les API keys sont déprécées depuis 2024). Créer le PAT à `airtable.com/create/tokens` avec les scopes :
- `data.records:read`
- `data.records:write`
- `schema.bases:read`

Restreindre l'accès au workspace "Andjix Consulting" uniquement.
