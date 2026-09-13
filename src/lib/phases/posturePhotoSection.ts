import type { FormData } from '@/contexts/FormContext';
import type { PhaseSection } from './types';
import {
  ASSESSMENT_LABELS,
  ASSESSMENT_TOOLTIPS,
  ASSESSMENT_OPTIONS,
  SECTION_TITLES,
} from '@/constants/assessment';

/** Shared posture capture section — lives on P2 (private room with tape). */
export const posturePhotoSection: PhaseSection = {
  id: 'posture',
  title: SECTION_TITLES.P2.posture,
  fields: [
    {
      id: 'postureInputMode' as keyof FormData,
      type: 'select',
      label: ASSESSMENT_LABELS.P4.postureInputMode,
      tooltip: ASSESSMENT_TOOLTIPS.P4.postureInputMode,
      options: ASSESSMENT_OPTIONS.postureInputMode,
    },
    {
      id: 'postureHeadOverall' as keyof FormData,
      type: 'multiselect',
      label: ASSESSMENT_LABELS.P4.postureHeadOverall,
      tooltip: ASSESSMENT_TOOLTIPS.P4.postureHeadOverall,
      conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
      options: ASSESSMENT_OPTIONS.postureHeadOverall,
    },
    {
      id: 'postureShouldersOverall' as keyof FormData,
      type: 'multiselect',
      label: ASSESSMENT_LABELS.P4.postureShouldersOverall,
      tooltip: ASSESSMENT_TOOLTIPS.P4.postureShouldersOverall,
      conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
      options: ASSESSMENT_OPTIONS.postureShouldersOverall,
    },
    {
      id: 'postureBackOverall' as keyof FormData,
      type: 'multiselect',
      label: ASSESSMENT_LABELS.P4.postureBackOverall,
      tooltip: ASSESSMENT_TOOLTIPS.P4.postureBackOverall,
      conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
      options: ASSESSMENT_OPTIONS.postureBackOverall,
    },
    {
      id: 'postureHipsOverall' as keyof FormData,
      type: 'multiselect',
      label: ASSESSMENT_LABELS.P4.postureHipsOverall,
      tooltip: ASSESSMENT_TOOLTIPS.P4.postureHipsOverall,
      conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
      options: ASSESSMENT_OPTIONS.postureHipsOverall,
    },
    {
      id: 'postureKneesOverall' as keyof FormData,
      type: 'multiselect',
      label: ASSESSMENT_LABELS.P4.postureKneesOverall,
      tooltip: ASSESSMENT_TOOLTIPS.P4.postureKneesOverall,
      conditional: { showWhen: { field: 'postureInputMode', value: 'manual' } },
      options: ASSESSMENT_OPTIONS.postureKneesOverall,
    },
  ],
};
