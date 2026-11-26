/**
 * Phase P2: Body Composition — private-room block last in the studio flow.
 * InBody results (always visible) → tape → posture photos.
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
  SECTION_TITLES
} from '@/constants/assessment';
import { posturePhotoSection } from './posturePhotoSection';

export const phaseP2: PhaseDefinition = {
  id: 'P2',
  title: PHASE_TITLES.P2,
  summary: PHASE_SUMMARIES.P2,
  gateHint: PHASE_GATE_HINTS.P2,
  sections: [
    {
      id: 'inbody-results',
      title: SECTION_TITLES.P2['inbody-results'],
      fields: [
        { id: 'heightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.heightCm, required: true, pairId: 'height-weight', placeholder: ASSESSMENT_PLACEHOLDERS.P2.heightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.heightCm },
        { id: 'inbodyWeightKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.inbodyWeightKg, required: true, pairId: 'height-weight', placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyWeightKg, tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyWeightKg },
        { id: 'skeletalMuscleMassKg' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.skeletalMuscleMassKg, required: true, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.skeletalMuscleMassKg, tooltip: ASSESSMENT_TOOLTIPS.P2.skeletalMuscleMassKg },
        { id: 'inbodyBodyFatPct' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.inbodyBodyFatPct, required: true, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.inbodyBodyFatPct, tooltip: ASSESSMENT_TOOLTIPS.P2.inbodyBodyFatPct },
        { id: 'waistHipRatio' as keyof FormData, type: 'number' as FieldType, label: `${ASSESSMENT_LABELS.P2.waistHipRatio} (optional)`, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.waistHipRatio, tooltip: ASSESSMENT_TOOLTIPS.P2.waistHipRatio },
        { id: 'visceralFatLevel' as keyof FormData, type: 'number' as FieldType, label: `${ASSESSMENT_LABELS.P2.visceralFatLevel} (optional)`, pairId: 'analyzer-confirm', placeholder: ASSESSMENT_PLACEHOLDERS.P2.visceralFatLevel, tooltip: ASSESSMENT_TOOLTIPS.P2.visceralFatLevel },
      ],
    },
    {
      id: 'tape-measurements',
      title: SECTION_TITLES.P2['tape-measurements'],
      fields: [
        { id: 'shouldersCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.shouldersCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.shouldersCm, tooltip: ASSESSMENT_TOOLTIPS.P2.shouldersCm },
        { id: 'chestCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.chestCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.chestCm, tooltip: ASSESSMENT_TOOLTIPS.P2.chestCm },
        { id: 'armLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.armLeftCm, required: true, side: 'left', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.armLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.armLeftCm },
        { id: 'armRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.armRightCm, required: true, side: 'right', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.armRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.armRightCm },
        { id: 'waistCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.waistCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.waistCm, tooltip: ASSESSMENT_TOOLTIPS.P2.waistCm },
        { id: 'hipsCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.hipsCm, required: true, pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.hipsCm, tooltip: ASSESSMENT_TOOLTIPS.P2.hipsCm },
        { id: 'thighLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.thighLeftCm, required: true, side: 'left', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.thighLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.thighLeftCm },
        { id: 'thighRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.thighRightCm, required: true, side: 'right', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.thighRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.thighRightCm },
        { id: 'calfLeftCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.calfLeftCm, required: true, side: 'left', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.calfLeftCm, tooltip: ASSESSMENT_TOOLTIPS.P2.calfLeftCm },
        { id: 'calfRightCm' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P2.calfRightCm, required: true, side: 'right', pairId: 'tape-measurements', placeholder: ASSESSMENT_PLACEHOLDERS.P2.calfRightCm, tooltip: ASSESSMENT_TOOLTIPS.P2.calfRightCm },
      ],
    },
    posturePhotoSection,
  ],
};
