import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';
import type { FormData } from '@/contexts/FormContext';
import type { UserProfile } from '@/types/auth';
import { computeScores } from '@/lib/scoring';
import { writeEditAssessmentPayload, removeEditAssessment } from '@/lib/assessment/assessmentSessionStorage';
import { logger } from '@/lib/utils/logger';

const history = vi.hoisted(() => ({
  updateSnapshotInPlace: vi.fn(),
  getSnapshots: vi.fn(),
  getCurrentAssessment: vi.fn(),
}));

const coach = vi.hoisted(() => ({
  saveCoachAssessment: vi.fn(),
  updateCoachAssessment: vi.fn(),
  clearDraftAssessment: vi.fn(async () => undefined),
  saveDraftAssessment: vi.fn(async () => undefined),
}));

const notifications = vi.hoisted(() => ({
  writeNotification: vi.fn(async () => undefined),
}));

vi.mock('@/services/assessmentHistory', () => history);
vi.mock('@/services/coachAssessments', () => coach);
vi.mock('@/services/notificationWriter', () => notifications);
vi.mock('@/services/clientProfiles', () => ({
  generateClientSlug: (name: string) =>
    (name || 'unnamed-client').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-._]/g, ''),
  createOrUpdateClientProfile: vi.fn(async () => undefined),
  updateRetestSchedule: vi.fn(async () => undefined),
  resolveClientId: vi.fn(async () => null),
}));
vi.mock('@/services/firebase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/firebase')>();
  return {
    ...actual,
    getDb: () => {
      throw new Error('firestore disabled in save hook test');
    },
  };
});

import { useAssessmentSave } from './useAssessmentSave';

const SESSION = '2026-11-01T10-00-00-000Z';
const formData = {
  ...createEmptyAssessmentForm(),
  fullName: 'Jane Doe',
  activityLevel: 'moderately-active',
} as FormData;
const scores = computeScores(formData);
const profile = { organizationId: 'org-1', firstAssessmentCompleted: true } as UserProfile;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let save: ReturnType<typeof useAssessmentSave>;

function Harness() {
  save = useAssessmentSave({
    user: { uid: 'coach-1', email: 'coach@example.com' },
    profile,
    formData,
    scores,
    isResultsPhase: false,
    isDemoAssessment: false,
    orgSettings: null,
  });
  return null;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  sessionStorage.clear();
  history.updateSnapshotInPlace.mockReset();
  history.getSnapshots.mockReset();
  history.getCurrentAssessment.mockReset();
  coach.saveCoachAssessment.mockReset();
  coach.updateCoachAssessment.mockReset();
  notifications.writeNotification.mockClear();
  history.updateSnapshotInPlace.mockResolvedValue({ success: true, message: 'Assessment updated.' });
  history.getSnapshots.mockResolvedValue([]);
  coach.saveCoachAssessment.mockResolvedValue({ assessmentId: 'jane-doe', shareToken: null });
  coach.updateCoachAssessment.mockResolvedValue(undefined);
  container = document.createElement('div');
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
  removeEditAssessment();
});

async function renderAndSave(): Promise<void> {
  await act(async () => {
    root.render(<Harness />);
  });
  await act(async () => {
    await save.handleSaveToDashboard();
  });
}

describe('useAssessmentSave session writes', () => {
  it('updates the named session in place and does not create a timeline entry', async () => {
    writeEditAssessmentPayload({
      assessmentId: 'jane-doe',
      snapshotId: SESSION,
      clientName: 'Jane Doe',
      formData,
    });

    await renderAndSave();

    expect(history.updateSnapshotInPlace).toHaveBeenCalledTimes(1);
    expect(history.updateSnapshotInPlace).toHaveBeenCalledWith(
      'coach-1',
      'Jane Doe',
      SESSION,
      formData,
      scores.overall,
      'org-1',
    );
    expect(history.getSnapshots).not.toHaveBeenCalled();
    expect(coach.saveCoachAssessment).not.toHaveBeenCalled();
    expect(coach.updateCoachAssessment).not.toHaveBeenCalled();
    expect(notifications.writeNotification).not.toHaveBeenCalled();
  });

  it('updates the current session when an old link has no snapshot id', async () => {
    history.getSnapshots.mockResolvedValue([{ id: SESSION }]);
    writeEditAssessmentPayload({
      assessmentId: 'jane-doe',
      clientName: 'Jane Doe',
      formData,
    });

    await renderAndSave();

    expect(history.updateSnapshotInPlace).toHaveBeenCalledWith(
      'coach-1',
      'Jane Doe',
      SESSION,
      formData,
      scores.overall,
      'org-1',
    );
    expect(coach.saveCoachAssessment).not.toHaveBeenCalled();
    expect(coach.updateCoachAssessment).not.toHaveBeenCalled();
  });

  it('does not append a session when the named session cannot be updated', async () => {
    history.updateSnapshotInPlace.mockResolvedValue({ success: false, message: 'Snapshot not found' });
    writeEditAssessmentPayload({
      assessmentId: 'jane-doe',
      snapshotId: SESSION,
      clientName: 'Jane Doe',
      formData,
    });

    await renderAndSave();

    expect(coach.updateCoachAssessment).not.toHaveBeenCalled();
    expect(coach.saveCoachAssessment).not.toHaveBeenCalled();
  });

  it('keeps today\'s append behaviour, with a warning, when no session exists', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    writeEditAssessmentPayload({
      assessmentId: 'jane-doe',
      clientName: 'Jane Doe',
      formData,
    });

    await renderAndSave();

    expect(history.updateSnapshotInPlace).not.toHaveBeenCalled();
    expect(coach.updateCoachAssessment).toHaveBeenCalledTimes(1);
    expect(coach.saveCoachAssessment).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[Assessment] Edit has no saved session to update; appending a new session',
      { assessmentId: 'jane-doe' },
    );
    warn.mockRestore();
  });

  it('still creates one session for a new assessment', async () => {
    await renderAndSave();

    expect(coach.saveCoachAssessment).toHaveBeenCalledTimes(1);
    expect(history.updateSnapshotInPlace).not.toHaveBeenCalled();
    expect(coach.updateCoachAssessment).not.toHaveBeenCalled();
  });
});
