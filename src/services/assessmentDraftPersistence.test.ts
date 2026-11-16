import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';

const mock = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), fail: false }));
vi.mock('@/services/firebase', () => ({ getDb: () => ({}), auth: {currentUser:{uid:'coach-a'}} }));
vi.mock('firebase/firestore', async (original) => {
  const actual = await original<typeof import('firebase/firestore')>();
  return { ...actual, doc: (_db: unknown, path: string) => ({path}), serverTimestamp: () => 'server-time', deleteField: () => '__deleted__',
    runTransaction: async (_db: unknown, callback: (tx: unknown) => Promise<unknown>) => {
      const records = new Map(mock.records);
      await callback({
        get: async (ref: {path:string}) => ({exists:()=>records.has(ref.path),data:()=>records.get(ref.path)}),
        set: (ref: {path:string}, data: Record<string,unknown>, options?: unknown) => records.set(ref.path, options ? {...records.get(ref.path),...data} : data),
        update: (ref: {path:string}, data: Record<string,unknown>) => records.set(ref.path,{...records.get(ref.path),...data}),
        delete: (ref: {path:string}) => records.delete(ref.path),
      });
      if(mock.fail) throw new Error('network unavailable');
      mock.records=records;
    },
  };
});
import { saveDraftAssessment, clearDraftAssessment } from './coachAssessments';
const parent = 'organizations/org-a/clients/saved-client';
const draft = parent + '/assessmentDrafts/draft';
const form = {...createEmptyAssessmentForm(),fullName:'Saved Client',cardioRestingHr:'65'};
beforeEach(()=>{mock.records.clear();mock.fail=false;});
describe('atomic draft discovery writes',()=>{
  it('keeps the original legacy draft date across later saves', async () => {
    mock.records.set(parent, { coachUid: 'coach-a', organizationId: 'org-a' });
    mock.records.set(draft, { updatedAt: { toDate: () => new Date('2026-09-21T19:00:43.057Z') }, formData: form });
    await saveDraftAssessment('Saved Client', form, 'org-a');
    await saveDraftAssessment('Saved Client', { ...form, cardioPeakHr: '140' }, 'org-a');
    expect(mock.records.get(draft)).toMatchObject({ formData: { assessedAt: '2026-09-21T19:00:43.057Z', cardioPeakHr: '140' } });
  });
  it('creates a discoverable owned parent without a fabricated report',async()=>{
    await saveDraftAssessment('Saved Client',form,'org-a',{activePhaseId:'P2',activePhaseIdx:3});
    expect(mock.records.get(parent)).toMatchObject({clientName:'Saved Client',coachUid:'coach-a',organizationId:'org-a',assessmentCount:0,hasAssessmentDraft:true});
    expect(mock.records.get(parent)).not.toHaveProperty('overallScore');
    expect(mock.records.get(draft)).toMatchObject({formData:{cardioRestingHr:'65'},activePhaseId:'P2'});
    expect(mock.records.size).toBe(2);
  });
  it('preserves existing profile ownership, score and assessment timestamps',async()=>{
    const existing={coachUid:'assigned-coach',organizationId:'org-a',createdAt:'original',updatedAt:'assessment-date',overallScore:72,assessmentCount:2};
    mock.records.set(parent,existing);
    await saveDraftAssessment('Saved Client',form,'org-a');
    expect(mock.records.get(parent)).toMatchObject(existing);
  });
  it('keeps valid phase metadata when callers omit it or pass empty',async()=>{
    await saveDraftAssessment('Saved Client',form,'org-a',{activePhaseId:'P2',activePhaseIdx:3});
    await saveDraftAssessment('Saved Client',form,'org-a');
    await saveDraftAssessment('Saved Client',form,'org-a',{activePhaseId:'empty',activePhaseIdx:5});
    expect(mock.records.get(draft)).toMatchObject({activePhaseId:'P2',activePhaseIdx:3});
  });
  it('does not leave a partial parent/draft write on failure',async()=>{
    mock.fail=true;
    await expect(saveDraftAssessment('Saved Client',form,'org-a')).rejects.toThrow();
    expect(mock.records.size).toBe(0);
  });
  it('clears discovery metadata with the draft and preserves history',async()=>{
    await saveDraftAssessment('Saved Client',form,'org-a');
    mock.records.set(parent+'/sessions/first',{original:true});
    await clearDraftAssessment('Saved Client','org-a');
    expect(mock.records.has(draft)).toBe(false);
    expect(mock.records.get(parent)?.hasAssessmentDraft).toBe(false);
    expect(mock.records.get(parent+'/sessions/first')).toEqual({original:true});
  });
  it('does not overwrite an orphan draft through a new client save',async()=>{
    mock.records.set(draft,{formData:{fullName:'Saved Client',cardioRestingHr:'70'}});
    await expect(saveDraftAssessment('Saved Client',form,'org-a')).rejects.toThrow();
    expect(mock.records.get(draft)).toEqual({formData:{fullName:'Saved Client',cardioRestingHr:'70'}});
    expect(mock.records.has(parent)).toBe(false);
  });
  it('does not reactivate deleted clients',async()=>{
    mock.records.set(parent,{status:'deleted',coachUid:'coach-a'});
    await expect(saveDraftAssessment('Saved Client',form,'org-a')).rejects.toThrow();
    expect(mock.records.has(draft)).toBe(false);
  });
});
