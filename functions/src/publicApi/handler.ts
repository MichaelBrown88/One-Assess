/**
 * ONE ASSESS public API v1. Currently one endpoint: POST /api/v1/assessment-intakes.
 * Contract: docs/api/assessment-intakes.md. All I/O through ApiStore for testability.
 */
import { createHash } from 'crypto';
import { buildIntakeWrite, clientSlug, type ClientDoc, type IntakeConflict, type IntakeWrite, type OrgDoc } from '../intake/clientWrite';
import type { DraftLike } from '../intake/mergeDraft';
import { LIMITS } from '../intake/standardFields';
import { parseApiKey, secretMatches } from './keys';
import { parseIntakeRequest } from './intakeRequest';

export const RATE_LIMIT_PER_MINUTE = 60;
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
const INTAKES_PATHS = new Set(['/api/v1/assessment-intakes', '/v1/assessment-intakes']);

export type ApiKeyRecord = { orgId: string; secretHash: string; createdBy: string; revokedAt?: unknown };
export type StoredResponse = { requestHash: string; status: number; body: Record<string, unknown> };
export type ApplyResult = { kind: 'conflict'; reason: IntakeConflict } | { kind: 'ok'; created: boolean };

export interface ApiStore {
  getKey(keyId: string): Promise<ApiKeyRecord | null>;
  touchKey(keyId: string): Promise<void>;
  allow(bucket: string, maxRequests: number, windowSeconds: number): Promise<boolean>;
  getStoredResponse(keyId: string, idempotencyKey: string): Promise<StoredResponse | null>;
  storeResponse(keyId: string, idempotencyKey: string, response: StoredResponse, expiresAt: Date): Promise<void>;
  findCoachUidByEmail(orgId: string, email: string): Promise<string | null>;
  findExternalClient(orgId: string, provider: string, externalClientId: string): Promise<string | null>;
  findClientsByEmail(orgId: string, email: string): Promise<Array<{ clientSlug: string; status?: string }>>;
  /** Transaction on the client + draft; also records provider:externalClientId → slug when given. */
  applyIntake(orgId: string, slug: string, externalLink: { provider: string; externalClientId: string } | null,
    build: (client: ClientDoc | null, draft: DraftLike, org: OrgDoc | null) => IntakeWrite): Promise<ApplyResult>;
}

export type ApiRequest = { method: string; path: string; header(name: string): string | undefined; rawBody?: Buffer };
export type ApiResponse = { status: number; body: Record<string, unknown>; headers?: Record<string, string> };

const error = (status: number, code: string, message: string, headers?: Record<string, string>): ApiResponse =>
  ({ status, body: { error: { code, message } }, ...(headers ? { headers } : {}) });

const CONFLICT_MESSAGES: Record<IntakeConflict | 'ambiguous_client', string> = {
  client_mismatch: 'A different client already uses this name. Send their email or externalClientId to match the right one.',
  client_inactive: 'This client is archived in ONE ASSESS.',
  client_cap_reached: 'This organisation has no free client places on its plan.',
  name_taken: 'A client with this name already exists.',
  ambiguous_client: 'More than one client has this email. Send externalClientId to pick one.',
};

export async function handlePublicApi(req: ApiRequest, deps: { store: ApiStore; nowMs: number; appHost: string }): Promise<ApiResponse> {
  if (!INTAKES_PATHS.has(req.path)) return error(404, 'not_found', 'Unknown endpoint.');
  if (req.method !== 'POST') return error(405, 'method_not_allowed', 'Use POST.', { Allow: 'POST' });

  const credentials = parseApiKey(req.header('authorization'));
  const key = credentials ? await deps.store.getKey(credentials.keyId) : null;
  if (!credentials || !key || key.revokedAt || !secretMatches(credentials.secret, key.secretHash)) {
    return error(401, 'invalid_api_key', 'Missing, unknown or revoked API key.');
  }
  if (!(await deps.store.allow(`api:${credentials.keyId}`, RATE_LIMIT_PER_MINUTE, 60))) {
    return error(429, 'rate_limited', `At most ${RATE_LIMIT_PER_MINUTE} requests per minute per key.`, { 'Retry-After': '60' });
  }
  void deps.store.touchKey(credentials.keyId).catch(() => undefined);

  const raw = req.rawBody;
  if (!raw || raw.length === 0) return error(400, 'invalid_body', 'Send a JSON body.');
  if (raw.length > LIMITS.bodyBytes) return error(413, 'too_large', `Body must be at most ${LIMITS.bodyBytes} bytes.`);

  const idempotencyKey = req.header('idempotency-key')?.trim();
  if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    return error(400, 'invalid_idempotency_key', 'Idempotency-Key must be 1–100 of A–Z a–z 0–9 . _ : -');
  }
  const requestHash = createHash('sha256').update(raw).digest('hex');
  if (idempotencyKey) {
    const previous = await deps.store.getStoredResponse(credentials.keyId, idempotencyKey);
    if (previous) {
      if (previous.requestHash !== requestHash) return error(409, 'idempotency_key_reused', 'This Idempotency-Key was used with a different body.');
      return { status: previous.status, body: previous.body, headers: { 'Idempotent-Replayed': 'true' } };
    }
  }

  let json: unknown;
  try {
    json = JSON.parse(raw.toString('utf8'));
  } catch {
    return error(400, 'invalid_json', 'Body is not valid JSON.');
  }
  const parsed = parseIntakeRequest(json, new Date(deps.nowMs));
  if (!parsed.ok) return error(400, parsed.code, parsed.message);
  const { intake, clientName, coachEmail } = parsed.value;
  const orgId = key.orgId;

  const coachUid = coachEmail ? await deps.store.findCoachUidByEmail(orgId, coachEmail) : key.createdBy;
  if (!coachUid) return error(422, 'coach_not_found', 'coachEmail is not an active coach in this organisation.');

  // Match: external id → single client with this email → name.
  let slug: string;
  let mode: 'chosen' | 'match';
  const external = intake.externalClientId
    ? await deps.store.findExternalClient(orgId, intake.provider, intake.externalClientId)
    : null;
  if (external) {
    slug = external;
    mode = 'chosen';
  } else {
    const email = intake.formData.email;
    const byEmail = email
      ? (await deps.store.findClientsByEmail(orgId, email)).filter((c) => c.status !== 'deleted' && c.status !== 'archived')
      : [];
    if (byEmail.length > 1) return finish(deps, credentials.keyId, idempotencyKey, requestHash, error(409, 'ambiguous_client', CONFLICT_MESSAGES.ambiguous_client));
    if (byEmail.length === 1) {
      slug = byEmail[0].clientSlug;
      mode = 'chosen';
    } else {
      slug = clientSlug(clientName);
      mode = 'match';
    }
  }

  const nowIso = new Date(deps.nowMs).toISOString();
  const link = intake.externalClientId ? { provider: intake.provider, externalClientId: intake.externalClientId } : null;
  const result = await deps.store.applyIntake(orgId, slug, link, (client, draft, org) =>
    buildIntakeWrite({ intake, clientName, orgId, coachUid, nowIso, client, draft, org, mode }));

  const response: ApiResponse = result.kind === 'conflict'
    ? error(409, result.reason, CONFLICT_MESSAGES[result.reason])
    : {
        status: result.created ? 201 : 200,
        body: {
          clientId: slug,
          created: result.created,
          deepLink: `${deps.appHost.replace(/\/+$/, '')}/dashboard/clients/${encodeURIComponent(slug)}?resume=1`,
        },
      };
  return finish(deps, credentials.keyId, idempotencyKey, requestHash, response);
}

async function finish(
  deps: { store: ApiStore; nowMs: number }, keyId: string, idempotencyKey: string | undefined, requestHash: string, response: ApiResponse,
): Promise<ApiResponse> {
  if (idempotencyKey) {
    await deps.store.storeResponse(keyId, idempotencyKey, { requestHash, status: response.status, body: response.body }, new Date(deps.nowMs + IDEMPOTENCY_TTL_MS));
  }
  return response;
}
