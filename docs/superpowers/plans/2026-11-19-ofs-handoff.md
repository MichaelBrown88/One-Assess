# OFS Hand-off Endpoint Implementation Plan (ONE ASSESS side)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept a signed server-to-server hand-off from the studio CRM (OFS) and turn it into a started assessment draft that opens on the first step still needing input.

**Architecture:** A `onRequest` Cloud Function `ofsHandoff` verifies an HMAC signature, validates a whitelisted payload, finds the org coach by email, and in one Firestore transaction creates the client if missing and fill-blanks-merges an `assessmentDrafts/draft` with an `externalImport` record. Pure modules (signature, payload, merge) hold all logic and are unit-tested; the handler takes injected dependencies so it can be tested with an in-memory store. The app gains `?resume=1` on the client page and a read-only "From consultation" panel.

**Tech Stack:** Firebase Functions v2 (`onRequest`, `defineSecret`), firebase-admin Firestore, Node `crypto`, React + Vite, Vitest (root config runs `functions/src/**/*.test.ts` too).

Contract for the caller: `docs/ofs-handoff-endpoint.md`. The full design (with field mapping) is in the private OFS repo. This repo is public: synthetic fixtures only, no real names, no secrets.

---

## File structure

| File | Responsibility |
|---|---|
| `functions/src/ofsHandoff/signature.ts` | HMAC-SHA256 verify, timestamp skew check |
| `functions/src/ofsHandoff/payload.ts` | Payload type + strict parser (whitelist, enum checks, size limits) |
| `functions/src/ofsHandoff/mergeDraft.ts` | Pure fill-blanks merge, parqNotes append, first-incomplete phase, `externalImport` |
| `functions/src/ofsHandoff/handler.ts` | HTTP handling with injected deps (store, secret, orgId, clock) |
| `functions/src/ofsHandoff/firestoreStore.ts` | firebase-admin implementation of the store interface |
| `functions/src/ofsHandoff/*.test.ts` | Unit tests for each module |
| `functions/src/index.ts` | `export const ofsHandoff = onRequest(...)` |
| `src/types/assessmentForm.ts` | optional `consultationNotes` field |
| `src/components/assessment/ConsultationNotesPanel.tsx` | Read-only notes panel |
| `src/components/assessment/PhaseFormContent.tsx` | Render the panel |
| `src/hooks/useResumeFromUrl.ts` + test | `?resume=1` → `resumeAssessment` once |
| `src/pages/client/ClientDetailLayout.tsx` | Call `useResumeFromUrl` |
| `src/components/assessment/AssessmentGate.resume.test.tsx` | Render-level regression: Resume lands on the saved phase |
| `docs/ofs-handoff-endpoint.md` | Caller contract |

## Task 1: Resume regression test (no production code change)

Root-cause finding: a render of `FormProvider` + `AssessmentGate` after `prepareAssessmentResume` lands on the saved phase for P3/P4/P5/P2, including when org settings arrive after the first render. Production drafts saved after 16 Nov all store a real later phase except an imported draft that stored `P0` itself. The fix is therefore on the writer (Task 4 chooses the first incomplete phase), and this test pins the reader.

- [ ] Move `src/components/assessment/__repro__/resume.repro.test.tsx` to `src/components/assessment/AssessmentGate.resume.test.tsx`; replace `console.log` with assertions: heading text contains the phase title (`Metabolic Fitness`, `Movement Quality`, `Functional Strength`, `Body Composition`) and does not contain `Client Details`.
- [ ] Run `npx vitest run src/components/assessment/AssessmentGate.resume.test.tsx` → 4 passed.
- [ ] Commit `test: pin resume to the saved phase through the real gate render`.

## Task 2: Signature verification

```ts
// functions/src/ofsHandoff/signature.ts
import { createHmac, timingSafeEqual } from 'crypto';
export const MAX_SKEW_MS = 5 * 60 * 1000;
export type SignatureCheck = 'ok' | 'missing' | 'stale' | 'bad';
export function signHandoff(secret: string, timestamp: string, nonce: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${nonce}.${body}`).digest('hex');
}
export function verifyHandoffSignature(i: { secret: string; timestamp?: string; nonce?: string; signature?: string; body: string; nowMs: number }): SignatureCheck {
  if (!i.secret || !i.timestamp || !i.nonce || !i.signature) return 'missing';
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(i.nonce)) return 'bad';
  const ts = Number(i.timestamp);
  if (!Number.isFinite(ts) || Math.abs(i.nowMs - ts) > MAX_SKEW_MS) return 'stale';
  const expected = Buffer.from(signHandoff(i.secret, i.timestamp, i.nonce, i.body), 'hex');
  const given = Buffer.from(i.signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected) ? 'ok' : 'bad';
}
```

Tests (`signature.test.ts`): known vector `signHandoff('s','1','n'.repeat(16),'{}')` equals the value computed by Node in the test (and the same vector is asserted in OFS); tampered body → `bad`; wrong secret → `bad`; 6-minute-old timestamp → `stale`; missing header → `missing`; non-hex signature → `bad` (no throw).

- [ ] Write failing tests, implement, pass, commit `feat(functions): verify signed OFS hand-off requests`.

## Task 3: Payload parser

```ts
// functions/src/ofsHandoff/payload.ts
export type NoteRow = { label: string; value: string };
export type MetricRow = { field: string; label: string; value: string; unit: string; date: string };
export type HandoffFormData = Partial<Record<
  'fullName'|'email'|'phone'|'gender'|'heightCm'|'trainingFrequency'|'activityLevel'|'trainingHistory'|'medicationsFlag'|'medicationsNotes', string>> & { clientGoals?: string[] };
export interface HandoffPayload {
  version: 1; contactId: string; consultationId: string; sourceUrl: string; coachEmail: string;
  formData: HandoffFormData & { fullName: string };
  healthNotes: NoteRow[]; consultationNotes: NoteRow[]; metrics: MetricRow[];
}
export const ALLOWED = {
  gender: ['male','female'], trainingFrequency: ['0','1','2','3','4','5+'],
  activityLevel: ['sedentary','lightly-active','moderately-active','very-active','extremely-active'],
  trainingHistory: ['beginner','intermediate','advanced'], medicationsFlag: ['yes','no'],
  clientGoals: ['build-muscle','weight-loss','body-recomposition','build-strength','improve-fitness','general-health'],
} as const;
export function parseHandoffPayload(raw: unknown): { ok: true; value: HandoffPayload } | { ok: false; error: string };
```

Rules: object with `version === 1`; ids `^[A-Za-z0-9-]{1,64}$`; `sourceUrl` must start `https://`; `coachEmail` lower-cased and contains `@`; `fullName` 2–80 chars after whitespace collapse; strings ≤ 2000 chars (notes) / 200 chars (fields); unknown `formData` keys dropped; enum fields not in `ALLOWED` dropped (never stored); `heightCm` numeric 100–250; ≤ 30 rows per list; `email` lower-cased.

Tests: happy path; missing fullName → error; unknown key dropped; bad enum dropped; over-long note → error; non-https sourceUrl → error.

- [ ] Failing tests, implement, pass, commit `feat(functions): validate OFS hand-off payloads`.

## Task 4: Fill-blanks merge

```ts
// functions/src/ofsHandoff/mergeDraft.ts
export const STUDIO_BASELINE_PLAN = { templateId: 'full_holistic', includedPhaseIds: ['P0','P1','P3','P4','P5','P2','P7'] };
// Mirrors required fields of src/lib/phases/phaseP0.ts and phaseP1.ts (functions cannot import app code).
export const REQUIRED_BY_PHASE = [
  { id: 'P0', fields: ['fullName','dateOfBirth','gender','trainingHistory','recentActivity'] },
  { id: 'P1', fields: ['activityLevel'] },
] as const;
export const OFS_NOTES_MARKER = 'From consultation (OFS):';
export function isBlank(v: unknown): boolean;
export function firstIncompletePhase(formData: Record<string, unknown>): string; // 'P0' | 'P1' | 'P3'
export function mergeHandoffIntoDraft(existing: { formData?: Record<string, unknown>; activePhaseId?: string|null; activePhaseIdx?: number|null; externalImport?: unknown } | null, p: HandoffPayload, nowIso: string): {
  formData: Record<string, unknown>; activePhaseId?: string; activePhaseIdx?: number; externalImport: Record<string, unknown>;
};
```

Behaviour: copy each payload field only when the existing value `isBlank`; `consultationNotes` set only when blank; `parqNotes`: if `healthNotes` non-empty and existing `parqNotes` does not contain `OFS_NOTES_MARKER`, append `\n\n${marker}\n- label: value` lines (or set when blank); `assessmentPlan` = studio plan when blank; `assessmentIntakeMode` = `'studio'` when blank; position only when the existing draft has neither id nor index: `activePhaseId = firstIncompletePhase(merged)` and `activePhaseIdx = 0`; `externalImport = { provider: 'OFS', clientId: contactId, consultationId, sourceUrl, importedAt: nowIso, metrics }`.

Tests: new draft gets mapped fields + P0 (no DOB); coach-entered `gender` not overwritten; second hand-off does not duplicate the parq block; existing position kept; with DOB + recentActivity present → `P3`; arrays blank when empty.

- [ ] Failing tests, implement, pass, commit `feat(functions): merge OFS hand-offs into drafts without overwriting coach input`.

## Task 5: Handler with injected store

```ts
// functions/src/ofsHandoff/handler.ts
export interface HandoffStore {
  claimNonce(nonce: string, expiresAt: Date): Promise<boolean>; // false if already used
  findCoachUidByEmail(orgId: string, email: string): Promise<string | null>;
  applyHandoff(orgId: string, slug: string, coachUid: string, build: (client: Record<string, unknown> | null, draft: Record<string, unknown> | null) =>
    { kind: 'conflict'; reason: string } | { kind: 'write'; client?: Record<string, unknown>; draft: Record<string, unknown> }): Promise<{ kind: 'conflict'; reason: string } | { kind: 'ok'; created: boolean }>;
}
export async function handleOfsHandoff(req: { method: string; header(name: string): string | undefined; rawBody?: Buffer }, deps: { secret: string; orgId: string; store: HandoffStore; nowMs: number }): Promise<{ status: number; body: Record<string, unknown> }>;
export function clientSlug(name: string): string; // same rule as src/services/clientProfiles.ts generateClientSlug
```

Order: method → 405; no orgId/secret → 503; body > 32 KB → 413; signature (`missing`/`bad`/`stale` → 401); JSON parse/`parseHandoffPayload` → 400; `claimNonce` false → 409 `replay`; coach not found → 422 `coach_not_found`; `applyHandoff` build: client exists with `status` deleted/archived → conflict `client_inactive`; client email set and differs from payload email → conflict `client_mismatch`; else client = existing ? undefined : baseline record (`clientName, clientNameLower, organizationId, coachUid, assignedCoachUid, status:'active', assessmentCount:0, email, phone, gender`), draft = `mergeHandoffIntoDraft`; conflict → 409; ok → 200 `{ ok: true, clientSlug, created }`. Errors from the store → 500 `{ error: 'internal' }` (logged without payload).

Tests use an in-memory `HandoffStore`: each status above; created vs existing client; no write on conflict; nonce claimed even on later 422 (replay-safe).

`firestoreStore.ts`: nonce doc `integrations/ofsHandoff/nonces/{nonce}` via `create()` (ALREADY_EXISTS → false) with `expiresAt`; coach lookup `organizations/{org}/coaches` `where('email','==',email)` then status `active`; `applyHandoff` in `runTransaction`, also sets parent `hasAssessmentDraft: true, draftUpdatedAt`, and on create `createdAt: serverTimestamp()`; draft written with `updatedAt: serverTimestamp(), organizationId, clientName`.

- [ ] Failing tests, implement handler, implement store (no unit test; exercised in emulator check), commit `feat(functions): ofsHandoff endpoint`.

## Task 6: Wire the function

```ts
// functions/src/index.ts
import { defineSecret } from 'firebase-functions/params';
const OFS_HANDOFF_SECRET = defineSecret('OFS_HANDOFF_SECRET');
export const ofsHandoff = onRequest({ cors: false, secrets: [OFS_HANDOFF_SECRET], maxInstances: 5 }, async (req, res) => {
  const out = await handleOfsHandoff(req, { secret: OFS_HANDOFF_SECRET.value(), orgId: (process.env.OFS_HANDOFF_ORG_ID || '').trim(), store: firestoreHandoffStore(admin.firestore()), nowMs: Date.now() });
  res.status(out.status).json(out.body);
});
```

- [ ] `cd functions && npm run build` passes. Commit `feat(functions): export ofsHandoff`.

## Task 7: App — notes field, panel, `?resume=1`

- `FormData.consultationNotes?: { label: string; value: string }[]` (optional; not in `initialFormData`).
- `ConsultationNotesPanel({ notes })`: returns null when empty; a collapsible `<details>` "From consultation" with label/value rows, plain text only.
- Render it at the top of the capture column in `PhaseFormContent` when `formData.consultationNotes?.length`.
- `useResumeFromUrl(clientKey)`: reads `resume=1` from `useSearchParams`, removes it with `replace`, calls `resumeAssessment(clientKey)` once (ref guard). Test with a mocked `useResumeAssessment`: fires once, strips param, does nothing without the param.
- Use it in `ClientDetailLayout`.

- [ ] Tests first for the hook and panel, implement, `npm run typecheck`, commit `feat: open hand-off drafts from a resume link and show consultation notes`.

## Task 8: Contract doc + verification

- `docs/ofs-handoff-endpoint.md`: headers, signing string, payload JSON schema (synthetic example), status codes, config (`OFS_HANDOFF_SECRET` secret, `OFS_HANDOFF_ORG_ID` env), TTL policy note for `nonces.expiresAt`.
- Run `npx vitest run functions/src/ofsHandoff src/components/assessment src/hooks src/lib/assessment`, `npm run typecheck`, `npx eslint` on changed files, `cd functions && npm run build`.
- [ ] Commit `docs: OFS hand-off endpoint contract`.
