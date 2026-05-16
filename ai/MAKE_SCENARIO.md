# Make.com scenario for Andjix (Webhook → Airtable + Email)

Two scenarios to build, one for leads (chat form submissions) and one for bookings (Calendly events). Both follow the Nina pattern from `~/n8n` reference memory.

## Scenario A: Leads → Airtable

**Trigger:** Webhooks → Custom webhook
- Copy the webhook URL Make generates
- Set it in Vercel as `MAKE_LEAD_WEBHOOK_URL` for the `andjix-ai` project

**Payload shape (already sent by `src/app/api/lead/route.ts:104-119`):**
```json
{
  "source": "bot",
  "name": "string",
  "email": "string",
  "phone": "string | null",
  "segment": "newcomer | self_employed | individual | sme | unknown",
  "segmentLabel": "Nouveau arrivant | ...",
  "need": "string | null",
  "lang": "fr | en",
  "transcript": "string | null",
  "createdAt": "ISO datetime"
}
```

**Modules to add in order:**
1. **Airtable → Create a record** in your Andjix base, table `Leads`
2. **Gmail → Send an email** (or stay on Resend if you prefer one mailer): internal notification to `info.andjix@gmail.com`
3. **Gmail → Send an email**: confirmation email to `{{email}}` thanking them in their language

## Scenario B: Bookings → Airtable

**Trigger:** Webhooks → Custom webhook
- Set the resulting URL in Vercel as `MAKE_BOOKING_WEBHOOK_URL`

**Payload shape (sent by `src/app/api/calendly/route.ts`):**
```json
{
  "source": "calendly",
  "eventType": "invitee.created | invitee.canceled",
  "name": "string",
  "email": "string",
  "startTime": "ISO datetime",
  "endTime": "ISO datetime",
  "eventName": "Consultation Andjix (30 min)",
  "cancelUrl": "string",
  "rescheduleUrl": "string",
  "status": "active | canceled",
  "answers": [{ "question": "string", "answer": "string" }],
  "receivedAt": "ISO datetime"
}
```

**Modules:**
1. **Router** based on `eventType`
   - `invitee.created` → Airtable Create record in `Bookings` table
   - `invitee.canceled` → Airtable Update record (search by `calendlyUri` or email + startTime), set status = "Canceled"
2. Optional: notify André on Telegram or by email when a booking is confirmed

## Airtable base structure

Create **one base** called `Andjix CRM` with two tables to start.

### Table: `Leads`

> **YOUR CALL (Emile + André together):** Define the field list. Below is a starter set, mark anything you don't need with `~~strikethrough~~`, add anything missing.

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | Primary |
| Email | Email | |
| Phone | Phone | |
| Segment | Single select | Options: Newcomer, Self-employed, Individual, SME, Unknown |
| Need | Long text | What the person wrote in the form |
| Lang | Single select | FR, EN |
| Transcript | Long text | Full conversation, useful for triage |
| Status | Single select | New, Contacted, Booked, Won, Lost (André's pipeline) |
| Created | Date | From `createdAt` |
| Owner | Single select | If André adds team members later |
| Notes | Long text | André's internal notes |

### Table: `Bookings`

| Field | Type | Notes |
|---|---|---|
| Name | Single line text | Primary |
| Email | Email | Used to link to Leads table |
| Start | Date with time | From `startTime` |
| Event | Single line text | From `eventName` |
| Status | Single select | Active, Canceled |
| Calendly URI | URL | From `calendlyUri`, used for lookup on cancel |
| Reschedule URL | URL | |
| Linked lead | Link to another record → Leads | Match by email |

## Where Emile decides

When you sit down with André, walk him through these questions:

1. **Pipeline stages** — what does his sales funnel actually look like? (New → Contacted → Booked → Won/Lost is generic, his might be more specific to Andjix Consulting, e.g. Démarches en cours, Facturé, Récurrent.)
2. **Segments** — keep the bot's 5 or expand? He may want `Étudiant`, `Réfugié`, `Personne âgée`, etc.
3. **Notes vs new fields** — does he want structured fields for things like "type de démarche" (T1, T2125, immigration, etc.) or is freeform Notes enough?
4. **Owner field** — does he plan to bring on a partner who needs assignments?

The Airtable schema is **his CRM**. Get it right with him in 30 min and he'll use Airtable as his workspace for the year. Get it wrong and he keeps pinging you to add fields.

## Smoke test after wiring

1. From `https://ai.andjix.ca`, submit a test lead with email `test@andjix.ca`
2. Within 30 sec: see it in Airtable `Leads`, in Make execution log, in admin dashboard `Prospects` tab, in `info.andjix@gmail.com` inbox
3. Book a fake Calendly slot at the same email
4. Within 30 sec: see it in `Bookings`, linked to the test lead

If any step fails, check Make's execution history first (Make → Scenario → History). Most failures are field name mismatches between webhook payload and Airtable columns.
