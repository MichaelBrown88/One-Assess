/**
 * Decides what an intake writes to a client and its draft, shared by the intake link and the API.
 * Pure: the caller reads the docs inside a transaction and applies the result.
 */
import { mergeIntakeIntoDraft, type DraftLike, type MergedDraft, type StandardIntake } from './mergeDraft';

export type ClientDoc = Record<string, unknown>;
export type OrgDoc = Record<string, unknown>;

export type IntakeConflict = 'client_inactive' | 'client_mismatch' | 'client_cap_reached' | 'name_taken';
export type IntakeWrite =
  | { kind: 'conflict'; reason: IntakeConflict }
  | { kind: 'write'; newClient?: ClientDoc; draft: MergedDraft };

/** Free-tier fallback, same as effectiveClientCap() in firestore.rules. */
const DEFAULT_CLIENT_CAP = 2;

/** Same rule as generateClientSlug in src/services/clientProfiles.ts. */
export function clientSlug(name: string): string {
  const safe = (name || '').trim().replace(/\s+/g, ' ') || 'unnamed-client';
  return safe.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Mirrors effectiveClientCap()/statsClientCount() in firestore.rules: functions bypass rules,
 * so server-created clients must respect the plan's cap explicitly.
 */
export function clientCapReached(org: OrgDoc | null): boolean {
  const sub = (org?.subscription ?? {}) as { clientCap?: unknown; clientSeats?: unknown };
  const stats = (org?.stats ?? {}) as { clientCount?: unknown };
  const cap = Number(sub.clientCap ?? sub.clientSeats ?? DEFAULT_CLIENT_CAP);
  const count = Number(stats.clientCount ?? 0);
  return Number.isFinite(cap) && count >= cap;
}

function newClientRecord(intake: StandardIntake, name: string, orgId: string, coachUid: string): ClientDoc {
  const { email, phone, gender, dateOfBirth } = intake.formData;
  return {
    clientName: name,
    clientNameLower: name.toLowerCase(),
    organizationId: orgId,
    coachUid,
    assignedCoachUid: coachUid,
    status: 'active',
    assessmentCount: 0,
    ...Object.fromEntries(Object.entries({ email, phone, gender, dateOfBirth }).filter(([, v]) => typeof v === 'string' && v)),
  };
}

export function buildIntakeWrite(input: {
  intake: StandardIntake;
  /** Display name the client is (or will be) stored under. */
  clientName: string;
  orgId: string;
  coachUid: string;
  nowIso: string;
  client: ClientDoc | null;
  draft: DraftLike;
  org: OrgDoc | null;
  /** 'match': the caller matched by name/email and the person must be the same; 'chosen': a coach picked this client; 'create': must be a new client. */
  mode: 'match' | 'chosen' | 'create';
}): IntakeWrite {
  const { intake, client, mode } = input;
  if (client) {
    if (mode === 'create') return { kind: 'conflict', reason: 'name_taken' };
    if (client.status === 'deleted' || client.status === 'archived') return { kind: 'conflict', reason: 'client_inactive' };
    if (client.organizationId && client.organizationId !== input.orgId) return { kind: 'conflict', reason: 'client_mismatch' };
    const existingEmail = typeof client.email === 'string' ? client.email.trim().toLowerCase() : '';
    const email = intake.formData.email;
    if (mode === 'match' && existingEmail && email && existingEmail !== email) return { kind: 'conflict', reason: 'client_mismatch' };
    return { kind: 'write', draft: mergeIntakeIntoDraft(input.draft, intake, input.nowIso) };
  }
  if (mode === 'chosen') return { kind: 'conflict', reason: 'client_mismatch' };
  if (clientCapReached(input.org)) return { kind: 'conflict', reason: 'client_cap_reached' };
  return {
    kind: 'write',
    newClient: newClientRecord(intake, input.clientName, input.orgId, input.coachUid),
    draft: mergeIntakeIntoDraft(null, intake, input.nowIso),
  };
}
