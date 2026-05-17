# Scénario B — Rappel de dossier (relance 7 jours)

**Déclencheur :** chaque lundi à 9h (Ottawa, America/Toronto).
**Résultat :** chaque client dont `Dernière activité` date de plus de 7 jours ET dont `Statut` ∉ {`Complété`, `Perdu`} reçoit un courriel de relance.

## Architecture (3 modules)

```
[Schedule: lundi 9h] → [Airtable: Search Records (filtre)] → [Gmail: Send Email] → [Airtable: Update Record]
```

## Étapes de construction

### 1. Module 1 — Schedule

Type : **Scheduling > Run on a schedule**.
Configurer :
- Run scenario : `Days of the week`
- Days : `Monday`
- Time : `09:00`
- Timezone : `America/Toronto`

### 2. Module 2 — Airtable: Search Records

Base : `Andjix Consulting`. Table : `Clients`.

Utiliser le champ **Formula** (option avancée d'Airtable Search) :

```
AND(
  IS_BEFORE({Dernière activité}, DATEADD(NOW(), -7, 'days')),
  NOT(OR({Statut} = 'Complété', {Statut} = 'Perdu')),
  {Courriel} != ''
)
```

> Si la formule échoue à l'aperçu, vérifier que les noms de champs entre `{}` correspondent **exactement** (accents inclus).

Max records : `100` (le plan gratuit Make a un quota d'opérations, on évite de balayer toute la base).

### 3. Module 3 — Gmail: Send Email (dans la boucle Airtable)

Make itère automatiquement sur les enregistrements retournés. Configurer :

```
To:      {{Courriel}}
Subject: Andjix Consulting — où en sommes-nous sur votre dossier ?
Body:

Bonjour {{Nom}},

Nous voulions reprendre contact concernant votre demande pour
{{Service demandé}}. Cela fait quelques jours sans nouvelles, donc nous
voulions nous assurer que rien ne bloque de votre côté.

Si vous avez encore besoin de nous, répondez simplement à ce courriel
ou réservez un appel : https://calendly.com/andjix-consulting/consultation

Si votre situation a évolué et que vous n'avez plus besoin de notre
accompagnement, faites-le nous savoir pour que nous puissions fermer
le dossier proprement.

Cordialement,
L'équipe Andjix
```

Adapter en EN si `{{Langue}} = "EN"` (ajouter un Router avec 2 routes filtrées par langue).

### 4. Module 4 — Airtable: Update Record (marquer la relance)

Action : **Airtable > Update a Record**.
Record ID : `{{Module 2.id}}` (l'ID de l'enregistrement courant).

Mise à jour :
```
Dernière activité ← now
Notes ← prepend "Relance auto envoyée le {{now}}.\n" devant la valeur existante
```

> ⚠️ Mettre à jour `Dernière activité` empêche les boucles de relance hebdomadaires sur le même client. La relance se déclenche **une seule fois** par cycle d'inactivité.

## Test

Avant d'activer :
1. Modifier `Dernière activité` d'un client de test à `il y a 10 jours`.
2. Cliquer "Run once" sur le scénario.
3. Vérifier que ce client reçoit le courriel ET que `Dernière activité` passe à aujourd'hui.

## Activer

Passer en `Scheduling: As configured`. Le scénario tournera chaque lundi 9h.

## Coût opérations

- 1 module Schedule (1 op)
- 1 search (1 op)
- N clients retournés × 2 (Gmail + Update) = 2N ops

Pour 20 relances/semaine = 41 ops/semaine = ~180 ops/mois.
