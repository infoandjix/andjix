# Scénario C — Confirmation de RDV (Calendly → Airtable)

**Déclencheur :** un nouveau RDV est créé dans Calendly (`invitee.created`).
**Résultat :** la fiche client correspondante dans Airtable est mise à jour avec la date du RDV. Si le client n'existe pas encore (RDV pris directement sans formulaire au préalable), on crée une fiche.

## Architecture (5 modules)

```
[Calendly: Watch Events] → [Airtable: Search Records by email]
                                  │
                                  ├─ Si trouvé → [Airtable: Update Record]
                                  │
                                  └─ Si vide   → [Airtable: Create Record]
                                                       │
                                                       └─→ [Gmail: notif André "nouveau RDV direct"]
```

## Étapes de construction

### 1. Module 1 — Calendly: Watch Events

Action : **Calendly > Watch Events**.
Connecter le compte Calendly d'André.
Event type : `Invitee Created`.

Make crée automatiquement un webhook Calendly via l'API (Calendly v2). Vérifier après config que le webhook apparaît dans `calendly.com/integrations/webhooks`.

### 2. Module 2 — Airtable: Search Records (par courriel)

Base : `Andjix Consulting`. Table : `Clients`.
Formula : `{Courriel} = '{{1.invitee.email}}'`.
Max records : `1`.

### 3. Router — 2 routes

#### Route A : "Client trouvé"
Filter : `Module 2.id` exists (non vide).

**Module 3A — Airtable: Update Record**
- Record ID : `{{Module 2.id}}`
- Mise à jour :
  ```
  Date RDV          ← {{1.event.start_time}}
  Statut            ← "RDV planifié"
  Dernière activité ← now
  Notes             ← prepend "RDV planifié le {{1.event.start_time}} via Calendly.\n"
  ```

#### Route B : "Pas trouvé — nouveau lead direct"
Filter : `Module 2.id` does not exist.

**Module 3B — Airtable: Create Record**
```
Nom               ← {{1.invitee.name}}
Courriel          ← {{1.invitee.email}}
Segment           ← "Particulier"     (par défaut, modifiable manuellement)
Statut            ← "RDV planifié"
Source            ← "Calendly direct"
Date RDV          ← {{1.event.start_time}}
Dernière activité ← now
Notes             ← "RDV pris directement via Calendly. Type : {{1.event.name}}"
```

**Module 4B — Gmail: notif André**
```
To:      info.andjix@gmail.com
Subject: 🗓️ RDV direct Calendly — {{1.invitee.name}}
Body:    Détails du RDV + lien vers la fiche Airtable créée
```

## Activer

`Scheduling: Immediately`. Make écoute en continu les événements Calendly.

## Test

1. Réserver un RDV de test sur Calendly avec un courriel **déjà présent** dans Airtable → la fiche doit se mettre à jour.
2. Réserver avec un courriel **inconnu** → une nouvelle fiche doit apparaître ET André reçoit la notif.

## Coût opérations

5 ops par RDV (1 Calendly trigger + 1 Search + 1-2 Airtable + 0-1 Gmail).
Pour 30 RDV/mois = 150 ops/mois.

## Note importante

Calendly envoie aussi un événement `invitee.canceled` si un client annule. **Le module v1 n'écoute QUE `invitee.created`** — ne pas activer `invitee.canceled` tant qu'on n'a pas décidé comment refléter les annulations dans Airtable (statut "RDV annulé" ? remettre `En cours` ?). C'est une amélioration phase 2.
