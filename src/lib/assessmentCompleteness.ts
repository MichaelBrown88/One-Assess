import { missingBaselineSections } from './assessment/baselineReadiness';
import { numericIssues } from './assessment/numericValidation';
/**
 * Assessment completeness rules.
 * Single source of truth for whether an assessment is complete enough to update the live report.
 */

import type { FormData } from '@/contexts/FormContext';
import { calculateAge } from './scoring/scoringUtils';
import { scoreBodyComp } from './scoring/bodyCompositionScoring';
import { scoreCardio } from './scoring/cardioScoring';
import { scoreStrength } from './scoring/strengthScoring';
import { scoreMovementQuality } from './scoring/movementQualityScoring';
import { scoreLifestyle } from './scoring/lifestyleScoring';

export type AssessmentMode = 'full' | 'partial';

export type PartialCategory = 'bodycomp' | 'posture' | 'fitness' | 'strength' | 'lifestyle';

const SCORE_CATEGORY_IDS: Record<PartialCategory, string> = {
  bodycomp: 'bodyComp',
  posture: 'movementQuality',
  fitness: 'cardio',
  strength: 'strength',
  lifestyle: 'lifestyle',
};

function hasClientName(form: FormData): boolean {
  const name = (form.fullName ?? '').trim();
  return name.length > 0;
}

function getPillarScore(
  form: FormData,
  categoryId: string,
  age: number,
  gender: string
): boolean {
  switch (categoryId) {
    case 'bodyComp':
      return scoreBodyComp(form, age, gender).assessed;
    case 'cardio':
      return scoreCardio(form, age, gender).assessed;
    case 'strength':
      return scoreStrength(form, age, gender).assessed;
    case 'movementQuality':
      return scoreMovementQuality(form, age, gender).assessed;
    case 'lifestyle':
      return scoreLifestyle(form, age, gender).assessed;
    default:
      return false;
  }
}

/**
 * Returns true if the assessment has enough data to finalize (update live report).
 * - full: all baseline sections have captured data, including measured zeros.
 * - partial: the given category has data and client name is set.
 */
export function isAssessmentComplete(
  formData: FormData,
  mode: AssessmentMode,
  partialCategory?: PartialCategory
): boolean {
  if (!hasClientName(formData) || numericIssues(formData).length > 0) return false;

  const age = calculateAge(formData.dateOfBirth);
  const gender = (formData.gender || 'any').toLowerCase();

  if (mode === 'partial' && partialCategory) {
    const categoryId = SCORE_CATEGORY_IDS[partialCategory];
    const score = getPillarScore(formData, categoryId, age, gender);
    return score;
  }

  if (mode === 'full') {
    return missingBaselineSections(formData).length === 0;
  }

  return false;
}
