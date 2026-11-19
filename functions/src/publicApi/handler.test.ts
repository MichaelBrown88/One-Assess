import { describe, expect, it } from 'vitest';
import { handlePublicApi, RATE_LIMIT_PER_MINUTE, type ApiStore, type StoredResponse } from './handler';
import { generateApiKey } from './keys';
import type { ClientDoc } from '../intake/clientWrite';
import type { DraftLike } from '../intake/mergeDraft';

const ORG = 'org-test';
const NOW = Date.parse('2026-11-19T10:00:00Z');
const APP = 'https://app.example.test';

function memory(seed: { clients?: Record<string, ClientDoc>; external?: Record<string, string>; revoked?: boolean; org?: Record<string, unknown> } = {}) {
  const key = generateApiKey();
  const state = {
    clients: { ...(seed.clients ?? {}) } as Record<string, ClientDoc>,
    drafts: {} as Record<string, unknown>,
    external: { ...(seed.external ?? {}) } as Record<string, string>,
    stored: {} as Record<string, StoredResponse>,
    counts: {} as Record<string, number>,
    writes: 0,
  };
  const store: ApiStore = {
    getKey: async (id) => (id === key.keyId ? { orgId: ORG, secretHash: key.secretHash, createdBy: 'admin-uid', ...(seed.revoked ? { revokedAt: 1 } : {}) } : null),
    touchKey: async () => undefined,
    allow: async (bucket, max) => { state.counts[bucket] = (state.counts[bucket] ?? 0) + 1; return state.counts[bucket] <= max; },
    getStoredResponse: async (id, k) => state.stored[`${id}:${k}`] ?? null,
    storeResponse: async (id, k, r) => { state.stored[`${id}:${k}`] = r; },
    findCoachUidByEmail: async (_o, email) => (email === 'coach@example.test' ? 'coach-uid' : null),
    findExternalClient: async (_o, provider, id) => state.external[`${provider}:${id}`] ?? null,
    findClientsByEmail: async (_o, email) => Object.entries(state.clients).filter(([, c]) => c.email === email).map(([s, c]) => ({ clientSlug: s, status: c.status as string })),
    applyIntake: async (_o, slug, link, build) => {
      const out = build(state.clients[slug] ?? null, (state.drafts[slug] ?? null) as DraftLike, seed.org ?? { subscription: { clientCap: 50 }, stats: { clientCount: 1 } });
      if (out.kind === 'conflict') return out;
      if (out.newClient) state.clients[slug] = out.newClient;
      state.drafts[slug] = out.draft;
      if (link) state.external[`${link.provider}:${link.externalClientId}`] = slug;
      state.writes += 1;
      return { kind: 'ok', created: Boolean(out.newClient) };
    },
  };
  return { store, state, key };
}

const body = (overrides: Record<string, unknown> = {}) => ({
  provider: 'Example CRM',
  externalClientId: 'crm-1',
  client: { fullName: 'Test Client', email: 'client@example.test' },
  fields: { version: 1, gender: 'female', trainingHistory: 'beginner' },
  notes: { consultation: [{ label: 'Why now', value: 'Example' }] },
  ...overrides,
});

function request(apiKey: string, payload: unknown = body(), opts: { path?: string; method?: string; idem?: string; raw?: string } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${apiKey}`, ...(opts.idem ? { 'idempotency-key': opts.idem } : {}) };
  return {
    method: opts.method ?? 'POST',
    path: opts.path ?? '/api/v1/assessment-intakes',
    header: (n: string) => headers[n.toLowerCase()],
    rawBody: Buffer.from(opts.raw ?? JSON.stringify(payload)),
  };
}
const call = (m: ReturnType<typeof memory>, req: ReturnType<typeof request>) => handlePublicApi(req, { store: m.store, nowMs: NOW, appHost: APP });

describe('POST /api/v1/assessment-intakes', () => {
  it('creates a client and draft and returns a deep link', async () => {
    const m = memory();
    const res = await call(m, request(m.key.plaintext));
    expect(res).toEqual({ status: 201, body: { clientId: 'test-client', created: true, deepLink: `${APP}/dashboard/clients/test-client?resume=1` } });
    expect(m.state.clients['test-client']).toMatchObject({ assignedCoachUid: 'admin-uid', email: 'client@example.test' });
    expect(m.state.drafts['test-client']).toMatchObject({ externalImport: { provider: 'Example CRM', externalClientId: 'crm-1' } });
    expect(m.state.external['Example CRM:crm-1']).toBe('test-client');
  });

  it('assigns the named coach', async () => {
    const m = memory();
    await call(m, request(m.key.plaintext, body({ coachEmail: 'coach@example.test' })));
    expect(m.state.clients['test-client'].assignedCoachUid).toBe('coach-uid');
    const missing = memory();
    expect((await call(missing, request(missing.key.plaintext, body({ coachEmail: 'nobody@example.test' })))).status).toBe(422);
  });

  it('matches by external id first, even after a rename', async () => {
    const m = memory({ clients: { 'old-name': { clientName: 'Old Name', status: 'active' } }, external: { 'Example CRM:crm-1': 'old-name' } });
    const res = await call(m, request(m.key.plaintext));
    expect(res.body).toMatchObject({ clientId: 'old-name', created: false });
    expect(m.state.clients['test-client']).toBeUndefined();
  });

  it('matches a single client by email, and refuses an ambiguous email', async () => {
    const one = memory({ clients: { 'jane-x': { clientName: 'Jane X', email: 'client@example.test', status: 'active' } } });
    expect((await call(one, request(one.key.plaintext, body({ externalClientId: undefined })))).body).toMatchObject({ clientId: 'jane-x', created: false });
    const two = memory({ clients: { a: { email: 'client@example.test', status: 'active' }, b: { email: 'client@example.test', status: 'active' } } });
    const res = await call(two, request(two.key.plaintext, body({ externalClientId: undefined })));
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ error: { code: 'ambiguous_client' } });
  });

  it('refuses a same-name client with a different email', async () => {
    const m = memory({ clients: { 'test-client': { clientName: 'Test Client', email: 'other@example.test', status: 'active' } } });
    const res = await call(m, request(m.key.plaintext, body({ externalClientId: undefined })));
    expect(res).toMatchObject({ status: 409, body: { error: { code: 'client_mismatch' } } });
    expect(m.state.writes).toBe(0);
  });

  it('replays the stored response for a repeated Idempotency-Key', async () => {
    const m = memory();
    const first = await call(m, request(m.key.plaintext, body(), { idem: 'req-1' }));
    const again = await call(m, request(m.key.plaintext, body(), { idem: 'req-1' }));
    expect(again).toEqual({ status: first.status, body: first.body, headers: { 'Idempotent-Replayed': 'true' } });
    expect(m.state.writes).toBe(1);
    const reused = await call(m, request(m.key.plaintext, body({ client: { fullName: 'Someone Else' } }), { idem: 'req-1' }));
    expect(reused).toMatchObject({ status: 409, body: { error: { code: 'idempotency_key_reused' } } });
  });

  it('does not duplicate a client sent twice without an Idempotency-Key', async () => {
    const m = memory();
    await call(m, request(m.key.plaintext));
    const second = await call(m, request(m.key.plaintext));
    expect(second.body).toMatchObject({ clientId: 'test-client', created: false });
    expect(Object.keys(m.state.clients)).toEqual(['test-client']);
  });

  it('respects the plan client cap', async () => {
    const m = memory({ org: { subscription: { clientCap: 1 }, stats: { clientCount: 1 } } });
    expect((await call(m, request(m.key.plaintext))).body).toMatchObject({ error: { code: 'client_cap_reached' } });
  });

  it.each([
    ['unknown path', (k: string) => request(k, body(), { path: '/api/v1/clients' }), 404, 'not_found'],
    ['wrong method', (k: string) => request(k, body(), { method: 'GET' }), 405, 'method_not_allowed'],
    ['bad key', () => request(`oa_live_AAAAAAAAAAAA_${'b'.repeat(43)}`), 401, 'invalid_api_key'],
    ['no key', () => ({ ...request('x'), header: () => undefined }), 401, 'invalid_api_key'],
    ['bad json', (k: string) => request(k, null, { raw: '{nope' }), 400, 'invalid_json'],
    ['invalid body', (k: string) => request(k, { provider: '' }), 400, 'invalid_provider'],
    ['huge body', (k: string) => request(k, body({ notes: { consultation: [{ label: 'a', value: 'x'.repeat(40_000) }] } })), 413, 'too_large'],
    ['bad idempotency key', (k: string) => request(k, body(), { idem: 'has spaces' }), 400, 'invalid_idempotency_key'],
  ])('rejects %s', async (_label, make, status, code) => {
    const m = memory();
    const res = await call(m, make(m.key.plaintext));
    expect(res.status).toBe(status);
    expect(res.body).toMatchObject({ error: { code } });
    expect(m.state.writes).toBe(0);
  });

  it('rejects revoked keys', async () => {
    const m = memory({ revoked: true });
    expect((await call(m, request(m.key.plaintext))).status).toBe(401);
  });

  it('rate-limits each key', async () => {
    const m = memory();
    for (let i = 0; i < RATE_LIMIT_PER_MINUTE; i += 1) await call(m, request(m.key.plaintext));
    const res = await call(m, request(m.key.plaintext));
    expect(res).toMatchObject({ status: 429, headers: { 'Retry-After': '60' } });
  });
});
