import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';
const mock = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>() }));
vi.mock('@/services/firebase', () => ({ getDb: () => ({}), auth: { currentUser: { uid: 'coach' } } }));
vi.mock('firebase/firestore', async (original) => {
  const actual = await original<typeof import('firebase/firestore')>();
  const ref = (parent: unknown, path: string) => ({ path: parent && typeof parent === 'object' && 'path' in parent ? String(parent.path) + '/' + path : path });
  return { ...actual, doc: ref, collection: ref, query: (r: unknown) => r,
    serverTimestamp: () => actual.Timestamp.fromDate(new Date('2026-11-16T18:00:00Z')),
    getDoc: async (r: { path: string }) => ({ exists: () => mock.records.has(r.path), data: () => mock.records.get(r.path) }),
    getDocs: async (r: { path: string }) => ({ forEach: (cb: (doc: unknown) => void) => { for (const [path, data] of mock.records) if (path.startsWith(r.path + '/')) cb({ id: path.split('/').at(-1), data: () => data }); } }),
    setDoc: async (r: { path: string }, data: Record<string, unknown>) => { mock.records.set(r.path, data); },
  };
});
import { Timestamp } from 'firebase/firestore';
import { getSnapshots, updateCurrentAssessment } from './assessmentHistory';
const client = 'organizations/org/clients/saved-client';
const currentPath = client + '/current/state';
const captured = '2026-09-21T19:00:43.057Z';
beforeEach(() => mock.records.clear());
describe('capture date survives result generation and later edits', () => {
  it('applies an original-date correction on read without rewriting the historical event', async () => {
    const timestamp = Timestamp.fromDate(new Date('2026-11-16T18:00:00Z'));
    const event = { timestamp, formData: { ...createEmptyAssessmentForm(), fullName: 'Saved Client' }, overallScore: 70 };
    mock.records.set(client + '/sessions/original', event);
    mock.records.set(currentPath, { assessmentDateCorrections: { original: captured } });
    const snapshots = await getSnapshots('coach', 'Saved Client', 50, 'org');
    expect(snapshots[0].formData.assessedAt).toBe(captured);
    expect(snapshots[0].timestamp).toEqual(timestamp);
    expect(mock.records.get(client + '/sessions/original')).toEqual(event);
    expect(event.formData.assessedAt).toBeUndefined();
  });
  it('does not append a session just because capture metadata is absent in a legacy editor', async () => {
    const form = { ...createEmptyAssessmentForm(), fullName: 'Saved Client' };
    mock.records.set(currentPath, { formData: { ...form, assessedAt: captured } });
    expect(await updateCurrentAssessment('coach', 'Saved Client', form, 70, 'full', 'all', 'org')).toBe(false);
    expect(mock.records.size).toBe(1);
  });
  it('uses an old draft timestamp for first completion and records a separate save time', async () => {
    mock.records.set(client + '/assessmentDrafts/draft', { updatedAt: Timestamp.fromDate(new Date(captured)) });
    const input = { ...createEmptyAssessmentForm(), fullName: 'Saved Client', cardioRestingHr: '65' };
    await updateCurrentAssessment('coach', 'Saved Client', input, 70, 'full', 'all', 'org');
    expect(mock.records.get(currentPath)?.formData).toMatchObject({ assessedAt: captured, cardioRestingHr: '65' });
    expect((mock.records.get(currentPath)?.lastUpdated as Timestamp).toDate().toISOString()).toBe('2026-11-16T18:00:00.000Z');
    expect(input.assessedAt).toBeUndefined();
    const session = [...mock.records].find(([path]) => path.includes('/sessions/'))?.[1];
    expect(session?.formData).toMatchObject({ assessedAt: captured });
  });
  it('preserves the corrected date and historical correction metadata when adding photos', async () => {
    const form = { ...createEmptyAssessmentForm(), fullName: 'Saved Client', assessedAt: captured };
    mock.records.set(currentPath, { formData: form, overallScore: 70, assessmentDateCorrections: { original: captured }, lastUpdated: Timestamp.now() });
    await updateCurrentAssessment('coach', 'Saved Client', { ...form, postureImagesStorage: { front: 'https://example.com/photo.jpg' } }, 70, 'full', 'all', 'org');
    expect(mock.records.get(currentPath)).toMatchObject({ assessmentDateCorrections: { original: captured }, formData: { assessedAt: captured, postureImagesStorage: { front: 'https://example.com/photo.jpg' } } });
  });
});
