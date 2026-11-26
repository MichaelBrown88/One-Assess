import { completeBaseline } from '@/test/fixtures/completeBaseline';
import { describe, it, expect } from 'vitest';
import type { FormData } from '@/contexts/FormContext';
import {
  filterPhasesForStudioBaseline,
  isRemoteIntakeFormComplete,
  shouldShowRemoteIntakeReview,
  shouldShowStudioIntakeReview,
  sortStudioPhaseIds,
} from './studioSessionSteps';

const completeIntake = completeBaseline();

describe('studioSessionSteps', () => {
  it('sortStudioPhaseIds orders studio baseline phases (fitness first, private room last)', () => {
    expect(sortStudioPhaseIds(['P7', 'P3', 'P0', 'P2'])).toEqual(['P0', 'P3', 'P2', 'P7']);
    expect(sortStudioPhaseIds(['P2', 'P4', 'P5', 'P3'])).toEqual(['P3', 'P4', 'P5', 'P2']);
  });

  it('isRemoteIntakeFormComplete requires core intake fields', () => {
    expect(isRemoteIntakeFormComplete({} as FormData)).toBe(false);
    expect(isRemoteIntakeFormComplete(completeIntake)).toBe(true);
  });

  it('shouldShowStudioIntakeReview only for partial remote pre-assessment', () => {
    expect(
      shouldShowStudioIntakeReview({ fullName: 'Jane' } as FormData, true),
    ).toBe(true);
    expect(shouldShowStudioIntakeReview(completeIntake, true)).toBe(false);
    expect(shouldShowStudioIntakeReview({} as FormData, false)).toBe(false);
  });

  it('shouldShowRemoteIntakeReview is false for empty walk-in form', () => {
    expect(shouldShowRemoteIntakeReview({} as FormData, false)).toBe(false);
    expect(shouldShowRemoteIntakeReview(completeIntake, true)).toBe(true);
  });

  it('filterPhasesForStudioBaseline keeps P0/P1 for studio walk-in', () => {
    const ids = filterPhasesForStudioBaseline(
      ['P0', 'P1', 'P2', 'P3', 'P5', 'P4', 'P7'],
      false,
    );
    expect(ids).toContain('P0');
    expect(ids).toContain('P1');
  });

  it('filterPhasesForStudioBaseline keeps P0/P1 in studio once the coach has answered the intake fields', () => {
    // Regression: answering activity level in studio used to make the intake look
    // "remote complete", dropping P0/P1 mid-flow and skipping lifestyle + goals.
    const ids = filterPhasesForStudioBaseline(
      ['P0', 'P1', 'P2', 'P3', 'P5', 'P4', 'P7'],
      false,
    );
    expect(ids.slice(0, 2)).toEqual(['P0', 'P1']);
  });

  it('filterPhasesForStudioBaseline drops P0/P1 when remote intake complete', () => {
    const ids = filterPhasesForStudioBaseline(
      ['P0', 'P1', 'P2', 'P3', 'P5', 'P4', 'P7'],
      true,
    );
    expect(ids).not.toContain('P0');
    expect(ids).not.toContain('P1');
    expect(ids[0]).toBe('P3');
  });
});
