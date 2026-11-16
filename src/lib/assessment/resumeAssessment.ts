import { assessmentDate } from './assessmentDate';
import type { FormData } from '@/contexts/FormContext';
import { clearAssessmentEntryBleedKeys, confirmAssessmentSetup, writeAssessmentPhaseId, writeAssessmentPhaseIndex, writeSessionDraftAssessmentBundle, readDraftAssessmentRaw } from './assessmentSessionStorage';
import { markBaselineAssessmentSession } from './baselineSession';
import { buildStudioBaselinePlan } from '@/lib/types/assessmentPlan';
import { prepareFormDataForPersistence } from './prepareFormDataForPersistence';
import { isPersistablePhaseId } from './draftNavigation';

export function prepareAssessmentResume(draft: { formData: FormData; activePhaseId: string | null; activePhaseIdx: number | null; updatedAt?: { toDate(): Date } | null }): void {
  const captured = assessmentDate(draft.formData.assessedAt, draft.updatedAt?.toDate());
  const formData = { ...draft.formData, ...(captured ? { assessedAt: captured.toISOString() } : {}), assessmentPlan: draft.formData.assessmentPlan ?? buildStudioBaselinePlan() };
  clearAssessmentEntryBleedKeys();
  markBaselineAssessmentSession(formData.assessmentIntakeMode === 'send_link_first' ? 'send_link_first' : 'studio', { remoteIntakeResume: formData.assessmentIntakeMode === 'send_link_first' });
  writeSessionDraftAssessmentBundle(formData, formData.fullName);
  const restored = JSON.parse(readDraftAssessmentRaw() ?? '{}');
  if (JSON.stringify(restored.formData) !== JSON.stringify(prepareFormDataForPersistence(formData))) {
    throw new Error('Could not restore the draft in this tab.');
  }
  if (typeof draft.activePhaseIdx === 'number') writeAssessmentPhaseIndex(draft.activePhaseIdx);
  if (isPersistablePhaseId(draft.activePhaseId) && draft.activePhaseId !== 'P7') writeAssessmentPhaseId(draft.activePhaseId);
  confirmAssessmentSetup();
}
