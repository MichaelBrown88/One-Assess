/**
 * Physiological progression rates.
 *
 * Pure functions that encode evidence-based rates of change for the
 * dimensions ARC™ milestones and coach notes care about: weight loss,
 * muscle gain, VO₂max, strength, posture/mobility correction, behaviour.
 *
 * Each function takes a `ClientProfile` (what we know about the
 * person + how often they train + their experience) and a goal-specific
 * input, and returns a realistic rate + duration estimate.
 *
 * Numbers come from ISSN sport-nutrition guidelines, Helms et al. on
 * lean-mass preservation, ACSM cardio response curves, and standard
 * corrective-exercise literature. They're starting priors — the
 * feedback loop will calibrate them once we collect outcome data.
 *
 * NB: this module has zero React / Firestore dependencies. Easy to
 * unit-test, easy to call from any layer.
 */

// ─── Client profile ──────────────────────────────────────────────────

export type Sex = 'male' | 'female' | 'unknown';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';

export interface ClientProfile {
  /** Sex — affects muscle gain rate, recovery, BF% targets. */
  sex: Sex;
  /** Age in years — affects every rate (recovery + cardiovascular response). */
  age: number;
  /** Body weight in kg — scales muscle-gain rate vs an 80 kg baseline. */
  bodyWeightKg: number;
  /** Height in cm — used to floor weight-loss projections at a healthy BMI. */
  heightCm?: number;
  /** Body-fat % when known — gates how aggressive weight loss can be. */
  bodyFatPct?: number;
  /** Self-reported training experience tier. */
  trainingExperience: TrainingExperience;
  /** Sessions per week the client commits to. 0 means none. */
  trainingFrequency: number;
  /** Sleep quality 0-100 (from lifestyle scoring). Low sleep cuts rates. */
  sleepScore?: number;
  /** Stress level 0-100. High stress cuts rates. */
  stressScore?: number;
}

// ─── Confidence tag carried with every prediction ────────────────────

export type Confidence = 'high' | 'medium' | 'low';

interface RateResult {
  /** Rate of change in the relevant unit (e.g., kg/week, %/month). */
  rate: number;
  /** Estimated weeks to cover the requested change at this rate. */
  weeks: number;
  /** Our confidence in the prediction given how complete the profile is. */
  confidence: Confidence;
  /** Coach-readable note explaining the calculation. */
  note: string;
}

// ─── Modulators ──────────────────────────────────────────────────────

/** Hard ceiling for any cut (Helms 2014: 0.5–1% body weight/week). */
export const FAT_LOSS_MAX_BODYWEIGHT_FRACTION_PER_WEEK = 0.01;

/** Aragon beginner ceiling: ~1–1.5% body weight a month. Best-case weeks never exceed it. */
export const MUSCLE_GAIN_MAX_BODYWEIGHT_FRACTION_PER_MONTH = 0.015;

/**
 * Frequency multiplier — strength and cardio response when the client
 * trains more often. Caps because recovery becomes the limiter.
 */
function frequencyMultiplier(freq: number): number {
  if (freq <= 0) return 0;        // No training = no progression
  if (freq === 1) return 0.7;
  if (freq === 2) return 1.0;     // baseline
  if (freq === 3) return 1.3;
  if (freq === 4) return 1.5;
  return 1.6;                     // 5+ sessions: diminishing returns
}

/** Conservative planning adjustment for additional practice, not a measured dose-response. */
export function trainingDoseVsThree(sessions: number): number {
  if (sessions >= 5) return 1.15;
  if (sessions >= 4) return 1.1;
  return 1;
}

/** Planning prior: modest additional activity, with the same diet; not a session sales comparison. */
export function weeklyWeightLossForSessions(liftingSessions: number): number {
  if (liftingSessions >= 5) return 0.4;
  if (liftingSessions >= 4) return 0.35;
  return 0.3;
}

/** Conservative novice planning prior. Frequency alone does not establish extra hypertrophy.
 * Frequency evidence: https://pubmed.ncbi.nlm.nih.gov/30558493/.
 * Individual kg outcomes are uncertain; do not label this an evidence-derived prediction interval.
 */
export function weeklyMuscleGainForSessions(sessionsPerWeek: number): number {
  if (sessionsPerWeek >= 5) return 0.1;
  if (sessionsPerWeek >= 4) return 0.1;
  if (sessionsPerWeek >= 3) return 0.1;
  if (sessionsPerWeek >= 1) return 0.05;
  return 0;
}

/** Leaner clients cut slower to protect muscle. */
function leanCutFactor(sex: Sex, bodyFatPct: number | undefined): number {
  if (bodyFatPct == null) return 1;
  const offset = sex === 'female' ? 8 : 0;
  if (bodyFatPct >= 20 + offset) return 1;
  if (bodyFatPct >= 12 + offset) return 0.8;
  return 0.6;
}

/**
 * Experience multiplier — applies to gains-of-mass and gains-of-strength.
 * Novices respond quickly; advanced trainees barely move.
 */
function experienceMultiplier(exp: TrainingExperience): number {
  if (exp === 'beginner') return 1.0;
  if (exp === 'intermediate') return 0.55;
  return 0.25;
}

/**
 * Age multiplier on rate of change. Younger = faster recovery + response.
 */
function ageMultiplier(age: number): number {
  if (age < 30) return 1.0;
  if (age < 45) return 0.95;
  if (age < 60) return 0.85;
  return 0.75;
}

/**
 * Lifestyle drag — poor sleep / high stress cut every rate.
 */
function lifestyleMultiplier(profile: ClientProfile): number {
  let factor = 1;
  if (profile.sleepScore != null && profile.sleepScore < 50) factor *= 0.80;
  else if (profile.sleepScore != null && profile.sleepScore < 70) factor *= 0.92;
  if (profile.stressScore != null && profile.stressScore < 40) factor *= 0.85;
  else if (profile.stressScore != null && profile.stressScore < 60) factor *= 0.92;
  return factor;
}

/**
 * Recovery reflects the captured lifestyle at every training frequency.
 * Scheduling an extra visit does not establish improved sleep or stress.
 */
export function lifestyleFactorForSessions(profile: ClientProfile, _sessions: number): number {
  return lifestyleMultiplier(profile);
}

function confidenceFromProfile(profile: ClientProfile): Confidence {
  let score = 0;
  if (profile.bodyFatPct != null) score++;
  if (profile.trainingFrequency > 0) score++;
  if (profile.trainingExperience) score++;
  if (profile.sleepScore != null) score++;
  if (profile.stressScore != null) score++;
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

// ─── Weight loss ─────────────────────────────────────────────────────

/**
 * Conservative weight-loss planning prior, slower when
 * already lean, never above 1% of body weight a week.
 *
 * Refs: Helms et al. 2014, ISSN sport nutrition position stand 2017.
 */
export function weeklyWeightLossKg(
  profile: ClientProfile,
  targetLossKg: number,
  opts: { liftingSessions?: number } = {},
): RateResult {
  const bw = profile.bodyWeightKg;
  const bf = profile.bodyFatPct;
  const sessions = opts.liftingSessions ?? 3;
  const perWeek = weeklyWeightLossForSessions(sessions) * leanCutFactor(profile.sex, bf) * lifestyleMultiplier(profile);
  const ceiling = bw > 0 ? bw * FAT_LOSS_MAX_BODYWEIGHT_FRACTION_PER_WEEK : Infinity;
  // Round down so the 1%-a-week ceiling is never exceeded by rounding.
  const ratePerWeek = Math.floor(Math.min(perWeek, ceiling) * 100 + 1e-9) / 100;
  const weeks = ratePerWeek > 0 ? Math.ceil(targetLossKg / ratePerWeek) : Infinity;

  return {
    rate: round(ratePerWeek, 2),
    weeks,
    confidence: confidenceFromProfile(profile),
    note: `${round(ratePerWeek, 2)} kg/week sustainable loss for a ${bw}kg client at ${
      bf != null ? `${bf}% BF` : 'unknown BF%'
    }.`,
  };
}

// ─── Muscle gain ─────────────────────────────────────────────────────

/**
 * Monthly muscle-gain planning rate in kg (4 weeks). Female rate ≈ half male;
 * experience and age 45+ slow it. Overweight beginners build muscle in a
 * deficit; this model halves the planning rate throughout a cut.
 *
 * Refs: McDonald genetic potential model; Schoenfeld hypertrophy reviews.
 */
/**
 * Smallest monthly gain shown when building muscle is a stated goal (4-week month, 3 sessions,
 * scaled up with the training dose). Advanced lifters and older women still gain ~0.1 kg a
 * month; printing 0.0 would tell a client who asked for muscle that they can't build any.
 */
const GOAL_MIN_MUSCLE_KG_PER_MONTH = 0.1;

export function monthlyMuscleGainKg(
  profile: ClientProfile,
  opts: { concurrentFatLoss?: boolean; muscleGoal?: boolean } = {},
): RateResult {
  const expMul = experienceMultiplier(profile.trainingExperience);
  const sexMul = profile.sex === 'female' ? 0.5 : 1;
  const ageMul = profile.age >= 45 ? ageMultiplier(profile.age) : 1;
  const weekly = weeklyMuscleGainForSessions(profile.trainingFrequency) * expMul * sexMul * ageMul;
  const ceiling = profile.bodyWeightKg * MUSCLE_GAIN_MAX_BODYWEIGHT_FRACTION_PER_MONTH * expMul * sexMul;
  let rate = Math.min(weekly * 4, ceiling) * lifestyleMultiplier(profile);

  if (opts.concurrentFatLoss) {
    rate *= 0.5;
  }

  if (opts.muscleGoal && profile.trainingFrequency >= 3) {
    rate = Math.max(rate, GOAL_MIN_MUSCLE_KG_PER_MONTH * trainingDoseVsThree(profile.trainingFrequency));
  }

  return {
    rate: round(rate, 2),
    weeks: 0, // muscle gain duration is usually goal-driven externally
    confidence: confidenceFromProfile(profile),
    note: `${round(rate, 2)} kg/month projected muscle gain — ${
      profile.trainingExperience
    } trainee, ${profile.trainingFrequency}x/week${opts.concurrentFatLoss ? ', concurrent fat loss' : ''}.`,
  };
}

// ─── VO₂max ──────────────────────────────────────────────────────────

/**
 * Realistic VO₂max delta over an 8-week block. Newcomers see 10-25%;
 * trained athletes see 5-10%. Approaches age-percentile ceiling.
 *
 * Refs: ACSM Position Stand on Aerobic Training 2011.
 */
export function vo2max8WeekGainPct(profile: ClientProfile, currentVo2: number): RateResult {
  const isFemale = profile.sex === 'female';
  // Rough age-percentile ceilings (approximations; replace with norm tables).
  const ceiling = isFemale ? 50 - (profile.age - 30) * 0.4 : 60 - (profile.age - 30) * 0.4;
  const headroom = Math.max(0.05, (ceiling - currentVo2) / ceiling);

  const expMul = profile.trainingExperience === 'beginner' ? 1.0 : profile.trainingExperience === 'intermediate' ? 0.6 : 0.35;
  const freqMul = frequencyMultiplier(profile.trainingFrequency);
  const lifestyle = lifestyleMultiplier(profile);

  // 15% baseline gain over 8 weeks for a beginner with full headroom.
  const pct = 15 * headroom * expMul * freqMul * lifestyle;
  return {
    rate: round(pct, 1),
    weeks: 8,
    confidence: confidenceFromProfile(profile),
    note: `${round(pct, 1)}% VO₂max gain projected over 8 weeks (current ${currentVo2}, ceiling ~${round(ceiling, 1)}).`,
  };
}

// ─── Strength ────────────────────────────────────────────────────────

/**
 * Monthly strength gain (% of current 1RM). Novices see 5-10%/mo,
 * advanced trainees see < 1%/mo on most lifts.
 */
export function monthlyStrengthGainPct(
  profile: ClientProfile,
  opts: { lifestyleSessions?: number } = {},
): RateResult {
  const expMul = experienceMultiplier(profile.trainingExperience);
  const ageMul = ageMultiplier(profile.age);
  const freqMul = frequencyMultiplier(profile.trainingFrequency);
  const lifestyle = lifestyleFactorForSessions(profile, opts.lifestyleSessions ?? profile.trainingFrequency);

  // Beginner baseline: 7%/month
  const pct = 7 * expMul * ageMul * freqMul * lifestyle;

  return {
    rate: round(pct, 1),
    weeks: 0,
    confidence: confidenceFromProfile(profile),
    note: `~${round(pct, 1)}%/month strength gain projected at ${profile.trainingFrequency}x/week.`,
  };
}

// ─── Posture / mobility correction ───────────────────────────────────

export type PostureSeverity = 'mild' | 'moderate' | 'severe';

/**
 * Estimated weeks to materially correct a postural deviation given
 * adherence to a corrective-exercise protocol. Severity maps directly
 * to duration, with a small modulation by training frequency.
 *
 * Refs: Kim et al. 2018 forward-head-posture interventions; Page 2011
 * postural assessment & correction protocols.
 */
export function postureCorrectionWeeks(
  profile: ClientProfile,
  severity: PostureSeverity,
): RateResult {
  const base = severity === 'mild' ? 8 : severity === 'moderate' ? 12 : 16;
  const freqMul = profile.trainingFrequency >= 4 ? 1.0 : profile.trainingFrequency >= 2 ? 1.2 : 1.5;
  const lifestyle = 1 / lifestyleMultiplier(profile); // poor lifestyle slows correction
  const weeks = Math.ceil(base * freqMul * lifestyle);
  return {
    rate: 0,
    weeks,
    confidence: 'medium',
    note: `${weeks} weeks expected correction window for ${severity} deviation with adherence.`,
  };
}

/**
 * Mobility (joint ROM) correction rate — degrees gained per 8 weeks
 * of daily mobility work. Slows as ROM approaches normative range.
 */
export function mobilityGainDegPer8Weeks(severity: PostureSeverity): RateResult {
  const deg = severity === 'severe' ? 12 : severity === 'moderate' ? 9 : 6;
  return {
    rate: deg,
    weeks: 8,
    confidence: 'medium',
    note: `~${deg}° gain per 8 weeks of consistent mobility work.`,
  };
}

// ─── Behavioural change (sleep, stress, nutrition) ───────────────────

export type BehaviourSeverity = 'mild' | 'moderate' | 'severe';

export function sleepHabitChangeWeeks(severity: BehaviourSeverity): number {
  if (severity === 'mild') return 4;
  if (severity === 'moderate') return 8;
  return 12;
}

export function stressManagementWeeks(severity: BehaviourSeverity): number {
  if (severity === 'mild') return 6;
  if (severity === 'moderate') return 10;
  return 16;
}

export function nutritionHabitChangeWeeks(severity: BehaviourSeverity): number {
  if (severity === 'mild') return 6;
  if (severity === 'moderate') return 10;
  return 12;
}

// ─── Score-improvement timeline ──────────────────────────────────────

/**
 * Estimate how many weeks it takes a client to improve a generic
 * 0-100 pillar score by N points, given their training profile. This
 * replaces the legacy severity-inverted `weeksFromScore` heuristic
 * (which counterintuitively gave bigger deficits less time).
 *
 * Calibration: a novice training 3x/week with average lifestyle gains
 * ~1.5 score-points/week early in a programme, slowing as they
 * approach the ceiling. We tune the rate by training frequency,
 * experience, age, and lifestyle drag.
 */
export function weeksForScoreImprovement(
  profile: ClientProfile,
  fromScore: number,
  toScore: number,
): number {
  if (toScore <= fromScore) return 4; // already there or beyond — minimum cycle.
  const delta = toScore - fromScore;

  const baseRatePerWeek = 1.5;
  // Diminishing-returns dampening as score approaches 100
  const ceilingDamp = 1 - (Math.max(0, fromScore) / 100) * 0.5;

  const rate =
    baseRatePerWeek *
    ceilingDamp *
    frequencyMultiplier(profile.trainingFrequency) *
    experienceMultiplier(profile.trainingExperience) *
    ageMultiplier(profile.age) *
    lifestyleMultiplier(profile);

  if (rate <= 0) return 24; // No training = long horizon, but capped.
  const weeks = Math.ceil(delta / rate);
  return Math.max(4, Math.min(48, weeks)); // clamp 4-48 weeks
}

// ─── Phase fractions (for ARC milestones) ────────────────────────────

/**
 * Fraction of the total goal journey to deliver in each phase.
 * Foundation = first ~25%, Development = cumulative ~70%, Performance
 * = full goal. Each phase is a "win" the client can hit, not the whole
 * mountain compressed into 12 weeks.
 */
export const PHASE_FRACTIONS = {
  foundation: 0.30,
  development: 0.70,
  performance: 1.00,
} as const;

export type Phase = keyof typeof PHASE_FRACTIONS;

/**
 * Compute the phase target for a quantitative goal — e.g., for a 12kg
 * weight-loss goal: foundation = 3.6kg, development = 8.4kg, performance = 12kg.
 *
 * Direction-aware: works for losses (negative delta) and gains (positive).
 */
export function phaseValueTarget(
  baselineValue: number,
  goalValue: number,
  phase: Phase,
): number {
  const delta = goalValue - baselineValue;
  return round(baselineValue + delta * PHASE_FRACTIONS[phase], 2);
}

/**
 * Compute realistic timeline for each phase given a rate and total
 * delta. Foundation hits 30% of delta at full rate; development takes
 * cumulative 70%; performance takes full delta.
 */
export function phaseWeeks(totalWeeks: number, phase: Phase): number {
  return Math.ceil(totalWeeks * PHASE_FRACTIONS[phase]);
}

// ─── Utils ───────────────────────────────────────────────────────────

function round(n: number, decimals: number): number {
  const p = Math.pow(10, decimals);
  return Math.round(n * p) / p;
}
