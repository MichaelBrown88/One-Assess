import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/assessmentForm';
import { readLowerBody, scoreSingleLegSitToStand } from './lowerBody';
import { scorePlankStrand, scoreStrength } from './strengthScoring';

const form = (o: Partial<FormData>): FormData => ({ ...initialFormData, ...o });

describe('readLowerBody', () => {
  it('averages the two legs of the single-leg test', () => {
    expect(readLowerBody(form({ singleLegStandLeftReps: '12', singleLegStandRightReps: '15' }))).toEqual({
      reps: 13.5, protocol: 'single-leg-sts-30sec', leftReps: 12, rightReps: 15,
    });
  });

  it('prefers the single-leg test over legacy squats', () => {
    expect(readLowerBody(form({ singleLegStandLeftReps: '10', singleLegStandRightReps: '10', squatsOneMinuteReps: '40' }))?.protocol).toBe('single-leg-sts-30sec');
  });

  it('still reads one-minute squats on older assessments', () => {
    expect(readLowerBody(form({ squatsOneMinuteReps: '40' }))).toEqual({ reps: 40, protocol: 'squats-60sec', leftReps: null, rightReps: null });
  });

  it('keeps a recorded 0 as a real result', () => {
    expect(readLowerBody(form({ singleLegStandLeftReps: '0', singleLegStandRightReps: '0' }))?.reps).toBe(0);
    expect(readLowerBody(form({}))).toBeNull();
  });
});

describe('scoreSingleLegSitToStand (provisional)', () => {
  it('scores the band points for a man under 40', () => {
    expect(scoreSingleLegSitToStand(8, 35, 'male')).toBe(50);
    expect(scoreSingleLegSitToStand(12, 35, 'male')).toBe(75);
    expect(scoreSingleLegSitToStand(16, 35, 'male')).toBe(100);
  });

  it('adjusts for sex and age', () => {
    expect(scoreSingleLegSitToStand(11, 35, 'female')).toBe(75);
    expect(scoreSingleLegSitToStand(10, 50, 'male')).toBe(75);
    expect(scoreSingleLegSitToStand(8, 65, 'male')).toBe(75);
  });

  it('scores 0 reps as 10 and needs age and sex', () => {
    expect(scoreSingleLegSitToStand(0, 35, 'male')).toBe(10);
    expect(scoreSingleLegSitToStand(10, 0, 'male')).toBeNull();
    expect(scoreSingleLegSitToStand(10, 35, 'any')).toBeNull();
  });
});

describe('strength pillar uses the single-leg test', () => {
  it('scores lower body from the average of both legs', () => {
    const r = scoreStrength(form({ singleLegStandLeftReps: '12', singleLegStandRightReps: '12' }), 35, 'male');
    expect(r.details.find((d) => d.id === 'singleLeg')).toMatchObject({ value: 12, score: 75 });
    expect(r.details.some((d) => d.id === 'squats')).toBe(false);
    expect(r.score).toBe(75);
  });

  it('flags a leg imbalance of 10% or more on the weaker side', () => {
    const r = scoreStrength(form({ singleLegStandLeftReps: '12', singleLegStandRightReps: '15' }), 35, 'male');
    expect(r.weaknesses.join(' ')).toMatch(/left leg.*20% fewer/i);
  });

  it('keeps scoring legacy squats the old way', () => {
    const r = scoreStrength(form({ squatsOneMinuteReps: '30' }), 35, 'male');
    expect(r.details.find((d) => d.id === 'squats')?.score).toBe(75);
  });
});

describe('plank scored on Strand 2014 (non-athlete percentiles, 3-minute cap)', () => {
  it('maps printed percentiles to the same score', () => {
    expect(scorePlankStrand(103, 'male')).toBe(50);
    expect(scorePlankStrand(70, 'female')).toBe(50);
    expect(scorePlankStrand(189, 'male')).toBe(88); // capped at 180 s
    expect(scorePlankStrand(130, 'female')).toBe(90);
  });

  it('caps at 3 minutes and needs sex', () => {
    expect(scorePlankStrand(400, 'female')).toBe(100);
    expect(scorePlankStrand(400, 'male')).toBe(scorePlankStrand(180, 'male'));
    expect(scorePlankStrand(60, 'any')).toBeNull();
    expect(scorePlankStrand(0, 'male')).toBe(0);
  });

  it('is used by the strength pillar without an age adjustment', () => {
    const young = scoreStrength(form({ plankDurationSeconds: '103' }), 25, 'male');
    const older = scoreStrength(form({ plankDurationSeconds: '103' }), 65, 'male');
    expect(young.details.find((d) => d.id === 'plank')?.score).toBe(50);
    expect(older.details.find((d) => d.id === 'plank')?.score).toBe(50);
  });
});
