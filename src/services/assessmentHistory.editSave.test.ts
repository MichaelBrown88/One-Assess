import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';

const mock = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>() }));

vi.mock('@/services/firebase', () => ({ getDb: () => ({}), auth: { currentUser: { uid: 'coach' } } }));
vi.mock('firebase/firestore', async (original) => {
  const actual = await original<typeof import('firebase/firestore')>();
  const ref = (parent: unknown, path: string) => ({
    path: parent && typeof parent === 'object' && 'path' in parent ? `${String(parent.path)}/${path}` : path,
  });
  return {
    ...actual,
    doc: ref,
    collection: ref,
    query: (r: unknown) => r,
    serverTimestamp: () => actual.Timestamp.fromDate(new Date('2026-11-25T12:00:00Z')),
    getDoc: async (r: { path: string }) => ({
      exists: () => mock.records.has(r.path),
      data: () => mock.records.get(r.path),
    }),
    getDocs: async (r: { path: string }) => ({
      forEach: (cb: (docSnap: { id: string; data: () => Record<string, unknown> }) => void) => {
        for (const [path, data] of mock.records) {
          if (path.startsWith(`${r.path}/`)) {
            cb({ id: path.split('/').at(-1) ?? '', data: () => data });
          }
        }
      },
    }),
    setDoc: async (r: { path: string }, data: Record<string, unknown>, options?: { merge?: boolean }) => {
      const prev = options?.merge ? (mock.records.get(r.path) ?? {}) : {};
      mock.records.set(r.path, { ...prev, ...data });
    },
    updateDoc: async (r: { path: string }, data: Record<string, unknown>) => {
      mock.records.set(r.path, { ...(mock.records.get(r.path) ?? {}), ...data });
    },
  };
});

import { Timestamp } from 'firebase/firestore';
import { updateCurrentAssessment, updateSnapshotInPlace } from './assessmentHistory';

const ORG = 'org';
const CLIENT = 'organizations/org/clients/saved-client';
const CURRENT = `${CLIENT}/current/state`;
const SESSION_ID = '2026-11-01T10-00-00-000Z';
const SESSION = `${CLIENT}/sessions/${SESSION_ID}`;

function sessionPaths(): string[] {
  return [...mock.records.keys()].filter((path) => path.includes('/sessions/'));
}

beforeEach(() => {
  mock.records.clear();
});

describe('assessment session writes', () => {
  it('updates a saved assessment in place and does not add a timeline entry', async () => {
    const original = {
      ...createEmptyAssessmentForm(),
      fullName: 'Saved Client',
      activityLevel: 'low',
    };
    const edited = { ...original, activityLevel: 'high', clientGoals: ['weight-loss'] };
    mock.records.set(SESSION, {
      timestamp: Timestamp.fromDate(new Date('2026-11-01T10:00:00Z')),
      formData: original,
      overallScore: 40,
      type: 'full',
    });
    mock.records.set(CURRENT, { formData: original, overallScore: 40, organizationId: ORG });
    mock.records.set(CLIENT, { clientName: 'Saved Client', overallScore: 40 });

    const result = await updateSnapshotInPlace('coach', 'Saved Client', SESSION_ID, edited, 72, ORG);

    expect(result.success).toBe(true);
    expect(sessionPaths()).toEqual([SESSION]);
    expect(mock.records.get(SESSION)?.formData).toMatchObject({ activityLevel: 'high' });
    expect(mock.records.get(SESSION)?.overallScore).toBe(72);
    expect(mock.records.get(CURRENT)?.formData).toMatchObject({ activityLevel: 'high' });
    expect(mock.records.get(CURRENT)?.overallScore).toBe(72);
    expect(mock.records.get(CLIENT)?.overallScore).toBe(72);
    expect(mock.records.get(CLIENT)?.goals).toEqual(['weight-loss']);
    expect(mock.records.get(CLIENT)?.isPartial).toBe(false);
  });

  it('creates exactly one session when a new assessment is saved', async () => {
    const form = {
      ...createEmptyAssessmentForm(),
      fullName: 'Saved Client',
      activityLevel: 'moderate',
      assessedAt: '2026-11-25T09:00:00.000Z',
    };

    const created = await updateCurrentAssessment('coach', 'Saved Client', form, 70, 'full', 'all', ORG);

    expect(created).toBe(true);
    expect(sessionPaths()).toHaveLength(1);
    const session = mock.records.get(sessionPaths()[0]);
    expect(session?.formData).toMatchObject({ fullName: 'Saved Client', activityLevel: 'moderate' });
    expect(session?.type).toBe('full-assessment');
  });
});
