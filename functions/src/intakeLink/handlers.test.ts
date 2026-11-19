import { describe, expect, it } from 'vitest';
import {
  convertIntake, getIntakeLink, manageIntakeLink, newLinkToken, parseLinkToken, RATE, submitIntakeLink,
  type IntakeDoc, type IntakeLinkStore, type Staff,
} from './handlers';
import type { ClientDoc } from '../intake/clientWrite';
import type { DraftLike } from '../intake/mergeDraft';

const ORG = 'org-test';
const NOW = new Date('2026-11-19T10:00:00Z');
const TOKEN = 'A'.repeat(22);

type Seed = {
  staff?: Record<string, Staff>;
  org?: Record<string, unknown>;
  links?: Record<string, { orgId: string; enabled: boolean }>;
  clients?: Record<string, ClientDoc>;
  intakes?: Record<string, IntakeDoc>;
};

function memoryStore(seed: Seed = {}) {
  const state = {
    staff: seed.staff ?? {
      admin: { uid: 'admin', orgId: ORG, isAdmin: true },
      coach: { uid: 'coach', orgId: ORG, isAdmin: false },
    },
    org: seed.org ?? { name: 'Test Gym', subscription: { clientCap: 50 }, stats: { clientCount: 1 } },
    links: { ...(seed.links ?? { [TOKEN]: { orgId: ORG, enabled: true } }) },
    clients: { ...(seed.clients ?? {}) } as Record<string, ClientDoc>,
    drafts: {} as Record<string, unknown>,
    intakes: { ...(seed.intakes ?? {}) } as Record<string, IntakeDoc & { clientSlug?: string }>,
    counters: {} as Record<string, number>,
  };
  const store: IntakeLinkStore = {
    getStaff: async (uid) => state.staff[uid] ?? null,
    getOrg: async () => state.org,
    saveLink: async (orgId, previous, link) => {
      if (previous && previous !== link.token) delete state.links[previous];
      state.links[link.token] = { orgId, enabled: link.enabled };
      state.org = { ...state.org, intakeLink: link };
    },
    resolveLink: async (token) => state.links[token] ?? null,
    allow: async (key, max) => {
      state.counters[key] = (state.counters[key] ?? 0) + 1;
      return state.counters[key] <= max;
    },
    addIntake: async (_org, intake) => {
      const id = `i${Object.keys(state.intakes).length + 1}`;
      state.intakes[id] = intake;
      return id;
    },
    getIntake: async (_org, id) => state.intakes[id] ?? null,
    findClientsByEmail: async (_org, email) => Object.entries(state.clients)
      .filter(([, c]) => c.email === email)
      .map(([slug, c]) => ({ clientSlug: slug, clientName: String(c.clientName), coachUid: c.coachUid as string, status: c.status as string })),
    setIntakeStatus: async (_org, id, status) => { state.intakes[id] = { ...state.intakes[id], status }; },
    convert: async (_org, id, slug, _by, build) => {
      if (state.intakes[id]?.status !== 'new') return { kind: 'conflict', reason: 'already_handled' };
      const out = build(state.clients[slug] ?? null, (state.drafts[slug] ?? null) as DraftLike, state.org);
      if (out.kind === 'conflict') return out;
      if (out.newClient) state.clients[slug] = out.newClient;
      state.drafts[slug] = out.draft;
      state.intakes[id] = { ...state.intakes[id], status: 'converted', clientSlug: slug };
      return { kind: 'ok', created: Boolean(out.newClient) };
    },
  };
  return { store, state };
}

const answers = {
  fullName: 'Test Client', email: 'Client@Example.test', dateOfBirth: '1990-01-01', gender: 'female',
  trainingHistory: 'beginner', recentActivity: 'currently-training', activityLevel: 'sedentary',
  clientGoals: 'build-strength', parq1: 'no', parq2: 'yes', postureImages: 'ignored',
};
const newIntake = (email = 'client@example.test'): IntakeDoc => ({
  status: 'new', provider: 'intake-link', clientName: 'Test Client', email,
  formData: { fullName: 'Test Client', email, dateOfBirth: '1990-01-01', gender: 'female', trainingHistory: 'beginner', recentActivity: 'currently-training', activityLevel: 'sedentary', parq2: 'yes' },
});

describe('link tokens', () => {
  it('are 22 URL-safe characters and validated strictly', () => {
    const t = newLinkToken();
    expect(parseLinkToken(t)).toBe(t);
    expect(parseLinkToken('short')).toBeNull();
    expect(parseLinkToken(`${'A'.repeat(21)}/`)).toBeNull();
  });
});

describe('manageIntakeLink', () => {
  it('lets an org admin enable, disable and regenerate', async () => {
    const { store, state } = memoryStore({ links: {} });
    const on = await manageIntakeLink(store, 'admin', 'enable');
    expect(on).toMatchObject({ ok: true, enabled: true });
    if (!on.ok) return;
    expect((await manageIntakeLink(store, 'admin', 'disable'))).toEqual({ ok: true, token: on.token, enabled: false });
    const regen = await manageIntakeLink(store, 'admin', 'regenerate');
    expect(regen.ok && regen.token).not.toBe(on.token);
    expect(state.links[on.token]).toBeUndefined();
  });

  it('refuses coaches, anonymous callers and unknown actions', async () => {
    const { store } = memoryStore();
    expect(await manageIntakeLink(store, 'coach', 'enable')).toEqual({ ok: false, reason: 'forbidden' });
    expect(await manageIntakeLink(store, undefined, 'enable')).toEqual({ ok: false, reason: 'unauthenticated' });
    expect(await manageIntakeLink(store, 'admin', 'delete')).toEqual({ ok: false, reason: 'invalid_action' });
  });
});

describe('getIntakeLink', () => {
  it('returns the gym name for an enabled link', async () => {
    const { store } = memoryStore();
    expect(await getIntakeLink(store, TOKEN)).toMatchObject({ ok: true, orgName: 'Test Gym' });
  });
  it('reports invalid and disabled links', async () => {
    const { store } = memoryStore({ links: { [TOKEN]: { orgId: ORG, enabled: false } } });
    expect(await getIntakeLink(store, TOKEN)).toEqual({ ok: false, reason: 'disabled' });
    expect(await getIntakeLink(store, 'B'.repeat(22))).toEqual({ ok: false, reason: 'invalid' });
  });
});

describe('submitIntakeLink', () => {
  const submit = (store: IntakeLinkStore, fields: unknown = answers, ip = '1.2.3.4') =>
    submitIntakeLink(store, { linkToken: TOKEN, fields, ip, now: NOW });

  it('stores a sanitised new intake and touches no client', async () => {
    const { store, state } = memoryStore();
    expect(await submit(store)).toEqual({ ok: true });
    const [intake] = Object.values(state.intakes);
    expect(intake).toMatchObject({ status: 'new', provider: 'intake-link', clientName: 'Test Client', email: 'client@example.test' });
    expect(intake.formData).not.toHaveProperty('postureImages');
    expect(intake.formData.clientGoals).toEqual(['build-strength']);
    expect(state.clients).toEqual({});
  });

  it('requires a name and an email', async () => {
    const { store } = memoryStore();
    expect(await submit(store, { ...answers, fullName: '' })).toEqual({ ok: false, reason: 'missing_name' });
    expect(await submit(store, { ...answers, email: 'nope' })).toEqual({ ok: false, reason: 'missing_email' });
  });

  it('rate-limits one device per link', async () => {
    const { store } = memoryStore();
    for (let i = 0; i < RATE.perLinkIpPerHour; i += 1) expect((await submit(store)).ok).toBe(true);
    expect(await submit(store)).toEqual({ ok: false, reason: 'rate_limited' });
    expect((await submit(store, answers, '5.6.7.8')).ok).toBe(true);
  });

  it('refuses oversized, disabled and unknown links', async () => {
    const { store } = memoryStore();
    expect(await submit(store, { ...answers, medicationsNotes: 'x'.repeat(40_000) })).toEqual({ ok: false, reason: 'too_large' });
    expect(await submitIntakeLink(store, { linkToken: 'nope', fields: answers, ip: 'x', now: NOW })).toEqual({ ok: false, reason: 'invalid' });
    const off = memoryStore({ links: { [TOKEN]: { orgId: ORG, enabled: false } } }).store;
    expect(await submit(off)).toEqual({ ok: false, reason: 'disabled' });
  });
});

describe('convertIntake', () => {
  const run = (store: IntakeLinkStore, uid: string, choice?: unknown) =>
    convertIntake(store, { uid, intakeId: 'i1', choice, now: NOW });

  it('creates a client and a draft on the first physical step when nobody matches', async () => {
    const { store, state } = memoryStore({ intakes: { i1: newIntake() } });
    expect(await run(store, 'coach')).toEqual({ ok: true, kind: 'converted', clientSlug: 'test-client', created: true });
    expect(state.clients['test-client']).toMatchObject({ assignedCoachUid: 'coach', email: 'client@example.test' });
    expect(state.drafts['test-client']).toMatchObject({ activePhaseId: 'P3', externalImport: { provider: 'intake-link' } });
    expect((state.drafts['test-client'] as { formData: Record<string, unknown> }).formData.parqSource).toBe('client');
    expect(state.intakes.i1.status).toBe('converted');
  });

  it('asks the coach to choose when the email matches an existing client', async () => {
    const { store, state } = memoryStore({
      intakes: { i1: newIntake() },
      clients: { 'test-client': { clientName: 'Test Client', email: 'client@example.test', coachUid: 'coach', status: 'active' } },
    });
    expect(await run(store, 'coach')).toEqual({ ok: true, kind: 'choose', candidates: [{ clientSlug: 'test-client', clientName: 'Test Client' }] });
    expect(state.intakes.i1.status).toBe('new');
    expect(await run(store, 'coach', { useClient: 'test-client' })).toMatchObject({ ok: true, kind: 'converted', created: false });
  });

  it('creates a separately named client when the coach says it is someone new', async () => {
    const { store, state } = memoryStore({
      intakes: { i1: newIntake() },
      clients: { 'test-client': { clientName: 'Test Client', email: 'client@example.test', coachUid: 'coach', status: 'active' } },
    });
    expect(await run(store, 'coach', { createNew: true })).toEqual({ ok: false, reason: 'name_taken' });
    expect(await run(store, 'coach', { createNew: true, clientName: 'Test Client B' })).toMatchObject({ ok: true, clientSlug: 'test-client-b', created: true });
    expect(state.clients['test-client']).toEqual({ clientName: 'Test Client', email: 'client@example.test', coachUid: 'coach', status: 'active' });
  });

  it('hides another coach\'s client from a regular coach but not from an admin', async () => {
    const seed = {
      intakes: { i1: newIntake() },
      clients: { 'test-client': { clientName: 'Test Client', email: 'client@example.test', coachUid: 'someone-else', status: 'active' } },
    };
    expect(await run(memoryStore(seed).store, 'coach')).toEqual({ ok: false, reason: 'other_coach_client' });
    expect(await run(memoryStore(seed).store, 'coach', { useClient: 'test-client' })).toEqual({ ok: false, reason: 'other_coach_client' });
    expect(await run(memoryStore(seed).store, 'admin')).toMatchObject({ ok: true, kind: 'choose' });
  });

  it('refuses a client the email does not match', async () => {
    const { store } = memoryStore({ intakes: { i1: newIntake() }, clients: { other: { clientName: 'Other', email: 'x@example.test', status: 'active' } } });
    expect(await run(store, 'coach', { useClient: 'other' })).toEqual({ ok: false, reason: 'client_mismatch' });
  });

  it('dismisses, and never converts twice', async () => {
    const { store, state } = memoryStore({ intakes: { i1: newIntake() } });
    expect(await run(store, 'coach', { dismiss: true })).toEqual({ ok: true, kind: 'dismissed' });
    expect(state.intakes.i1.status).toBe('dismissed');
    expect(await run(store, 'coach')).toEqual({ ok: false, reason: 'already_handled' });
  });

  it('respects the plan client cap', async () => {
    const { store } = memoryStore({ intakes: { i1: newIntake() }, org: { subscription: { clientCap: 1 }, stats: { clientCount: 1 } } });
    expect(await run(store, 'coach')).toEqual({ ok: false, reason: 'client_cap_reached' });
  });

  it('refuses people outside the org and bad input', async () => {
    const { store } = memoryStore({ intakes: { i1: newIntake() } });
    expect(await run(store, 'stranger')).toEqual({ ok: false, reason: 'forbidden' });
    expect(await convertIntake(store, { uid: undefined, intakeId: 'i1', choice: undefined, now: NOW })).toEqual({ ok: false, reason: 'unauthenticated' });
    expect(await run(store, 'coach', { useClient: '../etc' })).toEqual({ ok: false, reason: 'invalid_choice' });
    expect(await convertIntake(store, { uid: 'coach', intakeId: 'missing', choice: undefined, now: NOW })).toEqual({ ok: false, reason: 'not_found' });
  });
});
