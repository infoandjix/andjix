# Sample payloads — pour configurer Make.com

Make.com a besoin d'un payload **réel** pour générer les variables disponibles dans le scénario. Voici exactement ce que le bot envoie. Coller dans le module "Custom Webhook" en cliquant "Run once" puis envoyer la requête pour que Make scanne la structure.

## Payload du bot IA → webhook Scénario A

```bash
curl -X POST "https://hook.eu2.make.com/REPLACE_WITH_REAL_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "bot",
    "name": "Marie Tremblay",
    "email": "marie.tremblay@example.ca",
    "phone": "+1 613 555 0142",
    "segment": "newcomer",
    "segmentLabel": "Nouveau arrivant",
    "need": "Arrivée du Cameroun en mars. Cherche logement et école pour 2 enfants.",
    "lang": "fr",
    "transcript": "Utilisateur: Bonjour, je viens d arriver à Ottawa...\n\nAndjix: Bienvenue ! Voici les démarches...",
    "createdAt": "2026-05-13T14:32:01.000Z"
  }'
```

### Variables Make générées
- `1.source` → "bot"
- `1.name` → "Marie Tremblay"
- `1.email` → "marie.tremblay@example.ca"
- `1.phone` → "+1 613 555 0142"
- `1.segment` → "newcomer"
- `1.segmentLabel` → "Nouveau arrivant"
- `1.need` → texte libre
- `1.lang` → "fr" ou "en"
- `1.transcript` → conversation complète
- `1.createdAt` → ISO timestamp

### Mapping segment → Airtable

Dans Make, ajouter un module **Tools > Switch** après le webhook pour mapper :

| `segment` (bot) | `Segment` (Airtable)   | `Service demandé` |
| --------------- | ---------------------- | ----------------- |
| `newcomer`      | Nouveau arrivant       | Accueil arrivant  |
| `self_employed` | Travailleur autonome   | Impôts            |
| `individual`    | Particulier            | Impôts            |
| `sme`           | PME                    | IA PME            |
| `unknown`       | Particulier            | Conseil admin     |

## Payloads Typeform

Typeform envoie ses propres champs (`form_response.answers[].field.ref` + `.text`/`.email`/etc.). Pas besoin de payload de test : connecter le module Typeform à un form qui a déjà au moins **une réponse de test** et Make découvre la structure automatiquement.

## Payload Calendly

Idem — utiliser un événement réel (réserver un RDV de test) pour peupler la structure dans Make. Champs critiques :
- `1.event.start_time` (ISO 8601)
- `1.event.end_time`
- `1.event.name` ("Consultation fiscale", etc.)
- `1.invitee.name`
- `1.invitee.email`
- `1.invitee.timezone`
