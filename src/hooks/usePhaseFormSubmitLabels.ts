import { useMemo } from 'react';
import type { FormData } from '@/contexts/FormContext';
import { ASSESSMENT_SUBMIT_LABELS } from '@/constants/assessment';
import {
  hasEditAssessmentInSession,
  readPartialAssessmentCategory,
} from '@/lib/assessment/assessmentSessionStorage';
import { isAssessmentComplete } from '@/lib/assessmentCompleteness';

export function usePhaseFormSubmitLabels(
  formData: FormData,
  isPartialAssessment: boolean,
): {
  submitButtonLabel: string;
  submitButtonDisabled: boolean;
  submitButtonHint: string;
  isCompleteForReport: boolean;
} {
  const assessmentMode = isPartialAssessment ? 'partial' : 'full';
  const partialCategoryFromStorage = useMemo(() => readPartialAssessmentCategory(), []);
  const isComplete = isAssessmentComplete(formData, assessmentMode, partialCategoryFromStorage);
  const hasExistingContext = isPartialAssessment || hasEditAssessmentInSession();

  const submitButtonLabel = hasExistingContext
    ? ASSESSMENT_SUBMIT_LABELS.UPDATE_REPORT
    : ASSESSMENT_SUBMIT_LABELS.GENERATE_REPORT;
  const submitButtonDisabled = !isComplete;
  const submitButtonHint = submitButtonLabel;

  return {
    submitButtonLabel,
    submitButtonDisabled,
    submitButtonHint,
    isCompleteForReport: isComplete,
  };
}
