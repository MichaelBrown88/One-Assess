# OFS hand-off endpoint (`ofsHandoff`)

Server-to-server endpoint that lets the studio CRM (OFS) start a ONE ASSESS assessment
draft for a client with the consultation answers already filled in. It is an HTTPS
`onRequest` function, not a callable, so App Check does not apply; authenticity comes
from an HMAC signature with a shared secret held only by the two servers.

## Request

`POST https://<region>-<project>.cloudfunctions.net/ofsHandoff` with `Content-Type: application/json`.

| Header | Value |
|---|---|
| `x-ofs-timestamp` | Unix time in milliseconds when the request was signed |
| `x-ofs-nonce` | Random, 16–64 chars of `[A-Za-z0-9_-]`, never reused |
| `x-ofs-signature` | Lowercase hex HMAC-SHA256 of `${timestamp}.${nonce}.${rawBody}` with the shared secret |

Requests more than 5 minutes from server time, or reusing a nonce, are refused.

Body (synthetic example):

```json
{
  "version": 1,
  "contactId": "00000000-0000-4000-8000-000000000001",
  "consultationId": "00000000-0000-4000-8000-000000000002",
  "sourceUrl": "https://crm.example/admin/consultations/abc",
  "coachEmail": "coach@example.test",
  "formData": {
    "fullName": "Test Client",
    "email": "client@example.test",
    "phone": "+000 0000 0000",
    "gender": "female",
    "heightCm": "170",
    "clientGoals": ["build-strength"],
    "trainingFrequency": "3",
    "activityLevel": "lightly-active",
    "trainingHistory": "beginner",
    "medicationsFlag": "yes",
    "medicationsNotes": "Example"
  },
  "healthNotes": [{ "label": "Injuries", "value": "Example" }],
  "consultationNotes": [{ "label": "Why now", "value": "Example" }],
  "metrics": [{ "field": "weightKg", "label": "Self-reported weight", "value": "70", "unit": "kg", "date": "2026-11-19" }]
}
```

Only the `formData` keys above are accepted; values outside ONE ASSESS's option lists are
dropped. At most 30 rows per list, notes up to 2000 characters, body up to 32 KB.

## Effect

In the configured organisation only, in one transaction:

- Finds the coach whose `organizations/{org}/coaches/*` doc has this `email` and is active.
- Creates `organizations/{org}/clients/{slug}` if missing (slug from `fullName`, same rule as the app).
- Fills blank fields of `clients/{slug}/assessmentDrafts/draft`; never overwrites coach input.
  Health notes are appended once to `parqNotes`; other notes go to `formData.consultationNotes`.
- Writes `externalImport` (`provider: "OFS"`, `clientId`, `consultationId`, `sourceUrl`,
  `importedAt`, `metrics`), or `externalImportOfs` when another provider's import is present.
- Sets `activePhaseId` to the first step still needing input when the draft has no position.
- Sets `hasAssessmentDraft` / `draftUpdatedAt` on the client. Sessions and `current/state` are untouched.

## Responses

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ ok: true, clientSlug, created }` | Open `/dashboard/clients/{clientSlug}?resume=1` |
| 400 | `{ error }` | Invalid JSON or payload |
| 401 | `{ error: "signature_*" }` | Missing, bad or stale signature |
| 405 | | Not POST |
| 409 | `{ error: "replay" \| "client_mismatch" \| "client_inactive" }` | Reused nonce; a different client already uses this name; client archived/deleted |
| 413 | | Body too large |
| 422 | `{ error: "coach_not_found" }` | Coach email is not an active coach in the org |
| 503 | `{ error: "not_configured" }` | Secret or org id not set |

## Configuration

- Secret `OFS_HANDOFF_SECRET` (Firebase Secret Manager): `firebase functions:secrets:set OFS_HANDOFF_SECRET`.
- `OFS_HANDOFF_ORG_ID` in `functions/.env`: the only organisation the endpoint may write to.
- Nonces live in `integrations/ofsHandoff/nonces/{nonce}` with `expiresAt`; add a Firestore
  TTL policy on that field to expire them.
