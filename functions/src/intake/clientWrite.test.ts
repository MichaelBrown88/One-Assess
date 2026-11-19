import { describe, expect, it } from 'vitest';
import { buildIntakeWrite, clientCapReached, clientSlug } from './clientWrite';
import type { StandardIntake } from './mergeDraft';

const intake: StandardIntake = {
  provider: 'intake-link',
  formData: { fullName: 'Test Client', email: 'client@example.test', gender: 'female', dateOfBirth: '1990-01-01' },
  healthNotes: [], consultationNotes: [], metrics: [],
};
const roomyOrg = { subscription: { clientCap: 50 }, stats: { clientCount: 3 } };
const base = { intake, clientName: 'Test Client', orgId: 'org-test', coachUid: 'coach-1', nowIso: '2026-11-19T00:00:00.000Z', draft: null, org: roomyOrg };

describe('buildIntakeWrite', () => {
  it('creates a new client assigned to the coach', () => {
    const out = buildIntakeWrite({ ...base, client: null, mode: 'create' });
    expect(out.kind).toBe('write');
    if (out.kind !== 'write') return;
    expect(out.newClient).toEqual({
      clientName: 'Test Client', clientNameLower: 'test client', organizationId: 'org-test', coachUid: 'coach-1',
      assignedCoachUid: 'coach-1', status: 'active', assessmentCount: 0,
      email: 'client@example.test', gender: 'female', dateOfBirth: '1990-01-01',
    });
    expect(out.draft.externalImport.provider).toBe('intake-link');
  });

  it('respects the plan client cap when creating', () => {
    const out = buildIntakeWrite({ ...base, client: null, mode: 'match', org: { subscription: { clientCap: 3 }, stats: { clientCount: 3 } } });
    expect(out).toEqual({ kind: 'conflict', reason: 'client_cap_reached' });
  });

  it('updates a chosen client even when emails differ', () => {
    const out = buildIntakeWrite({ ...base, client: { status: 'active', email: 'old@example.test' }, mode: 'chosen' });
    expect(out.kind).toBe('write');
    if (out.kind === 'write') expect(out.newClient).toBeUndefined();
  });

  it.each([
    ['create over an existing name', { status: 'active' }, 'create', 'name_taken'],
    ['archived client', { status: 'archived' }, 'match', 'client_inactive'],
    ['same name, different email', { status: 'active', email: 'other@example.test' }, 'match', 'client_mismatch'],
    ['other org', { status: 'active', organizationId: 'org-other' }, 'chosen', 'client_mismatch'],
  ] as const)('refuses %s', (_label, client, mode, reason) => {
    expect(buildIntakeWrite({ ...base, client, mode })).toEqual({ kind: 'conflict', reason });
  });

  it('refuses a chosen client that no longer exists', () => {
    expect(buildIntakeWrite({ ...base, client: null, mode: 'chosen' })).toEqual({ kind: 'conflict', reason: 'client_mismatch' });
  });
});

describe('clientCapReached', () => {
  it('mirrors the rules fallback of 2 clients', () => {
    expect(clientCapReached(null)).toBe(false);
    expect(clientCapReached({ stats: { clientCount: 2 } })).toBe(true);
    expect(clientCapReached({ subscription: { clientSeats: 10 }, stats: { clientCount: 2 } })).toBe(false);
  });
});

describe('clientSlug', () => {
  it('matches the app slug rule', () => {
    expect(clientSlug('  Test   Client ')).toBe('test-client');
  });
});
