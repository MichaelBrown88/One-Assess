import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMPARISON_CURRENT_FORM as current, COMPARISON_PREVIOUS_FORM as previous } from '@/constants/reportComparisonPreview';
import { buildAssessmentComparison } from '@/lib/reports/assessmentComparison';

const mocks = vi.hoisted(() => ({ getDocs: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), getSnapshots: vi.fn(), getCurrentAssessment: vi.fn() }));
vi.mock('firebase/firestore', async importOriginal => ({
  ...await importOriginal<typeof import('firebase/firestore')>(),
  doc: (...args: unknown[]) => args.slice(1).join('/'), collection: (...args: unknown[]) => args.slice(1).join('/'),
  query: (...args: unknown[]) => args, where: (...args: unknown[]) => args, limit: (n: number) => n,
  getDocs: mocks.getDocs, getDoc: mocks.getDoc, setDoc: mocks.setDoc,
  serverTimestamp: () => 'server-time', deleteField: () => 'delete-field',
}));
vi.mock('@/services/firebase', () => ({ getDb: () => ({}), getFirebaseAuth: () => ({ currentUser: null }) }));
vi.mock('@/lib/utils/validateOrganizationId', () => ({ validateOrganizationId: (id: string) => id }));
vi.mock('@/services/assessmentHistory', async importOriginal => ({
  ...await importOriginal<typeof import('@/services/assessmentHistory')>(),
  getSnapshots: mocks.getSnapshots, getCurrentAssessment: mocks.getCurrentAssessment,
}));
vi.mock('@/lib/utils/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() } }));
import { publishPublicReport, getPublicSnapshot } from './publicReports';

const sessions = [
  { id: 'current', type: 'full-assessment', formData: current },
  { id: 'previous', type: 'full-assessment', formData: previous },
];
const params = { coachUid: 'coach', assessmentId: 'client-id', formData: current, organizationId: 'test-org' };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getDocs.mockResolvedValue({ empty: false, docs: [{ id: 'token', data: () => ({ assessmentId: 'client-id', formData: current }) }] });
  mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ assessmentId: 'client-id', formData: current }) });
  mocks.getSnapshots.mockResolvedValue(sessions);
  mocks.getCurrentAssessment.mockResolvedValue({ formData: current });
  mocks.setDoc.mockResolvedValue(undefined);
});

describe('public report measured changes', () => {
  it('publishes the same validated numeric comparison from org-scoped history', async () => {
    await publishPublicReport(params);
    expect(mocks.getSnapshots).toHaveBeenCalledWith('coach', current.fullName, 100, 'test-org');
    const payload = mocks.setDoc.mock.calls[0][1];
    expect(payload.assessmentComparison).toEqual(buildAssessmentComparison(current, sessions));
    expect(payload.previousFormData).toBe('delete-field');
    expect(JSON.stringify(payload.assessmentComparison)).not.toMatch(/email|phone|posture|fullName/);
  });
  it('clears stale comparison data when history is unavailable or only contains re-saves', async () => {
    mocks.getSnapshots.mockResolvedValue([sessions[0], { ...sessions[0], id: 'resave' }]);
    await publishPublicReport(params);
    expect(mocks.setDoc.mock.calls[0][1].assessmentComparison).toBe('delete-field');
    mocks.getSnapshots.mockRejectedValue(new Error('history unavailable'));
    await publishPublicReport(params);
    expect(mocks.setDoc.mock.calls[1][1].assessmentComparison).toBe('delete-field');
  });
  it('recovers a missing debrief capture date only from an exactly matching saved form', async () => {
    await publishPublicReport({ ...params, formData: { ...current, assessedAt: undefined } });
    expect(mocks.setDoc.mock.calls[0][1].formData.assessedAt).toBe(current.assessedAt);
    expect(mocks.setDoc.mock.calls[0][1].assessmentComparison).toEqual(buildAssessmentComparison(current, sessions));
    await publishPublicReport({ ...params, formData: { ...current, assessedAt: undefined, inbodyWeightKg: '79' } });
    expect(mocks.setDoc.mock.calls[1][1].assessmentComparison).toBe('delete-field');
  });
  it('returns the frozen comparison with a historical public snapshot', async () => {
    const assessmentComparison = buildAssessmentComparison(current, sessions);
    mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ formData: current, overallScore: 70, assessmentComparison }) });
    expect((await getPublicSnapshot('token', 'snapshot'))?.assessmentComparison).toEqual(assessmentComparison);
  });
});
