import { describe, expect, it, vi } from 'vitest';
import { clientSlug, handleOfsHandoff, type ClientDoc, type DraftWrite, type HandoffStore } from './handler';
import { signHandoff } from './signature';
import type { DraftLike } from './mergeDraft';

const SECRET = 'test-secret';
const ORG = 'org-test';
const NOW = 1_800_000_000_000;

const body = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  version: 1,
  contactId: 'contact-1',
  consultationId: 'consult-1',
  sourceUrl: 'https://example.test/admin/consultations/a1',
  coachEmail: 'coach@example.test',
  formData: { fullName: 'Test Client', email: 'client@example.test', gender: 'female' },
  healthNotes: [],
  consultationNotes: [],
  metrics: [],
  ...overrides,
});

let nonceCounter = 0;
function request(raw: string, opts: { method?: string; secret?: string; timestamp?: number; nonce?: string } = {}) {
  const timestamp = String(opts.timestamp ?? NOW);
  const nonce = opts.nonce ?? `nonce-${String(++nonceCounter).padStart(12, '0')}`;
  const headers: Record<string, string> = {
    'x-ofs-timestamp': timestamp,
    'x-ofs-nonce': nonce,
    'x-ofs-signature': signHandoff(opts.secret ?? SECRET, timestamp, nonce, raw),
  };
  return { method: opts.method ?? 'POST', header: (name: string) => headers[name.toLowerCase()], rawBody: Buffer.from(raw) };
}

function memoryStore(seed: { client?: ClientDoc; draft?: DraftLike; coaches?: Record<string, string> } = {}) {
  const nonces = new Set<string>();
  const state: { client: ClientDoc | null; draft: DraftWrite | DraftLike | null; writes: number } = {
    client: seed.client ?? null, draft: seed.draft ?? null, writes: 0,
  };
  const store: HandoffStore = {
    claimNonce: vi.fn(async (nonce: string) => {
      if (nonces.has(nonce)) return false;
      nonces.add(nonce);
      return true;
    }),
    findCoachUidByEmail: vi.fn(async (_org: string, email: string) => (seed.coaches ?? { 'coach@example.test': 'coach-uid' })[email] ?? null),
    applyHandoff: vi.fn(async (_org, _slug, build) => {
      const out = build(state.client, state.draft as DraftLike);
      if (out.kind === 'conflict') return out;
      if (out.newClient) state.client = out.newClient;
      state.draft = out.draft;
      state.writes += 1;
      return { kind: 'ok' as const, created: Boolean(out.newClient) };
    }),
  };
  return { store, state };
}

const run = (req: ReturnType<typeof request>, store: HandoffStore, extra: Partial<{ secret: string; orgId: string; nowMs: number }> = {}) =>
  handleOfsHandoff(req, { secret: SECRET, orgId: ORG, store, nowMs: NOW, ...extra });

describe('handleOfsHandoff', () => {
  it('creates the client and a draft on the first step that needs input', async () => {
    const { store, state } = memoryStore();
    const res = await run(request(body()), store);
    expect(res).toEqual({ status: 200, body: { ok: true, clientSlug: 'test-client', created: true } });
    expect(state.client).toMatchObject({ clientName: 'Test Client', assignedCoachUid: 'coach-uid', organizationId: ORG, status: 'active', email: 'client@example.test' });
    expect(state.draft).toMatchObject({ activePhaseId: 'P0', importKey: 'externalImport', externalImport: { provider: 'OFS', clientId: 'contact-1' } });
  });

  it('updates an existing client without recreating it', async () => {
    const { store, state } = memoryStore({ client: { clientName: 'Test Client', email: 'client@example.test', organizationId: ORG, status: 'active' } });
    const res = await run(request(body()), store);
    expect(res.body).toMatchObject({ ok: true, created: false });
    expect(state.client).toEqual({ clientName: 'Test Client', email: 'client@example.test', organizationId: ORG, status: 'active' });
  });

  it.each([
    ['a different person with the same name', { email: 'someone-else@example.test', status: 'active' }, 'client_mismatch'],
    ['an archived client', { status: 'archived' }, 'client_inactive'],
    ['a deleted client', { status: 'deleted' }, 'client_inactive'],
  ])('refuses %s and writes nothing', async (_label, client, reason) => {
    const { store, state } = memoryStore({ client });
    const res = await run(request(body()), store);
    expect(res).toEqual({ status: 409, body: { error: reason } });
    expect(state.writes).toBe(0);
  });

  it('refuses a coach email that is not in the org', async () => {
    const { store, state } = memoryStore({ coaches: {} });
    expect((await run(request(body()), store)).status).toBe(422);
    expect(state.writes).toBe(0);
  });

  it('refuses a replayed request', async () => {
    const { store } = memoryStore();
    const req = request(body(), { nonce: 'fixed-nonce-0000001' });
    expect((await run(req, store)).status).toBe(200);
    expect(await run(req, store)).toEqual({ status: 409, body: { error: 'replay' } });
  });

  it.each([
    ['wrong method', () => request(body(), { method: 'GET' }), 405],
    ['bad signature', () => request(body(), { secret: 'wrong' }), 401],
    ['stale timestamp', () => request(body(), { timestamp: NOW - 10 * 60 * 1000 }), 401],
    ['invalid payload', () => request(body({ version: 2 })), 400],
    ['invalid json', () => request('{nope'), 400],
  ])('rejects %s', async (_label, make, status) => {
    const { store, state } = memoryStore();
    expect((await run(make(), store)).status).toBe(status);
    expect(state.writes).toBe(0);
  });

  it('rejects oversized bodies before verifying', async () => {
    const { store } = memoryStore();
    const big = body({ consultationNotes: [{ label: 'a', value: 'x'.repeat(40_000) }] });
    expect((await run(request(big), store)).status).toBe(413);
  });

  it('is unavailable until secret and org are configured', async () => {
    const { store } = memoryStore();
    expect((await run(request(body()), store, { secret: '' })).status).toBe(503);
    expect((await run(request(body()), store, { orgId: '' })).status).toBe(503);
  });

  it('returns 500 without echoing the payload when the store fails', async () => {
    const { store } = memoryStore();
    store.applyHandoff = vi.fn(async () => { throw new Error('boom'); });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await run(request(body()), store)).toEqual({ status: 500, body: { error: 'internal' } });
    expect(JSON.stringify(spy.mock.calls)).not.toContain('client@example.test');
    spy.mockRestore();
  });
});

describe('clientSlug', () => {
  it('matches the app slug rule', () => {
    expect(clientSlug('  Test   Client ')).toBe('test-client');
  });
});
