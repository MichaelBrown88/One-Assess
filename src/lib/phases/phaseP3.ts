/**
 * Phase P3: Cardio Assessment
 */

import type { FormData } from '@/contexts/FormContext';
import type { PhaseDefinition, FieldType } from './types';
import {
  PHASE_TITLES,
  PHASE_SUMMARIES,
  PHASE_GATE_HINTS,
  ASSESSMENT_LABELS,
  ASSESSMENT_TOOLTIPS,
  SECTION_TITLES
} from '@/constants/assessment';

/**
 * Fitness capture: resting, peak, and recovery heart rate.
 * Rendered by CardioRunSheet (see SingleFieldFlow) with a short coach protocol
 * note. No in-app timers. `cardioTestSelected` is set to a default on complete
 * so legacy scoring paths that check for a protocol still work.
 */
export const phaseP3: PhaseDefinition = {
  id: 'P3',
  title: PHASE_TITLES.P3,
  summary: PHASE_SUMMARIES.P3,
  gateHint: PHASE_GATE_HINTS.P3,
  sections: [
    {
      id: 'fitness-assessment',
      title: SECTION_TITLES.P3['fitness-assessment'],
      fields: [
        {
          id: 'cardioRestingHr' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P3.cardioRestingHr,
          tooltip: ASSESSMENT_TOOLTIPS.P3.cardioRestingHr,
          required: true,
        },
        {
          id: 'cardioPeakHr' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P3.cardioPeakHr,
          tooltip: ASSESSMENT_TOOLTIPS.P3.cardioPeakHr,
          required: true,
        },
        {
          id: 'cardioPost1MinHr' as keyof FormData,
          type: 'number' as FieldType,
          label: ASSESSMENT_LABELS.P3.cardioPost1MinHr,
          tooltip: ASSESSMENT_TOOLTIPS.P3.cardioPost1MinHr,
          required: true,
        },
      ],
    },
  ],
};
