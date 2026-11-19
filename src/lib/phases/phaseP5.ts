/**
 * Phase P5: Strength Assessment
 */

import type { FormData } from '@/contexts/FormContext';
import type { PhaseDefinition, FieldType } from './types';
import {
  PHASE_TITLES,
  PHASE_SUMMARIES,
  PHASE_GATE_HINTS,
  ASSESSMENT_LABELS,
  ASSESSMENT_TOOLTIPS,
  ASSESSMENT_PLACEHOLDERS,
  ASSESSMENT_OPTIONS,
  SECTION_TITLES
} from '@/constants/assessment';

export const phaseP5: PhaseDefinition = {
  id: 'P5',
  title: PHASE_TITLES.P5,
  summary: PHASE_SUMMARIES.P5,
  gateHint: PHASE_GATE_HINTS.P5,
  sections: [
    {
      id: 'strength-endurance',
      title: SECTION_TITLES.P5['strength-endurance'],
      fields: [
        // Bodyweight endurance — one card so the coach records the whole circuit in place
        { id: 'pushupsOneMinuteReps' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.pushupsOneMinuteReps, pairId: 'strength-endurance', placeholder: ASSESSMENT_PLACEHOLDERS.P5.pushupsOneMinuteReps, tooltip: ASSESSMENT_TOOLTIPS.P5.pushupsOneMinuteReps },
        { id: 'pushupType' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P5.pushupType, pairId: 'strength-endurance', skippable: true, tooltip: ASSESSMENT_TOOLTIPS.P5.pushupType, options: ASSESSMENT_OPTIONS.pushupType },
        { id: 'plankDurationSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.plankDurationSeconds, pairId: 'strength-endurance', placeholder: ASSESSMENT_PLACEHOLDERS.P5.plankDurationSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.plankDurationSeconds },
        // Lower body: 30-second single-leg sit-to-stand, both legs on one screen.
        // Average = lower-body strength; left vs right = imbalance check.
        { id: 'singleLegStandLeftReps' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.singleLegStandLeftReps, pattern: 'Single-leg sit-to-stand', side: 'left', pairId: 'single-leg-sts', placeholder: ASSESSMENT_PLACEHOLDERS.P5.singleLegStandLeftReps, tooltip: ASSESSMENT_TOOLTIPS.P5.singleLegStandLeftReps },
        { id: 'singleLegStandRightReps' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.singleLegStandRightReps, pattern: 'Single-leg sit-to-stand', side: 'right', pairId: 'single-leg-sts', placeholder: ASSESSMENT_PLACEHOLDERS.P5.singleLegStandRightReps, tooltip: ASSESSMENT_TOOLTIPS.P5.singleLegStandRightReps },
        // Grip Strength - Test Method Selection
        { id: 'gripTestMethod' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P5.gripTestMethod, pattern: 'Grip Strength', tooltip: ASSESSMENT_TOOLTIPS.P5.gripTestMethod, options: ASSESSMENT_OPTIONS.gripTestMethod },
        // Grip Strength - Dynamometer
        { id: 'gripLeftKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripLeftKg, pattern: 'Grip Strength', side: 'left', pairId: 'grip-strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripLeftKg, tooltip: ASSESSMENT_TOOLTIPS.P5.gripLeftKg },
        { id: 'gripRightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripRightKg, pattern: 'Grip Strength', side: 'right', pairId: 'grip-strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripRightKg, tooltip: ASSESSMENT_TOOLTIPS.P5.gripRightKg },
        // Grip Strength - Dead Hang
        { id: 'gripDeadhangSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripDeadhangSeconds, pattern: 'Grip Strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripDeadhangSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.gripDeadhangSeconds },
        // Grip Strength - Plate Pinch
        { id: 'gripPlatePinchSeconds' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P5.gripPlatePinchSeconds, pattern: 'Grip Strength', placeholder: ASSESSMENT_PLACEHOLDERS.P5.gripPlatePinchSeconds, tooltip: ASSESSMENT_TOOLTIPS.P5.gripPlatePinchSeconds },
      ]
    },
  ],
};
