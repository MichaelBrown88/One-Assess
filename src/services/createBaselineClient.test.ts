import { beforeEach, describe, expect, it, vi } from 'vitest';

const mock = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>() }));
vi.mock('@/services/firebase', () => ({ getDb: () => ({}), auth: { currentUser: { uid: 'coach-a' } } }));
vi.mock('firebase/firestore', async (original) => {
  const actual = await original<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: (_db: unknown, path: string) => ({ path }),
    serverTimestamp: () => 'server-time',
    runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
      const records = new Map(mock.records);
      await callback({
        get: async (ref: { path: string }) => ({ exists: () => records.has(ref.path), data: () => records.get(ref.path) }),
        set: (ref: { path: string }, data: Record<string, unknown>) => records.set(ref.path, data),
        delete: (ref: { path: string }) => records.delete(ref.path),
      });
      mock.records = records;
    },
  };
});

import { createBaselineClient } from './clientProfiles';
import { ASSESSMENT_DRAFT_COPY } from '@/constants/assessmentDraft';

const parent = 'organizations/org-a/clients/sam-lee';
const draft = parent + '/assessmentDrafts/draft';

beforeEach(() => mock.records.clear());

describe('createBaselineClient', () => {
  it('creates a new client', async () => {
    await createBaselineClient('Sam Lee', '', 'org-a');
    expect(mock.records.get(parent)).toMatchObject({ clientName: 'Sam Lee', coachUid: 'coach-a' });
  });

  it('still refuses to overwrite an active client', async () => {
    mock.records.set(parent, { clientName: 'Sam Lee', status: 'active' });
    await expect(createBaselineClient('Sam Lee', '', 'org-a')).rejects.toThrow(ASSESSMENT_DRAFT_COPY.EXISTS);
  });

  it('starts fresh over a deleted client that never had a saved assessment', async () => {
    mock.records.set(parent, { clientName: 'Sam Lee', status: 'deleted', assessmentCount: 0 });
    mock.records.set(draft, { formData: { fullName: 'Sam Lee', dateOfBirth: '1990-01-01' } });
    await createBaselineClient('Sam Lee', 'sam@example.com', 'org-a');
    expect(mock.records.get(parent)).toMatchObject({ clientName: 'Sam Lee', coachUid: 'coach-a' });
    expect(mock.records.get(parent)?.status).not.toBe('deleted');
    expect(mock.records.has(draft)).toBe(false);
  });

  it('points to the trash when a deleted client still has saved assessments', async () => {
    mock.records.set(parent, { clientName: 'Sam Lee', status: 'deleted', assessmentCount: 2 });
    await expect(createBaselineClient('Sam Lee', '', 'org-a')).rejects.toThrow(ASSESSMENT_DRAFT_COPY.EXISTS_IN_TRASH);
    expect(mock.records.get(parent)).toMatchObject({ status: 'deleted', assessmentCount: 2 });
  });
});
