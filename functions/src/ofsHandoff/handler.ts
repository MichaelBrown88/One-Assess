/**
 * OFS → ONE ASSESS hand-off: signed POST that creates/updates a client and starts a draft.
 * All I/O goes through HandoffStore so the flow is unit-testable without Firestore.
 */
import { verifyHandoffSignature } from './signature';
import { parseHandoffPayload, type HandoffPayload } from './payload';
import { mergeHandoffIntoDraft, type DraftLike } from './mergeDraft';

export const MAX_BODY_BYTES = 32 * 1024;
/** Nonces only need to outlive the signature skew window; keep a day for audit. */
export const NONCE_TTL_MS = 24 * 60 * 60 * 1000;

export type ClientDoc = Record<string, unknown>;
export type DraftWrite = {
  formData: Record<string, unknown>;
  activePhaseId?: string;
  activePhaseIdx?: number;
  importKey: 'externalImport' | 'externalImportOfs';
  externalImport: Record<string, unknown>;
};
export type BuildResult = { kind: 'conflict'; reason: string } | { kind: 'write'; newClient?: ClientDoc; draft: DraftWrite };

export interface HandoffStore {
  /** Returns false when the nonce was already used. */
  claimNonce(nonce: string, expiresAt: Date): Promise<boolean>;
  findCoachUidByEmail(orgId: string, email: string): Promise<string | null>;
  /** Runs `build` inside one transaction on the client doc and its draft, then writes its result. */
  applyHandoff(
    orgId: string,
    slug: string,
    build: (client: ClientDoc | null, draft: DraftLike) => BuildResult,
  ): Promise<{ kind: 'conflict'; reason: string } | { kind: 'ok'; created: boolean }>;
}

export type HandoffRequest = { method: string; header(name: string): string | undefined; rawBody?: Buffer };
export type HandoffResponse = { status: number; body: Record<string, unknown> };

/** Same rule as generateClientSlug in src/services/clientProfiles.ts. */
export function clientSlug(name: string): string {
  const safe = (name || '').trim().replace(/\s+/g, ' ') || 'unnamed-client';
  return safe.toLowerCase().replace(/\s+/g, '-');
}

function newClientRecord(p: HandoffPayload, orgId: string, coachUid: string): ClientDoc {
  const name = p.formData.fullName;
  const contact = { email: p.formData.email, phone: p.formData.phone, gender: p.formData.gender };
  return {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    organizationId: orgId,
    coachUid,
    assignedCoachUid: coachUid,
    status: 'active',
    assessmentCount: 0,
    ...Object.fromEntries(Object.entries(contact).filter(([, v]) => typeof v === 'string' && v)),
  };
}

export function buildHandoffWrite(
  p: HandoffPayload,
  orgId: string,
  coachUid: string,
  nowIso: string,
  client: ClientDoc | null,
  draft: DraftLike,
): BuildResult {
  if (client) {
    if (client.status === 'deleted' || client.status === 'archived') return { kind: 'conflict', reason: 'client_inactive' };
    if (client.organizationId && client.organizationId !== orgId) return { kind: 'conflict', reason: 'client_mismatch' };
    const existingEmail = typeof client.email === 'string' ? client.email.trim().toLowerCase() : '';
    if (existingEmail && p.formData.email && existingEmail !== p.formData.email) return { kind: 'conflict', reason: 'client_mismatch' };
  }
  return {
    kind: 'write',
    ...(client ? {} : { newClient: newClientRecord(p, orgId, coachUid) }),
    draft: mergeHandoffIntoDraft(draft, p, nowIso),
  };
}

export async function handleOfsHandoff(
  req: HandoffRequest,
  deps: { secret: string; orgId: string; store: HandoffStore; nowMs: number },
): Promise<HandoffResponse> {
  if (req.method !== 'POST') return { status: 405, body: { error: 'method_not_allowed' } };
  if (!deps.secret || !deps.orgId) return { status: 503, body: { error: 'not_configured' } };
  const raw = req.rawBody;
  if (!raw || raw.length === 0) return { status: 400, body: { error: 'empty_body' } };
  if (raw.length > MAX_BODY_BYTES) return { status: 413, body: { error: 'too_large' } };
  const body = raw.toString('utf8');
  const nonce = req.header('x-ofs-nonce');
  const check = verifyHandoffSignature({
    secret: deps.secret,
    timestamp: req.header('x-ofs-timestamp'),
    nonce,
    signature: req.header('x-ofs-signature'),
    body,
    nowMs: deps.nowMs,
  });
  if (check !== 'ok' || !nonce) return { status: 401, body: { error: `signature_${check}` } };

  let json: unknown;
  try {
    json = JSON.parse(body);
  } catch {
    return { status: 400, body: { error: 'invalid_json' } };
  }
  const parsed = parseHandoffPayload(json);
  if (!parsed.ok) return { status: 400, body: { error: parsed.error } };
  const payload = parsed.value;

  try {
    if (!(await deps.store.claimNonce(nonce, new Date(deps.nowMs + NONCE_TTL_MS)))) {
      return { status: 409, body: { error: 'replay' } };
    }
    const coachUid = await deps.store.findCoachUidByEmail(deps.orgId, payload.coachEmail);
    if (!coachUid) return { status: 422, body: { error: 'coach_not_found' } };
    const slug = clientSlug(payload.formData.fullName);
    const nowIso = new Date(deps.nowMs).toISOString();
    const result = await deps.store.applyHandoff(deps.orgId, slug, (client, draft) =>
      buildHandoffWrite(payload, deps.orgId, coachUid, nowIso, client, draft),
    );
    if (result.kind === 'conflict') return { status: 409, body: { error: result.reason } };
    return { status: 200, body: { ok: true, clientSlug: slug, created: result.created } };
  } catch (error) {
    // Never log the payload: it carries client health information.
    console.error('[ofsHandoff] failed', error instanceof Error ? error.message : 'unknown error');
    return { status: 500, body: { error: 'internal' } };
  }
}
