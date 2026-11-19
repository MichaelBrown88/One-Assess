# ONE ASSESS API: assessment intakes

Send what your CRM or booking system already knows about a client to ONE ASSESS. The coach
then opens an assessment that's already started and mostly just runs the physical tests.

One request creates the client (or finds them), pre-fills an assessment draft, and returns a
link that opens it.

- [Authentication](#authentication)
- [Create an intake](#create-an-intake)
- [Fields](#fields-version-1)
- [Matching and duplicates](#matching-and-duplicates)
- [Errors](#errors)
- [Limits](#limits)

## Authentication

An organisation admin creates a key in **ONE ASSESS → Organisation → Integrations → CRM API keys**.
The full key is shown once. It looks like:

```
oa_live_AbCdEf123456_<43 characters>
```

Send it on every request:

```
Authorization: Bearer oa_live_AbCdEf123456_…
```

A key belongs to one organisation and can only create or update that organisation's clients.
Keep it on your server: never put it in a web page or mobile app. Revoke a leaked key in the
same screen; it stops working immediately.

## Create an intake

```
POST https://one-assess.com/api/v1/assessment-intakes
Content-Type: application/json
Authorization: Bearer oa_live_…
Idempotency-Key: consult-8841          (optional, recommended)
```

```json
{
  "provider": "Example CRM",
  "externalClientId": "client-1042",
  "sourceUrl": "https://crm.example.com/clients/1042",
  "coachEmail": "coach@yourgym.com",
  "client": {
    "fullName": "Alex Example",
    "email": "alex@example.com",
    "phone": "+44 7700 900000"
  },
  "fields": {
    "version": 1,
    "dateOfBirth": "1990-04-12",
    "gender": "female",
    "heightCm": "168",
    "trainingHistory": "beginner",
    "recentActivity": "stopped-6-months",
    "activityLevel": "lightly-active",
    "clientGoals": ["weight-loss", "build-strength"],
    "trainingFrequency": "3",
    "medicationsFlag": "no"
  },
  "notes": {
    "health": [{ "label": "Injuries", "value": "Old right knee injury, no pain now" }],
    "consultation": [{ "label": "Why now", "value": "Wedding in June" }]
  },
  "measurements": [
    { "field": "weightKg", "label": "Self-reported weight", "value": "72", "unit": "kg", "date": "2026-11-19" }
  ]
}
```

| Top-level key | Required | Meaning |
|---|---|---|
| `provider` | yes | Your system's name, shown to the coach (1–40 letters, digits, spaces, `.` `_` `-`). |
| `client.fullName` | yes | 2–80 characters. |
| `client.email` / `client.phone` | no | Strongly recommended: email is used to find existing clients. |
| `externalClientId` | no | Your id for this client. Best way to avoid duplicates (see below). |
| `sourceUrl` | no | `https://` link back to the record in your system. |
| `coachEmail` | no | Assigns a new client to this coach. Default: the admin who created the key. |
| `fields` | no | Standard fields, below. Unknown fields or values are ignored. |
| `notes.health` | no | Health or injury notes. Added once to the PAR-Q notes the coach reviews. |
| `notes.consultation` | no | Other notes. Shown read-only to the coach during the assessment. |
| `measurements` | no | Reference values (for example self-reported weight). Never used as test results. |

Response `201 Created` (new client) or `200 OK` (existing client):

```json
{
  "clientId": "alex-example",
  "created": true,
  "deepLink": "https://one-assess.com/dashboard/clients/alex-example?resume=1"
}
```

Open `deepLink` for the coach (for example a "Start assessment" button). A signed-in coach
lands on the pre-filled assessment, on the first step that still needs input.

What ONE ASSESS never does with an intake: overwrite anything the coach has already entered,
change a completed assessment, or answer PAR-Q questions for the client.

### curl

```sh
curl https://one-assess.com/api/v1/assessment-intakes \
  -H "Authorization: Bearer $ONE_ASSESS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: consult-8841" \
  -d '{"provider":"Example CRM","externalClientId":"client-1042","client":{"fullName":"Alex Example","email":"alex@example.com"},"fields":{"version":1,"gender":"female","clientGoals":["weight-loss"]}}'
```

## Fields (version 1)

All values are strings unless shown. Send only what you know.

| Field | Values |
|---|---|
| `dateOfBirth` | `YYYY-MM-DD` |
| `gender` | `male`, `female` |
| `heightCm` | `100`–`250` |
| `trainingHistory` | `beginner` (< 1 year), `intermediate` (1–3 years), `advanced` (3+ years) |
| `recentActivity` | `currently-training`, `stopped-3-months`, `stopped-6-months` |
| `activityLevel` | `sedentary`, `lightly-active`, `moderately-active`, `very-active`, `extremely-active` |
| `sleepArchetype`, `nutritionHabits`, `hydrationHabits` | `excellent`, `good`, `fair`, `poor` |
| `stressLevel` | `very-low`, `low`, `moderate`, `high` |
| `stepsPerDay` | `0`–`60000` |
| `caffeineCupsPerDay` | `0`–`20` |
| `clientGoals` | array of `build-muscle`, `weight-loss`, `body-recomposition`, `build-strength`, `improve-fitness`, `general-health` |
| `trainingFrequency` | `0`, `1`, `2`, `3`, `4`, `5+` (sessions per week) |
| `goalDeadline` | `YYYY-MM-DD` |
| `medicationsFlag` | `yes`, `no` |
| `medicationsNotes` | free text, up to 2000 characters |
| `parq1`–`parq7`, `parq12`, `parq13` | `yes`, `no`: only if the client answered the PAR-Q themselves. The coach confirms them. |

`fields.version` is `1`. Future versions will add fields; version 1 requests keep working.

## Matching and duplicates

ONE ASSESS finds the client in this order:

1. The client you previously sent with the same `provider` and `externalClientId`.
2. The one active client with this `client.email`.
3. A client with the same name. If that client has a different email, the request is refused
   (`409 client_mismatch`) instead of mixing up two people.

Otherwise a new client is created. Sending the same client again updates the same draft, and
only fills fields that are still blank.

`Idempotency-Key` (1–100 of `A–Z a–z 0–9 . _ : -`): repeating a request with the same key
within 24 hours returns the first response without doing anything again, with the header
`Idempotent-Replayed: true`. Reusing a key with a different body returns `409 idempotency_key_reused`.
Use it when retrying after timeouts.

## Errors

Errors look like `{ "error": { "code": "client_mismatch", "message": "…" } }`.

| Status | `code` | What to do |
|---|---|---|
| 400 | `invalid_body`, `invalid_json`, `invalid_provider`, `invalid_client_name`, `invalid_client_email`, `invalid_external_client_id`, `invalid_source_url`, `invalid_fields`, `unsupported_fields_version`, `invalid_notes`, `invalid_measurements`, `invalid_coach_email`, `invalid_idempotency_key` | Fix the request. |
| 401 | `invalid_api_key` | Missing, unknown or revoked key. |
| 404 | `not_found` | Wrong URL. |
| 405 | `method_not_allowed` | Use POST. |
| 409 | `client_mismatch` | Same name, different client. Send `externalClientId` or the right email. |
| 409 | `ambiguous_client` | Several clients share this email. Send `externalClientId`. |
| 409 | `client_inactive` | The client is archived in ONE ASSESS. |
| 409 | `client_cap_reached` | The organisation's plan has no free client places. |
| 409 | `idempotency_key_reused` | Use a new key for a different request. |
| 413 | `too_large` | Body over 32 KB. |
| 422 | `coach_not_found` | `coachEmail` is not an active coach in the organisation. |
| 429 | `rate_limited` | Wait for `Retry-After` seconds. |
| 500 | `internal` | Retry later with the same `Idempotency-Key`. |

## Limits

- 60 requests per minute per key.
- Body up to 32 KB; up to 30 notes and 30 measurements; notes up to 2000 characters.
- Up to 10 active keys per organisation.

## Coming later

- Webhooks back to your system, for example `assessment.completed` with a score summary and report link.
- A Zapier / Make connector for gyms without a developer.

If your system can only send a link (email, WhatsApp, QR code), use the organisation's
**client intake link** instead: the client answers on their phone and it lands in the coach's
New intakes list.
