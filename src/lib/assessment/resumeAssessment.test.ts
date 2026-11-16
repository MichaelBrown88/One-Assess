import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';
import { getInitialFormDataFromSession } from '@/contexts/form/initialFormFromSession';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { readSavedAssessmentPhaseId, isAssessmentSetupConfirmedInSession } from './assessmentSessionStorage';
import { hasActiveBaselineSession } from './baselineSession';
import { prepareAssessmentResume } from './resumeAssessment';

beforeEach(() => sessionStorage.clear());
describe('resume across clients and fresh form mounts', () => {
  it('clears conflicting edit, partial, demo and prefill state before restoring all answers', () => {
    sessionStorage.setItem(STORAGE_KEYS.EDIT_ASSESSMENT, JSON.stringify({formData:{fullName:'Another Client'}}));
    sessionStorage.setItem(STORAGE_KEYS.PARTIAL_ASSESSMENT, JSON.stringify({category:'strength',clientName:'Another Client'}));
    sessionStorage.setItem(STORAGE_KEYS.IS_DEMO, 'true');
    const formData = { ...createEmptyAssessmentForm(), fullName: 'Saved Client', cardioRestingHr: '65', clientGoals: ['build-muscle'], postureImagesStorage: {front:'https://example.com/photo.jpg'} };
    prepareAssessmentResume({formData,activePhaseId:'P2',activePhaseIdx:5});
    const restored = getInitialFormDataFromSession(createEmptyAssessmentForm());
    expect(restored.fullName).toBe('Saved Client');
    expect(restored.cardioRestingHr).toBe('65');
    expect(restored.postureImagesStorage).toEqual(formData.postureImagesStorage);
    expect(restored.clientGoals).toEqual(formData.clientGoals);
    expect(restored.assessmentPlan?.includedPhaseIds).toEqual(['P0','P1','P3','P4','P5','P2','P7']);
    expect(sessionStorage.getItem(STORAGE_KEYS.EDIT_ASSESSMENT)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.PARTIAL_ASSESSMENT)).toBeNull();
    expect(hasActiveBaselineSession()).toBe(true);
    expect(isAssessmentSetupConfirmedInSession()).toBe(true);
    expect(readSavedAssessmentPhaseId()).toBe('P2');
  });
  it('does not restore Results or the legacy empty phase', () => {
    for (const phase of ['P7','empty']) {
      prepareAssessmentResume({formData:{...createEmptyAssessmentForm(),fullName:'Saved Client'},activePhaseId:phase,activePhaseIdx:5});
      expect(readSavedAssessmentPhaseId()).toBeNull();
    }
  });
});
