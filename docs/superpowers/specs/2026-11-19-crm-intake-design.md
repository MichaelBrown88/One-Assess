# Assessment intake: reusable link (P1) and CRM API (P2) — design

Status: approved 19 Nov 2026. Supersedes the OFS-only HMAC hand-off (`ofsHandoff` is removed;
its field validation and fill-blanks merge are reused). OFS-specific mapping lives in the
private OFS repo.

## Goal

Any gym, with any system, can get a client's consultation answers into ONE ASSESS so the
coach opens an assessment that is already started and mostly runs the physical tests.

- **P1, intake link:** one stable public link per org. The client answers on their phone.
- **P2, CRM API:** per-org API keys and one documented endpoint. OFS is the first caller and
  gets nothing a third-party CRM couldn't.
- **Later (designed, not built):** outbound webhooks and a Zapier/Make connector.

## Shared core: the standard intake

Both entry points produce one `StandardIntake` and go through one merge:

```ts
type StandardIntake = {
  provider: string;                 // 'intake-link' | CRM name, e.g. 'OFS'
  externalClientId?: string;
  sourceUrl?: string;
  formData: IntakeFormData;         // whitelisted ONE ASSESS fields, version 1
  healthNotes: NoteRow[];           // appended once to parqNotes
  consultationNotes: NoteRow[];     // read-only "From consultation" panel
  metrics: MetricRow[];             // reference values (e.g. self-reported weight)
};
```

Field list v1 (values must be ONE ASSESS option values; unknown values are dropped):
fullName, email, phone, dateOfBirth, gender, heightCm, trainingHistory, recentActivity,
activityLevel, sleepArchetype, stressLevel, nutritionHabits, hydrationHabits, stepsPerDay,
caffeineCupsPerDay, clientGoals[], trainingFrequency, goalDeadline, medicationsFlag,
medicationsNotes, parq1–parq7, parq12, parq13 (yes/no).

Merge (`mergeIntakeIntoDraft`): fill blanks only, coach input always wins; PAR-Q answers set
`parqSource: 'client'` and stay unconfirmed until the coach confirms; studio baseline plan;
`activePhaseId` = first step still needing input (P0 → P1 → first physical step P3) when the
draft has no position; `externalImport` = `{ provider, externalClientId, sourceUrl,
importedAt, metrics }`, or `externalImports.{provider}` when another provider already owns
`externalImport`.

## P1 — reusable intake link

- URL `https://one-assess.com/start/{linkToken}`; `linkToken` is 22 random URL-safe chars,
  so regenerating kills the old link. Optional `?name=` and `?email=` prefill only.
- Storage: `intake-links/{token}` = `{ organizationId, enabled, createdAt }`; org doc
  `intakeLink = { token, enabled, rotatedAt }`.
- Callables (all `enforceAppCheck: true`):
  - `manageIntakeLink({ action: 'enable'|'disable'|'regenerate' })` — org admin of own org.
  - `getIntakeLink({ linkToken })` → `{ ok, orgName, allowedKeys }` / `{ ok: false, reason }`.
  - `submitIntakeLink({ linkToken, fields })` — link on; allowed keys only; ≤ 32 KB, text
    ≤ 2000; rate limits 5/hour per IP+link and 100/day per org (existing `assertRateLimit`).
    Writes `organizations/{org}/intakes/{id}` `{ status: 'new', clientName, email, formData,
    provider: 'intake-link', submittedAt }`. Never touches clients.
  - `convertIntake({ intakeId, choice? })` — staff of the org. No choice and an active client
    with that email exists → `{ kind: 'choose', candidates }`. `{ useClient: slug }` or
    `{ createNew: true, clientName? }` → transaction: create client if new (name taken →
    `name_taken`), merge draft, mark intake `converted`. Returns `{ clientSlug }`; UI opens
    `/dashboard/clients/{slug}?resume=1`. `{ dismiss: true }` marks it `dismissed`.
- Client UI: the existing phone wizard (`PublicRemoteAssessment`) gains a link mode — load and
  submit come from the link callables, a PAR-Q screen and a medications screen are added, no
  posture or body-comp screens.
- Coach UI: Settings → Integrations card (on/off, copy link, QR, regenerate); dashboard
  "New intakes" list with Start assessment / Dismiss and the one-click match dialog.
- Rules: `intakes` readable by org staff, written only by functions; `intake-links` server-only.

## P2 — CRM API

- Keys: `oa_live_{keyId}_{secret}`, shown once. `apiKeys/{keyId}` = `{ orgId, hash (SHA-256
  of the secret), name, createdBy, createdAt, lastUsedAt, revokedAt }`. Created/revoked by
  org admins via callables `createApiKey` / `revokeApiKey`; listed in the Integrations card.
- `POST /api/v1/assessment-intakes` (hosting rewrite → `publicApiV1` `onRequest`).
  Headers `Authorization: Bearer …`, optional `Idempotency-Key`. Body `{ provider,
  externalClientId?, sourceUrl?, client: { fullName, email?, phone? }, fields: { version: 1,
  … }, notes?: { health?, consultation? }, measurements? }`.
- Auth: constant-time hash compare, not revoked; all reads/writes scoped to the key's org;
  60 requests/min per key.
- Matching: (1) `externalClients/{provider}:{externalClientId}` → slug; (2) exactly one active
  client with that email; (3) name slug — exists with a different email → 409. Otherwise create.
- Idempotency: `apiIdempotency/{keyId}:{Idempotency-Key}` stores the response for 24 h;
  repeats return it. The external-id mapping also prevents duplicate clients.
- Response `200 { clientId, created, deepLink }`; errors `{ error: { code, message } }` with
  400/401/403/409/413/429/500.
- Docs for third-party developers: `docs/api/assessment-intakes.md`.

## Later (not built)

- Webhooks: org admin registers an HTTPS URL; events `assessment.completed` (client id,
  external id, scores summary, report link) and `intake.created`; HMAC-signed with a per-org
  webhook secret; retries with backoff; delivery log.
- Zapier/Make: a connector using the same API key — action "Create assessment intake",
  trigger "Assessment completed" (webhook subscription).

## Safety

- Public link: App Check, rate limits, size limits, allowed keys, no client overwrite without
  a coach click. PAR-Q answers are marked client-reported and shown for coach confirmation.
- API: hashed keys, org scoping, rate limits, idempotency, payload whitelist.
- No PII in URLs beyond the optional name/email prefill. This repo is public: synthetic test
  data only.

## Testing

Pure modules (link token, field sanitising, merge, key hashing/parsing, matching, idempotency)
get unit tests; handlers get injected-store tests; UI gets render tests for the link wizard
mode, the Integrations card and the New intakes list.
