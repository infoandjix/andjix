# Scénario A — Nouveau client

**Déclencheur :** un formulaire Typeform est soumis OU le bot IA capture un lead.
**Résultat :** une fiche apparaît dans Airtable, le client reçoit un courriel de confirmation, André reçoit une notification.

## Architecture (4 modules, 2 routes)

```
                        ┌──────────────────────────────┐
[Typeform: Impôts]   ─→ │                              │
[Typeform: Arrivant] ─→ │  Router (sépare les sources) │ ─→ [Airtable: Create Record "Clients"]
[Typeform: Placement]─→ │                              │       │
[Webhook bot IA]     ─→ │                              │       ├─→ [Gmail: Send Email au client]
                        └──────────────────────────────┘       └─→ [Gmail: Send Email à André]
```

Make.com gratuit = 1 000 opérations/mois. Chaque exécution complète = 4 opérations. Donc plafond ≈ 250 nouveaux clients/mois avant de payer.

## Étapes de construction

### 1. Module 1 — Triggers (4 sources)

Au lieu de 4 scénarios séparés, on utilise **4 modules Webhook** en parallèle dans le même scénario, fusionnés par un Router :

- **Typeform watch — Impôts** : connect Typeform, choisir le form `Impôts`
- **Typeform watch — Arrivant** : choisir le form `Nouveau arrivant`
- **Typeform watch — Placement** : choisir le form `Placement de personnel`
- **Custom Webhook — Bot IA** : créer un webhook custom, copier l'URL générée

> Note Make : Typeform offre un connecteur natif, donc pas besoin de webhook manuel pour Typeform. Pour le bot, on utilise le module **Webhooks > Custom Webhook** car le bot Andjix poste un JSON arbitraire.

**Webhook URL bot IA** : à copier depuis le module "Custom webhook" → la coller dans Vercel comme variable `MAKE_LEAD_WEBHOOK_URL` sur le projet `andjix-ai`.

### 2. Module 2 — Router

Crée 4 routes, une par source. Filtre chaque route par la variable correspondante (`source = bot` pour la route webhook, choix de form pour Typeform).

Sur chaque route, on **normalise** les champs vers le format Airtable avant l'écriture. Utiliser un module **Tools > Set multiple variables** avec ces variables (noms identiques sur les 4 routes) :

| Variable Make    | Typeform Impôts          | Typeform Arrivant         | Typeform Placement       | Bot IA                  |
| ---------------- | ------------------------ | ------------------------- | ------------------------ | ----------------------- |
| `clientName`     | Réponse `Nom`            | Réponse `Nom`             | Réponse `Nom`            | `name`                  |
| `clientEmail`    | Réponse `Courriel`       | Réponse `Courriel`        | Réponse `Courriel`       | `email`                 |
| `clientPhone`    | Réponse `Téléphone`      | Réponse `Téléphone`       | Réponse `Téléphone`      | `phone`                 |
| `clientSegment`  | "Particulier" (statique) | "Nouveau arrivant"        | "Candidat placement"     | `segmentLabel`          |
| `clientService`  | "Impôts"                 | "Accueil arrivant"        | "Placement"              | (calculé selon segment) |
| `clientSource`   | "Typeform impôts"        | "Typeform arrivant"       | "Typeform placement"     | "Bot IA"                |
| `clientLang`     | `FR` ou réponse langue   | `FR` ou réponse langue    | `FR` ou réponse langue   | `lang` mappé vers FR/EN |
| `clientNeed`     | Concat des réponses libres | Concat des réponses libres | Concat des réponses libres | `need`                |
| `clientTranscript` | (vide)                 | (vide)                    | (vide)                   | `transcript`            |

### 3. Module 3 — Airtable: Create Record

Action : **Airtable > Create a Record**.
Base : `Andjix Consulting`. Table : `Clients`.

Mapping des champs :
```
Nom              ← {{clientName}}
Courriel         ← {{clientEmail}}
Téléphone        ← {{clientPhone}}
Segment          ← {{clientSegment}}
Service demandé  ← {{clientService}}
Statut           ← "Nouveau"
Source           ← {{clientSource}}
Langue           ← {{clientLang}}
Besoin / Notes   ← {{clientNeed}}
Transcript bot   ← {{clientTranscript}}
Dernière activité ← now (utiliser la fonction `now`)
```

> Le champ `Date de création` est rempli automatiquement par Airtable (type Created time).

### 4. Module 4a — Gmail: Send Email au client (confirmation)

Action : **Gmail > Send an Email**.
Connecter le compte `info@andjix.ca`.

```
To:      {{clientEmail}}
Subject: Andjix Consulting — votre demande est bien reçue
Body type: HTML

<p>Bonjour {{clientName}},</p>
<p>Merci d'avoir pris contact avec Andjix Consulting. Nous avons bien reçu votre
demande concernant <strong>{{clientService}}</strong>.</p>
<p>Un membre de notre équipe vous répondra sous 24h ouvrables. Pour accélérer,
vous pouvez aussi <a href="https://calendly.com/andjix-consulting/consultation">
réserver un appel de découverte</a>.</p>
<p>Cordialement,<br>L'équipe Andjix</p>
```

Pour la version EN, ajouter un **Filter** sur cette route pour `{{clientLang}} = "FR"`, puis dupliquer la route pour `EN` avec le corps traduit.

### 4. Module 4b — Gmail: Send Email à André (notification interne)

Action : **Gmail > Send an Email**.

```
To:      info.andjix@gmail.com
Subject: 🔔 Nouveau lead Andjix — {{clientName}} ({{clientSegment}})
Body:    (texte simple, avec tous les champs + lien direct vers la fiche Airtable)
```

> WhatsApp natif n'est plus disponible sur Make gratuit (passé à un module premium). Rester sur Gmail pour la notif interne, ou passer au plan payant si André veut WhatsApp.

## Activer

Passer le scénario en mode **Scheduling: Immediately** (réagit à chaque webhook).

## Test

1. Soumettre une réponse de test sur chaque Typeform.
2. POST manuel sur le webhook bot avec curl (voir `WEBHOOK_PAYLOADS.md`).
3. Vérifier la fiche Airtable créée + les 2 courriels.
