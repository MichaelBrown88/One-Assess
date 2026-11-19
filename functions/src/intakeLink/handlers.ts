/**
 * Reusable per-org intake link: a client fills in the consultation questions on their phone,
 * which lands as a "new intake" the coach turns into a pre-filled assessment draft.
 * Handlers return typed results; index.ts maps failures to HttpsError.
 */
import { randomBytes } from 'crypto';
import { buildIntakeWrite, clientSlug, type ClientDoc, type IntakeConflict, type IntakeWrite, type OrgDoc } from '../intake/clientWrite';
import type { DraftLike, StandardIntake } from '../intake/mergeDraft';
import { LIMITS, normalizeName, sanitizeIntakeFields, STANDARD_INTAKE_KEYS, type IntakeFormData } from '../intake/standardFields';

export const PROVIDER = 'intake-link';
const TOKEN_BYTES = 16;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const INTAKE_ID_PATTERN = /^[A-Za-z0-9]{1,40}$/;
export const RATE = {
  perLinkIpPerHour: 5,
  perOrgPerDay: 100,
} as const;

export type Staff = { uid: string; orgId: string; isAdmin: boolean };
export type IntakeStatus = 'new' | 'converted' | 'dismissed';
export type IntakeDoc = {
  status: IntakeStatus;
  provider: string;
  clientName: string;
  email?: string;
  formData: IntakeFormData;
};
export type Candidate = { clientSlug: string; clientName: string };

export interface IntakeLinkStore {
  getStaff(uid: string): Promise<Staff | null>;
  getOrg(orgId: string): Promise<OrgDoc | null>;
  /** Writes org.intakeLink and the token lookup doc; deletes the old lookup when the token changes. */
  saveLink(orgId: string, previousToken: string | null, link: { token: string; enabled: boolean }): Promise<void>;
  resolveLink(token: string): Promise<{ orgId: string; enabled: boolean } | null>;
  /** False when the bucket is over its limit. */
  allow(key: string, maxRequests: number, windowSeconds: number): Promise<boolean>;
  addIntake(orgId: string, intake: IntakeDoc): Promise<string>;
  getIntake(orgId: string, intakeId: string): Promise<IntakeDoc | null>;
  findClientsByEmail(orgId: string, email: string): Promise<Array<Candidate & { coachUid?: string; status?: string }>>;
  setIntakeStatus(orgId: string, intakeId: string, status: 'dismissed'): Promise<void>;
  /** Transaction: re-check the intake is still new, read client + draft, apply `build`, mark the intake converted. */
  convert(orgId: string, intakeId: string, slug: string, convertedBy: string,
    build: (client: ClientDoc | null, draft: DraftLike, org: OrgDoc | null) => IntakeWrite,
  ): Promise<{ kind: 'conflict'; reason: IntakeConflict | 'already_handled' } | { kind: 'ok'; created: boolean }>;
}

export type Fail<R extends string> = { ok: false; reason: R };

export function newLinkToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function parseLinkToken(raw: unknown): string | null {
  return typeof raw === 'string' && TOKEN_PATTERN.test(raw) ? raw : null;
}

function linkOf(org: OrgDoc | null): { token: string; enabled: boolean } | null {
  const l = org?.intakeLink as { token?: unknown; enabled?: unknown } | undefined;
  return l && typeof l.token === 'string' ? { token: l.token, enabled: l.enabled === true } : null;
}

// ── Admin: switch on / off / regenerate ──────────────────────────────────

export async function manageIntakeLink(
  store: IntakeLinkStore,
  uid: string | undefined,
  action: unknown,
): Promise<{ ok: true; token: string; enabled: boolean } | Fail<'unauthenticated' | 'forbidden' | 'invalid_action'>> {
  if (!uid) return { ok: false, reason: 'unauthenticated' };
  const staff = await store.getStaff(uid);
  if (!staff?.isAdmin) return { ok: false, reason: 'forbidden' };
  if (action !== 'enable' && action !== 'disable' && action !== 'regenerate') return { ok: false, reason: 'invalid_action' };
  const current = linkOf(await store.getOrg(staff.orgId));
  const token = action === 'regenerate' || !current ? newLinkToken() : current.token;
  const enabled = action === 'disable' ? false : action === 'enable' ? true : current?.enabled ?? true;
  await store.saveLink(staff.orgId, current?.token ?? null, { token, enabled });
  return { ok: true, token, enabled };
}

// ── Public: load + submit ────────────────────────────────────────────────

export async function getIntakeLink(
  store: IntakeLinkStore,
  rawToken: unknown,
): Promise<{ ok: true; orgName: string; allowedKeys: readonly string[] } | Fail<'invalid' | 'disabled'>> {
  const token = parseLinkToken(rawToken);
  const link = token ? await store.resolveLink(token) : null;
  if (!link) return { ok: false, reason: 'invalid' };
  if (!link.enabled) return { ok: false, reason: 'disabled' };
  const org = await store.getOrg(link.orgId);
  return { ok: true, orgName: typeof org?.name === 'string' ? org.name : '', allowedKeys: STANDARD_INTAKE_KEYS };
}

export async function submitIntakeLink(
  store: IntakeLinkStore,
  input: { linkToken: unknown; fields: unknown; ip: string | undefined; now: Date },
): Promise<{ ok: true } | Fail<'invalid' | 'disabled' | 'rate_limited' | 'too_large' | 'missing_name' | 'missing_email'>> {
  const token = parseLinkToken(input.linkToken);
  const link = token ? await store.resolveLink(token) : null;
  if (!token || !link) return { ok: false, reason: 'invalid' };
  if (!link.enabled) return { ok: false, reason: 'disabled' };
  if (JSON.stringify(input.fields ?? null).length > LIMITS.bodyBytes) return { ok: false, reason: 'too_large' };

  const ip = (input.ip ?? 'unknown').replace(/^::ffff:/, '');
  const hourly = await store.allow(`intakeLink:${token}:${ip}`, RATE.perLinkIpPerHour, 60 * 60);
  const daily = hourly && (await store.allow(`intakeLinkOrg:${link.orgId}`, RATE.perOrgPerDay, 24 * 60 * 60));
  if (!hourly || !daily) return { ok: false, reason: 'rate_limited' };

  const formData = sanitizeIntakeFields(input.fields, input.now);
  if (!formData.fullName) return { ok: false, reason: 'missing_name' };
  if (!formData.email) return { ok: false, reason: 'missing_email' };
  await store.addIntake(link.orgId, {
    status: 'new',
    provider: PROVIDER,
    clientName: formData.fullName,
    email: formData.email,
    formData,
  });
  return { ok: true };
}

// ── Coach: turn an intake into an assessment draft ───────────────────────

export type ConvertChoice =
  | { useClient: string }
  | { createNew: true; clientName?: string }
  | { dismiss: true };

export type ConvertResult =
  | { ok: true; kind: 'converted'; clientSlug: string; created: boolean }
  | { ok: true; kind: 'dismissed' }
  | { ok: true; kind: 'choose'; candidates: Candidate[] }
  | Fail<'unauthenticated' | 'forbidden' | 'not_found' | 'already_handled' | 'invalid_choice' | 'other_coach_client' | IntakeConflict>;

function parseChoice(raw: unknown): ConvertChoice | null | 'invalid' {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') return 'invalid';
  const c = raw as Record<string, unknown>;
  if (c.dismiss === true) return { dismiss: true };
  if (typeof c.useClient === 'string' && /^[a-z0-9-]{1,100}$/.test(c.useClient)) return { useClient: c.useClient };
  if (c.createNew === true) {
    if (c.clientName === undefined) return { createNew: true };
    const name = normalizeName(c.clientName);
    return name ? { createNew: true, clientName: name } : 'invalid';
  }
  return 'invalid';
}

export function toStandardIntake(doc: IntakeDoc): StandardIntake {
  return { provider: PROVIDER, formData: doc.formData, healthNotes: [], consultationNotes: [], metrics: [] };
}

export async function convertIntake(
  store: IntakeLinkStore,
  input: { uid: string | undefined; intakeId: unknown; choice: unknown; now: Date },
): Promise<ConvertResult> {
  if (!input.uid) return { ok: false, reason: 'unauthenticated' };
  const staff = await store.getStaff(input.uid);
  if (!staff) return { ok: false, reason: 'forbidden' };
  const intakeId = typeof input.intakeId === 'string' && INTAKE_ID_PATTERN.test(input.intakeId) ? input.intakeId : null;
  const choice = parseChoice(input.choice);
  if (!intakeId || choice === 'invalid') return { ok: false, reason: 'invalid_choice' };

  const intake = await store.getIntake(staff.orgId, intakeId);
  if (!intake) return { ok: false, reason: 'not_found' };
  if (intake.status !== 'new') return { ok: false, reason: 'already_handled' };

  if (choice && 'dismiss' in choice) {
    await store.setIntakeStatus(staff.orgId, intakeId, 'dismissed');
    return { ok: true, kind: 'dismissed' };
  }

  // Regular coaches only see their own clients (Phase 3 data minimisation).
  const visible = (c: { coachUid?: string }) => staff.isAdmin || c.coachUid === staff.uid;
  const matches = intake.email
    ? (await store.findClientsByEmail(staff.orgId, intake.email)).filter((c) => c.status !== 'deleted' && c.status !== 'archived')
    : [];

  if (!choice) {
    if (matches.length === 0) return convertTo(store, staff, intakeId, intake, clientSlug(intake.clientName), intake.clientName, 'create', input.now);
    if (!matches.some(visible)) return { ok: false, reason: 'other_coach_client' };
    return { ok: true, kind: 'choose', candidates: matches.filter(visible).map(({ clientSlug: s, clientName }) => ({ clientSlug: s, clientName })) };
  }

  if ('useClient' in choice) {
    const target = matches.find((c) => c.clientSlug === choice.useClient);
    if (!target) return { ok: false, reason: 'client_mismatch' };
    if (!visible(target)) return { ok: false, reason: 'other_coach_client' };
    return convertTo(store, staff, intakeId, intake, target.clientSlug, target.clientName, 'chosen', input.now);
  }

  const name = choice.clientName ?? intake.clientName;
  return convertTo(store, staff, intakeId, intake, clientSlug(name), name, 'create', input.now);
}

async function convertTo(
  store: IntakeLinkStore, staff: Staff, intakeId: string, intake: IntakeDoc,
  slug: string, clientName: string, mode: 'chosen' | 'create', now: Date,
): Promise<ConvertResult> {
  const standard = toStandardIntake({ ...intake, formData: { ...intake.formData, fullName: clientName } });
  const result = await store.convert(staff.orgId, intakeId, slug, staff.uid, (client, draft, org) =>
    buildIntakeWrite({ intake: standard, clientName, orgId: staff.orgId, coachUid: staff.uid, nowIso: now.toISOString(), client, draft, org, mode }),
  );
  if (result.kind === 'conflict') return { ok: false, reason: result.reason };
  return { ok: true, kind: 'converted', clientSlug: slug, created: result.created };
}
