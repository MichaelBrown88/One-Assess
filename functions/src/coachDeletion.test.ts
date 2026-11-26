import { beforeEach, describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ docs: new Map<string, Record<string, any>>(), writes: [] as Array<{ type: string; path: string; data?: any }>, failStorage: false }));
vi.mock('firebase-admin', () => {
  const snapshot = (path: string) => ({ id: path.split('/').slice(-1)[0], ref: ref(path), exists: state.docs.has(path), data: () => state.docs.get(path) });
  const ref = (path: string): any => ({ path, get: async () => snapshot(path), collection: (name: string) => collection(`${path}/${name}`), listCollections: async () => [] });
  const collection = (path: string, filters: Array<[string, any]> = [], sort = false): any => ({ path,
    doc: (id: string) => ref(`${path}/${id}`), where: (field: string, _op: string, value: any) => collection(path, [...filters, [field, value]], sort),
    orderBy: () => collection(path, filters, true),
    get: async () => {
      let docs = [...state.docs.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/')).map(snapshot)
        .filter(doc => filters.every(([field, value]) => doc.data()?.[field] === value));
      if (sort) docs = docs.sort((a, b) => (b.data()?.timestamp ?? 0) - (a.data()?.timestamp ?? 0));
      return { docs, empty: docs.length === 0 };
    },
  });
  const db = { doc: ref, collection,
    recursiveDelete: async (target: any) => { state.writes.push({ type: 'recursiveDelete', path: target.path }); },
    runTransaction: async (work: any) => {
      const pending: typeof state.writes = [];
      const result = await work({ get: (target: any) => target.get(), delete: (target: any) => pending.push({ type: 'delete', path: target.path }),
        update: (target: any, data: any) => pending.push({ type: 'update', path: target.path, data }), set: (target: any, data: any) => pending.push({ type: 'set', path: target.path, data }) });
      state.writes.push(...pending);
      return result;
    },
  };
  const firestore = Object.assign(() => db, { FieldValue: { delete: () => '__delete__', serverTimestamp: () => '__now__', increment: (n: number) => ({ increment: n }) } });
  return { firestore, storage: () => ({ bucket: () => ({ deleteFiles: async () => { if (state.failStorage) throw new Error('Storage unavailable'); } }) }) };
});
import { assertDeletionAccess, handleCoachDeletion } from './coachDeletion';
const clientPath = 'organizations/org/clients/client';
const request = (snapshotId?: string): any => ({ auth: { uid: 'coach' }, data: { organizationId: 'org', clientId: 'client', ...(snapshotId ? { snapshotId } : {}) } });
beforeEach(() => {
  state.docs.clear(); state.writes.length = 0; state.failStorage = false;
  state.docs.set('organizations/org/coaches/coach', {});
  state.docs.set(clientPath, { coachUid: 'coach', status: 'deleted' });
});
describe('assigned-coach deletion', () => {
  it('rejects unauthenticated, cross-coach, non-member and non-Trash erasure', () => {
    expect(() => assertDeletionAccess(undefined, true, 'coach', 'deleted', true)).toThrow();
    expect(() => assertDeletionAccess('other', true, 'coach', 'deleted', true)).toThrow();
    expect(() => assertDeletionAccess('coach', false, 'coach', 'deleted', true)).toThrow();
    expect(() => assertDeletionAccess('coach', true, 'coach', 'active', true)).toThrow(/Trash/);
  });
  it('restores the preceding snapshot and removes current report links atomically', async () => {
    state.docs.set(`${clientPath}/sessions/new`, { timestamp: 2, overallScore: 80, formData: { fullName: 'QA', value: 'new' } });
    state.docs.set(`${clientPath}/sessions/old`, { timestamp: 1, overallScore: 60, formData: { fullName: 'QA', value: 'old' } });
    state.docs.set('shared-reports/own', { organizationId: 'org', assessmentId: 'client' });
    state.docs.set('shared-reports/foreign', { organizationId: 'elsewhere', assessmentId: 'client' });
    await handleCoachDeletion(request('new'));
    expect(state.writes.find(w => w.type === 'set')?.data.formData.value).toBe('old');
    expect(state.writes.find(w => w.path === clientPath)?.data.assessmentCount).toBe(1);
    expect(state.writes.some(w => w.path === 'shared-reports/own')).toBe(true);
    expect(state.writes.some(w => w.path === 'shared-reports/foreign')).toBe(false);
    expect(state.writes.some(w => w.path.endsWith('/sessions/old'))).toBe(false);
  });
  it('deleting the only assessment keeps the profile and clears its score', async () => {
    state.docs.set(`${clientPath}/sessions/only`, { timestamp: 1 });
    await handleCoachDeletion(request('only'));
    expect(state.writes.find(w => w.path === clientPath)?.data).toMatchObject({ assessmentCount: 0, formData: {}, overallScore: '__delete__' });
    expect(state.writes.some(w => w.path === clientPath && w.type === 'delete')).toBe(false);
  });
  it('deleting an older assessment leaves the current result untouched', async () => {
    state.docs.set(`${clientPath}/sessions/new`, { timestamp: 2 });
    state.docs.set(`${clientPath}/sessions/old`, { timestamp: 1 });
    await handleCoachDeletion(request('old'));
    expect(state.writes.some(w => w.path.includes('/current/'))).toBe(false);
  });
  it('keeps the Trash profile when storage cleanup fails', async () => {
    state.failStorage = true;
    await expect(handleCoachDeletion(request())).rejects.toThrow('Storage unavailable');
    expect(state.writes.some(write => write.type === 'delete')).toBe(false);
    expect(state.writes.some(write => write.data?.permanentDeletionStartedAt)).toBe(true);
  });
  it('rejects path traversal before making writes', async () => {
    const call = request(); call.data.clientId = '../foreign';
    await expect(handleCoachDeletion(call)).rejects.toThrow(/Valid/);
    expect(state.writes).toEqual([]);
  });
});
