/**
 * Regression tests for the November 2026 scoring audit
 * (docs/superpowers/plans/2026-11-19-foolproof-one-assess.md, Tier 1).
 * Item numbers in test names refer to that plan.
 */
import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData } from '@/types/assessmentForm';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { calculateBodyFatFromMeasurements } from '@/lib/utils/measurementConverters';
import { estimateVo2maxUth } from '@/lib/cardio/vo2max';
import { calculateAge, lookupNormativeScore } from './scoringUtils';
import { scoreStrength } from './strengthScoring';
import { scoreCardio } from './cardioScoring';
import { scoreBodyComp } from './bodyCompositionScoring';
import { scoreLifestyle } from './lifestyleScoring';
import { MOVEMENT_PATTERN_SCORES, scoreMovementQuality } from './movementQualityScoring';
import { computeScores } from './computeScores';

const form = (o: Partial<FormData>): FormData => ({ ...initialFormData, ...o });
const detail = (c: { details: { id: string; score: number; value: string | number }[] }, id: string) =>
  c.details.find((d) => d.id === id);

describe('1.1 grip uses the hands actually tested', () => {
  it('one hand scores the same as both hands at that strength', () => {
    const one = scoreStrength(form({ gripRightKg: '44' }), 35, 'male');
    const both = scoreStrength(form({ gripLeftKg: '44', gripRightKg: '44' }), 35, 'male');
    expect(detail(one, 'grip')?.value).toBe(44);
    expect(detail(one, 'grip')?.score).toBe(detail(both, 'grip')?.score);
  });
});

describe('1.2 grip is scored against sex-specific norms (Dodds 2014)', () => {
  it('the same 33 kg grip is strong for a woman and weak for a man', () => {
    const woman = detail(scoreStrength(form({ gripRightKg: '33' }), 35, 'female'), 'grip')!.score;
    const man = detail(scoreStrength(form({ gripRightKg: '33' }), 35, 'male'), 'grip')!.score;
    expect(woman).toBeGreaterThanOrEqual(75);
    expect(man).toBeLessThan(50);
  });

  it('the young-adult peak mean scores 75 and the weak-grip cut-off scores 10', () => {
    expect(detail(scoreStrength(form({ gripRightKg: '51.9' }), 35, 'male'), 'grip')!.score).toBe(75);
    expect(detail(scoreStrength(form({ gripRightKg: '27' }), 35, 'male'), 'grip')!.score).toBe(10);
    expect(detail(scoreStrength(form({ gripRightKg: '16' }), 35, 'female'), 'grip')!.score).toBe(10);
  });
});

describe('1.12 age brackets clamp to the nearest bracket', () => {
  it('a 72-year-old man is judged on the 60-69 push-up norms, not 20-29', () => {
    // 10 reps: above the 60-69 average (8) but below the 20-29 poor line (16).
    expect(lookupNormativeScore('Push-up', 'male', 72, 10)).toBeGreaterThan(50);
  });

  it('no age means no age-normed score', () => {
    expect(lookupNormativeScore('Push-up', 'male', 0, 30)).toBe(0);
  });
});

describe('1.3 VO2max uses resting heart rate (Uth 2004)', () => {
  it('estimates from HRmax / resting HR', () => {
    // age 38: HRmax = 208 - 0.7*38 = 181.4; 15.3 * 181.4 / 62 = 44.8
    expect(estimateVo2maxUth(38, 62)).toBeCloseTo(44.8, 1);
    const cardio = scoreCardio(
      form({ cardioRestingHr: '62', cardioPeakHr: '150', cardioPost1MinHr: '118' }),
      38,
      'male',
    );
    expect(detail(cardio, 'vo2')?.value).toBe('44.8');
  });
});

describe('1.4 body fat is scored against age/sex healthy ranges (Gallagher 2000)', () => {
  const bf = (pct: string, age: number, sex: string) =>
    detail(scoreBodyComp(form({ inbodyWeightKg: '70', inbodyBodyFatPct: pct }), age, sex), 'bf')!.score;

  it('28% is healthy for a 35-year-old woman and obese for a 35-year-old man', () => {
    expect(bf('28', 35, 'female')).toBeGreaterThanOrEqual(75);
    expect(bf('28', 35, 'male')).toBeLessThan(50);
  });

  it('very low body fat is not scored as perfect', () => {
    expect(bf('5', 35, 'male')).toBeLessThan(100);
  });

  it('unknown sex leaves body fat unscored rather than guessed', () => {
    expect(bf('20', 35, 'any')).toBe(0);
  });
});

describe('1.5 muscle mass is scored against a sex-specific reference (Janssen 2000)', () => {
  const smm = (kg: string, weight: string, sex: string) =>
    detail(scoreBodyComp(form({ inbodyWeightKg: weight, skeletalMuscleMassKg: kg }), 35, sex), 'smm')!.score;

  it('low muscle for body weight scores low instead of near 100', () => {
    expect(smm('25', '90', 'male')).toBeLessThan(40);
  });

  it('31% body fat with average muscle no longer averages to a green 75', () => {
    const r = scoreBodyComp(
      form({ inbodyWeightKg: '81.2', skeletalMuscleMassKg: '31.5', inbodyBodyFatPct: '31.2' }),
      34,
      'male',
    );
    expect(r.score).toBeLessThan(60);
  });
});

describe('1.6 waist-to-hip uses WHO sex-specific cut-offs', () => {
  const whr = (v: string, sex: string) =>
    detail(scoreBodyComp(form({ inbodyBodyFatPct: '20', waistHipRatio: v }), 35, sex), 'whr')!.score;

  it('a WHR of 1.0 in a man is well past the risk line', () => {
    expect(whr('1.0', 'male')).toBeLessThanOrEqual(40);
  });

  it('0.88 is fine for a man but past the cut-off for a woman', () => {
    expect(whr('0.88', 'male')).toBeGreaterThan(whr('0.88', 'female'));
  });
});

describe('1.7 tape is progress-only and nothing is invented', () => {
  it('tape measurements alone do not score body composition', () => {
    const r = scoreBodyComp(
      form({ inbodyWeightKg: '85', heightCm: '180', waistCm: '95', hipsCm: '100', neckCm: '40', armLeftCm: '35', armRightCm: '35', chestCm: '100', thighLeftCm: '58', thighRightCm: '58' }),
      35,
      'male',
    );
    expect(r.assessed).toBe(false);
    expect(detail(r, 'visceral')?.value).toBe('-');
    expect(detail(r, 'smm')?.value).toBe('-');
    expect(detail(r, 'whr')?.value).toBe('-');
  });
});

describe('1.17 US Navy tape formula uses inches', () => {
  it('matches the metric Hodgdon & Beckett result for a man', () => {
    // 495 / (1.0324 - 0.19077*log10(88-40) + 0.15456*log10(180)) - 450 = 16.9
    expect(calculateBodyFatFromMeasurements(88, 40, 180, 'male')).toBeCloseTo(16.9, 0);
  });

  it('matches the metric result for a woman', () => {
    // 495 / (1.29579 - 0.35004*log10(75+100-33) + 0.22100*log10(165)) - 450 = 29.4
    expect(calculateBodyFatFromMeasurements(75, 33, 165, 'female', 100)).toBeCloseTo(29.5, 0);
  });
});

describe('1.8 unmeasured items are never weaknesses or advice', () => {
  it('body comp only names measured items', () => {
    const r = scoreBodyComp(form({ inbodyWeightKg: '80', inbodyBodyFatPct: '30' }), 35, 'male');
    expect(r.weaknesses.join(' ')).not.toMatch(/visceral|waist|muscle/i);
  });

  it('lifestyle only names answered habits and gives no steps advice without steps', () => {
    const r = scoreLifestyle(form({ activityLevel: 'moderately-active' }), 35, 'male');
    expect(r.weaknesses.join(' ')).not.toMatch(/sleep|stress|hydration|nutrition/i);
    expect(r.lifestyleAdvice ?? []).toHaveLength(0);
  });

  it('a measured score of zero still counts in the average', () => {
    const r = scoreBodyComp(form({ inbodyBodyFatPct: '20', visceralFatLevel: '30' }), 35, 'male');
    const bfScore = detail(r, 'bf')!.score;
    const visceral = detail(r, 'visceral')!.score;
    expect(r.score).toBe(Math.round((bfScore + visceral) / 2));
  });
});

describe('1.9 missing posture findings are not averaged in as perfect', () => {
  it('moderate forward head alone scores 50, not 75', () => {
    const r = scoreMovementQuality(
      form({ postureAiResults: { 'side-right': { forward_head: { status: 'Moderate' } } } as unknown as FormData['postureAiResults'] }),
      30,
      'male',
    );
    expect(r.score).toBe(50);
  });
});

describe('1.10 every movement option has a score', () => {
  const fields = ['ohsShoulderMobility', 'ohsTorsoLean', 'ohsSquatDepth', 'ohsHipShift', 'ohsKneeAlignment', 'ohsFeetPosition', 'hingeDepth', 'hingeBackRounding', 'lungeBalance', 'lungeKneeAlignment', 'lungeHipShift'] as const;
  it.each(fields)('%s', (field) => {
    for (const opt of ASSESSMENT_OPTIONS[field]) {
      expect(MOVEMENT_PATTERN_SCORES[opt.value], `${field}=${opt.value}`).toBeGreaterThan(0);
    }
  });

  it('a lunge torso shift lowers the lunge score', () => {
    const clean = scoreMovementQuality(form({ lungeLeftTorso: 'neutral', lungeRightTorso: 'neutral' }), 30, 'male');
    const shift = scoreMovementQuality(form({ lungeLeftTorso: 'shifts-left', lungeRightTorso: 'neutral' }), 30, 'male');
    expect(shift.score).toBeLessThan(clean.score);
  });
});

describe('1.11 mobility inferred from the squat is not counted twice', () => {
  it('a knee cave-in is not offset by an inferred "good mobility" score', () => {
    const r = scoreMovementQuality(
      form({ ohsShoulderMobility: 'full-range', ohsTorsoLean: 'upright', ohsSquatDepth: 'full-depth', ohsHipShift: 'none', ohsKneeAlignment: 'valgus', ohsFeetPosition: 'stable' }),
      30,
      'male',
    );
    expect(detail(r, 'mobility')?.score).toBe(0);
    expect(r.score).toBe(40); // worst fault: knees cave in (valgus = 40)
  });
});

describe('each movement pattern scores as its worst fault', () => {
  it('a quarter-depth squat with forward lean is not diluted by the checks that looked fine', () => {
    const r = scoreMovementQuality(
      form({ ohsShoulderMobility: 'full-range', ohsTorsoLean: 'excessive-lean', ohsSquatDepth: 'quarter-depth', ohsHipShift: 'none', ohsKneeAlignment: 'stable', ohsFeetPosition: 'stable' }),
      30,
      'male',
    );
    expect(detail(r, 'movement')?.score).toBe(30);
  });

  it('patterns that all looked good still score 100, and patterns are averaged with each other', () => {
    const r = scoreMovementQuality(
      form({ hingeDepth: 'excellent', hingeBackRounding: 'none', lungeLeftBalance: 'excellent', lungeRightBalance: 'fair' }),
      30,
      'male',
    );
    // hinge 100, lunge worst = fair 60 → (100 + 60) / 2
    expect(detail(r, 'movement')?.score).toBe(80);
  });
});

describe('1.13 push-ups are scored only against a matching table', () => {
  const push = (sex: string, type: string) =>
    detail(scoreStrength(form({ pushupsOneMinuteReps: '15', pushupType: type }), 35, sex), 'pushups')!.score;

  it('women on knees and men on toes are scored', () => {
    expect(push('female', 'knees')).toBeGreaterThan(0);
    expect(push('male', 'full')).toBeGreaterThan(0);
  });

  it('older assessments without a type keep scoring (men toes, women knees)', () => {
    expect(push('female', '')).toBe(push('female', 'knees'));
    expect(push('male', '')).toBe(push('male', 'full'));
  });

  it('combinations with no published norms are recorded but not scored', () => {
    const r = scoreStrength(form({ pushupsOneMinuteReps: '15', pushupType: 'full', squatsOneMinuteReps: '30' }), 35, 'female');
    expect(detail(r, 'pushups')?.value).toBe(15);
    expect(detail(r, 'pushups')?.score).toBe(0);
    expect(r.score).toBe(75); // squats only: 30 x 2.5
    expect(push('male', 'knees')).toBe(0);
  });
});

describe('1.14 age is taken at the assessment date', () => {
  it('calculateAge accepts a reference date', () => {
    expect(calculateAge('1990-06-01', '2026-05-31')).toBe(35);
    expect(calculateAge('1990-06-01', '2026-06-01')).toBe(36);
  });

  it('computeScores uses assessedAt when present', () => {
    const f = form({ dateOfBirth: '1960-01-01', gender: 'male', pushupsOneMinuteReps: '10', assessedAt: '2015-06-01' });
    const atAssessment = computeScores(f).categories.find((c) => c.id === 'strength')!.score;
    // Aged 55 at assessment: 50-59 norms (average 10) → 50.
    expect(atAssessment).toBe(50);
  });
});
