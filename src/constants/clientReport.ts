/**
 * Client-facing copy for AXIS report surfaces.
 */

/** Length of the plan the AXIS report projects and the roadmap covers. */
export const CLIENT_PLAN_WEEKS = 16;

export const CLIENT_REPORT_COPY = {
  measuredChangeNote: (date: string) => `Measured change since ${date} is shown below Now. Future columns are estimates.`,
  tapeChangeNote: (date: string) => `Changes since ${date}. Larger or smaller is not automatically better.`,
  measuredAndEstimatedHeading: 'Measured results and estimated progress',
  measuredChangeLabel: 'Measured change',
  planFuelNote: 'Daily starting guide. Review against your energy, hunger and progress after the first month.',
  planMacroReview: 'Your food needs need an individual review before setting protein and other macros.',
  planAdjustedProtein: (kg: number, rate: number) => `Protein uses ${rate} g/kg of an adjusted reference weight (${kg.toFixed(1)} kg), rather than total weight. Review this with your coach.`,
  planCarbs: 'carbohydrate / day',
  planFat: 'fat / day',
  previewTitle: 'Local report review',
  previewSample: 'Sample client',
  previewFemale: 'Female example',
  previewFemaleDetail: 'Synthetic female example with its own measurements and scores. No client data.',
  previewDetail: 'the sample client’s captured baseline. Review the estimates and weekly plan before release.',

  targetsUnavailable: "Targets aren't available for this area in this assessment.",
  pillarNotAssessed: "This area wasn't part of this session.",
  snapshotHeading: 'Snapshot',
  /** Client pillars are text-first; only posture scan photos use the snapshot slot when present. */
  postureSnapshotHeading: 'Your posture scan',
  strengthsHeading: 'Strengths',
  focusHeading: 'Focus areas',
  targetsHeading: 'Your targets',
  targetsDetailsToggle: 'Show target numbers',
  targetsDetailsHide: 'Hide target numbers',
  axisSummaryHeading: 'Your story',
  whereYouAreHeading: 'Where you are',
  heroPrioritiesHeading: 'What matters now',
  heroSummaryHeading: 'At a glance',
  strengthsSnapshotHeading: "What's going well",
  focusSnapshotHeading: 'What to work on',
  outlookHeading: "Where we're heading",
  baselineNarrative: "This is your starting point. Next time, you'll see what has changed.",
  partialAssessmentHeading: 'This session covered',
  goingWell: 'Going well',
  focusNext: 'Focus next',
  pillarsOverviewHeading: 'Your five scores',
  movementPatterns: 'Movement patterns',
  posture: 'Posture',
  postureTapHint: 'Tap a view for detail',
  /** V2 client report — calm debrief layout */
  v2HeroWelcomeFallback:
    'This session is the starting picture. Complete the scores to see where you sit and what to train first.',
  v2AxisScoreLabel: 'Overall score',
  /** Descriptive — no branded radar name; AXIS Score™ is the overall rollup. */
  v2RadarLabel: 'Your five areas',
  v2AxisScoreGloss: 'your overall picture',
  v2RoadmapHeading: `Your ${CLIENT_PLAN_WEEKS}-week plan`,
  v2RoadmapSubheading: 'Built around the goals you chose. One clear habit each.',
  v2RoadmapHowLabel: 'How',
  v2RoadmapPrimaryGoal: 'Primary',
  /** Plan-length target strip */
  v2RoadmapTargetLabel: `${CLIENT_PLAN_WEEKS}-week target`,
  v2RoadmapTargetWeight: 'weight a month',
  v2RoadmapTargetWeightMaintain: 'weight',
  v2RoadmapTargetFuel: 'Daily food',
  v2RoadmapTargetCalories: 'calories / day',
  v2RoadmapTargetProtein: 'protein / day',
  v2RoadmapTargetMaintain: 'Maintain',
  v2RoadmapTargetNote:
    'Realistic, healthy targets based on today. A starting point, not a strict rule.',
  /** Soft close — how we can help, no obligation. */
  v2RoadmapCta:
    `Want a coach on this? We’ll turn it into a weekly plan and keep it moving every ${CLIENT_PLAN_WEEKS} weeks.`,
  v2ScorecardHeading: 'Where you are',
  v2ScorecardSubheading:
    `Five scores from today. The ${CLIENT_PLAN_WEEKS}-week column is a realistic target if you follow the roadmap.`,
  v2PillarsHeading: 'Where you are',
  v2PostureHeading: 'Your posture scan',
  v2PostureSubheading: 'Tap a view for the scan.',
  v2PostureImagesOnlyHeadline: "Photos from today's scan. We'll compare against them at your next one.",
  v2PostureBalancedHeadline:
    "Your posture is well balanced from every angle. That's a great base for lifting heavier safely.",
  v2PostureViewBalanced: 'Nothing to flag from this angle.',
  v2PostureOverviewOne: (name: string, impact: string) =>
    `Your scan picked up one thing to work on: ${name}. ${impact}`.trim(),
  v2PostureOverviewFew: (count: string, names: string) =>
    `Your scan picked up ${count} things to work on: ${names}.`,
  v2PostureOverviewMany: (count: string, names: string) =>
    `Your scan picked up ${count} things to work on. The biggest are ${names}.`,
  v2PostureOverviewWhy: (areas: string) =>
    `Fixing them takes strain off your ${areas}, so you can train harder without picking up aches and niggles.`,
  v2PostureViewCount: (count: number) =>
    count === 1 ? '1 thing to work on from this angle.' : `${count} things to work on from this angle.`,
  v2PostureCause: 'What may contribute',
  v2PostureFix: 'What to work on',
  v2PostureChooseFinding: 'Choose an area to explore',
  v2PostureUnanalysed: 'Photo saved. Feedback is not available for this view yet.',
  v2PostureFixLine: (strengthen: string, loosen: string) =>
    `We'll strengthen ${strengthen}, and loosen ${loosen}. Moves we'll use:`,
  v2PostureOpenDetail: 'View feedback and exercises',
  v2PostureSeverity: { mild: 'Slight', moderate: 'Noticeable', significant: 'Marked' },
  v2PostureViewTitle: {
    front: 'Front',
    'side-left': 'Left side',
    back: 'Back',
    'side-right': 'Right side',
  },
  v2PrimaryGoalPrefix: 'Your goals',
  v2FindingsHeading: 'Where to focus first',
  v2ProgressionHeading: `Next ${CLIENT_PLAN_WEEKS} weeks`,
  v2TapeHeading: 'Tape measurements',
  v2TapeHint: "Today's measurements. We re-measure every block so you can see exactly where you're changing.",
  v2TapeShow: 'Show',
  v2TapeHide: 'Hide',
  v2TapeSites: (count: number) => (count === 1 ? '1 site' : `${count} sites`),
  v2MovementStoryHeading: 'How you move',
  v2MovementFindingsHeading: 'Patterns to work on',
  strengthBalanceHeading: 'Left and right balance',
  strengthBalanceTitle: { grip: 'Grip strength', legs: 'Single-leg sit-to-stand' },
  strengthBalanceFinding: {
    grip: (weak: string, strong: string, pct: number, weakValue: number, strongValue: number) =>
      `Your ${weak} hand is ${pct}% weaker than your ${strong} (${weakValue} kg vs ${strongValue} kg). With a gap this size your stronger side quietly does more of the work in two-handed lifts, so the weaker side falls further behind and the uneven load can lead to aches.`,
    legs: (weak: string, strong: string, pct: number, weakValue: number, strongValue: number) =>
      `Your ${weak} leg managed ${pct}% fewer reps than your ${strong} (${weakValue} vs ${strongValue} in 30 seconds). With a gap this size your stronger leg takes over in squats and lunges, so the weaker side falls further behind and the uneven load can lead to knee, hip or back aches.`,
  },
  strengthBalanceFocus: "How we'll even it out",
  strengthBalancePlan: {
    grip: (weak: string, strong: string) =>
      `Single-arm and single-leg exercises, plus machines where each side moves on its own, so your stronger side can't take over. Every set starts on your ${weak} side, and your ${strong} side matches those reps, no more.`,
    legs: (weak: string, strong: string) =>
      `Single-leg exercises such as split squats and step-ups, plus machines where each leg moves on its own, so your stronger leg can't take over. Every set starts on your ${weak} leg, and your ${strong} leg matches those reps, no more.`,
  },
  v2MovementPatternsOk: 'Patterns looked solid.',
  v2MovementGradeLimited: 'Limited',
  v2MovementGradeFair: 'Fair',
  v2MovementGradeStrong: 'Strong',
  v2MovementPostureHint: 'Posture photos from this session are below.',
  v2LifestyleStoryHeading: 'Daily habits',
  v2LifestyleFactorsHeading: 'Your daily habits',
  v2LifestyleEmpty: 'Lifestyle inputs were not captured for this assessment.',
  v2LifestyleStatusOnTrack: 'On track',
  v2LifestyleStatusImprove: 'Room to improve',
  v2LifestyleStatusFocus: 'Worth focusing on',
  v2PostureWhatItMeans: 'Why it matters',
  v2PostureWhatWeDo: "What we'll do",
  v2DocumentTitle: 'Assessment report',
  v2DocumentSubtitle: `Where you are now, and what ${CLIENT_PLAN_WEEKS} weeks can change`,
  progressionMetricCol: 'Metric',
  progressionNowCol: 'Now',
  progressionOneMonthCol: '1 month',
  progressionTwelveWeekCol: `${CLIENT_PLAN_WEEKS} weeks`,
  postureFindingsHeading: 'What we found',
  v2PostureViewMissing: 'Not captured',
  /** Client-facing plan targets (Now | 1 month | plan weeks). */
  planSmartGoalsHeading: 'Your plan targets',
  planSmartGoalsSubheading:
    `Where you are today, and realistic progress in 1 month and ${CLIENT_PLAN_WEEKS} weeks at your planned training week.`,
  planSmartGoalsEmpty: 'Plan targets will appear once body composition or performance tests are captured.',
  planSmartGoalsFuelHeading: 'Daily food',
  planSmartGoalsSectionBody: 'Body composition',
  planSmartGoalsSectionTape: 'Measurements',
  planSmartGoalsSectionPerformance: 'Strength and fitness',
  planSmartGoalBicepLeft: 'Left bicep',
  planSmartGoalBicepRight: 'Right bicep',
  planSmartGoalPushups: 'Upper-body strength and endurance',
  planSmartGoalSquats: 'Lower-body strength and endurance',
  planSmartGoalPlank: 'Core strength',
  planSmartGoalGrip: 'Grip strength',
  planSmartGoalNow: 'now',
  planSmartGoalInOneMonth: 'in 1 month',
  planSmartGoalInPlanWeeks: (weeks: number) => `in ${weeks} weeks`,
} as const;

/** One paste-ready SMART line. No em dashes. */
export function planSmartGoalLine(input: {
  label: string;
  unit: string;
  current: string;
  at1Month: string;
  at16Weeks: string;
  planWeeks?: number;
}): string {
  const weeks = input.planWeeks ?? CLIENT_PLAN_WEEKS;
  const unit = input.unit.trim();
  const withUnit = (value: string) => (unit && value !== '–' && value !== '-' ? `${value} ${unit}` : value);
  return (
    `${input.label}: ${withUnit(input.current)} ${CLIENT_REPORT_COPY.planSmartGoalNow}` +
    ` → ${withUnit(input.at1Month)} ${CLIENT_REPORT_COPY.planSmartGoalInOneMonth}` +
    ` → ${withUnit(input.at16Weeks)} ${CLIENT_REPORT_COPY.planSmartGoalInPlanWeeks(weeks)}`
  );
}

/** Movement screen in client words, keyed by form field then raw value. */
const MOVEMENT_OBSERVED: Record<string, Record<string, string>> = {
    ohsSquatDepth: {
      parallel: 'squat stops at parallel',
      'quarter-depth': 'squat only goes a quarter of the way down',
      'no-depth': 'very little squat depth',
    },
    ohsTorsoLean: {
      'moderate-lean': 'chest drops forward',
      'excessive-lean': 'chest drops well forward',
    },
    ohsShoulderMobility: {
      compensated: 'arms drift forward overhead',
      limited: 'arms struggle to stay overhead',
    },
    ohsHipShift: {
      left: 'hips shift to the left',
      right: 'hips shift to the right',
    },
    ohsKneeAlignment: {
      valgus: 'knees cave in',
      varus: 'knees bow out',
    },
    ohsFeetPosition: {
      pronation: 'arches roll in',
      supination: 'feet roll out',
    },
    hingeDepth: {
      fair: 'limited reach when bending from the hips',
      poor: 'very little reach when bending from the hips',
    },
    hingeBackRounding: {
      minor: 'lower back rounds slightly',
      moderate: 'lower back rounds',
      severe: 'lower back rounds a lot',
    },
    lungeLeftBalance: { fair: 'wobbles on the left leg', poor: 'loses balance on the left leg' },
    lungeRightBalance: { fair: 'wobbles on the right leg', poor: 'loses balance on the right leg' },
    lungeLeftKneeAlignment: { 'caves-inward': 'left knee caves in', 'bows-outward': 'left knee bows out' },
    lungeRightKneeAlignment: { 'caves-inward': 'right knee caves in', 'bows-outward': 'right knee bows out' },
};

/** What we saw on each movement pattern, and why fixing it matters. */
export const MOVEMENT_FINDING_COPY = {
  observed: MOVEMENT_OBSERVED,
  why: {
    ohs: 'Fixing this keeps your knees and back safe as squats get heavier.',
    hinge: 'This is how you lift anything off the floor, so getting it right protects your lower back.',
    lunge: 'Single-leg control protects your knees and evens out strength between your legs.',
  },
} as const;

export const LIFESTYLE_FACTOR_LABELS = {
  sleep: 'Sleep',
  stress: 'Stress',
  nutrition: 'Nutrition',
  hydration: 'Hydration',
  activity: 'Activity',
  activityLevel: 'Activity level',
  sedentary: 'Sedentary',
  caffeine: 'Caffeine',
} as const;

/** One concrete tip per lifestyle row — shown even when the status chip is on track. */
export const LIFESTYLE_FACTOR_ADVICE = {
  sleep:
    'A good night is a regular bedtime, 7–9 hours, and a dark, cool, quiet room.',
  stress:
    'When it spikes, take a 10-minute walk, slow box breathing (in 4, hold 4, out 4), or a short no-phone break.',
  nutrition:
    'Hit your calorie and protein targets with mostly minimally processed food, and plenty of fruit, veg, and fibre.',
  hydration:
    'Drink steadily through the day. Water, coffee, tea, shakes and even soft drinks all count.',
  activityAim:
    'The health benefits start at around 8,000 steps a day. Aim for 10,000.',
  activityStrong: '10,000 steps is a strong daily target. Keep it up.',
  sedentary: 'Break up long sitting with a short walk every hour.',
  caffeine:
    'Caffeine stays in your system for about 8 hours, so time your last cup if you don’t want it disrupting sleep.',
} as const;

export function clientLifestyleNutritionAdvice(
  calories: number | null | undefined,
  proteinG: number | null | undefined,
): string {
  const cal = calories != null && calories > 0 ? Math.round(calories).toLocaleString('en-GB') : null;
  const pro = proteinG != null && proteinG > 0 ? String(Math.round(proteinG)) : null;
  if (cal && pro) {
    return `Aim for about ${cal} calories and ${pro}g protein a day, mostly from minimally processed food, with plenty of fruit, veg, and fibre.`;
  }
  if (pro) {
    return `Aim for about ${pro}g protein a day, mostly from minimally processed food, with plenty of fruit, veg, and fibre.`;
  }
  if (cal) {
    return `Aim for about ${cal} calories a day, with protein at each meal, mostly from minimally processed food, and plenty of fruit, veg, and fibre.`;
  }
  return LIFESTYLE_FACTOR_ADVICE.nutrition;
}

export type AxisPlacementBand = 'well-above' | 'above' | 'typical' | 'below' | 'well-below';

const PLACEMENT_BAND_COPY: Record<AxisPlacementBand, string> = {
  'well-above': 'well above average',
  above: 'above average',
  typical: 'about average',
  below: 'below average',
  'well-below': 'well below average',
};

/** AXIS 0–100 is already age/sex-normed (50 ≈ typical for the tests). */
export function axisPlacementBand(score: number): AxisPlacementBand {
  if (score >= 80) return 'well-above';
  if (score >= 65) return 'above';
  if (score >= 50) return 'typical';
  if (score >= 35) return 'below';
  return 'well-below';
}

export function clientHeroPlacementLine(
  score: number,
  peerGroup: string | null,
  delta: number | null,
): string {
  const band = PLACEMENT_BAND_COPY[axisPlacementBand(score)];
  const place = peerGroup
    ? `Your overall score of ${score} is ${band} for ${peerGroup}.`
    : `Your overall score of ${score} is ${band}.`;
  if (delta == null || delta === 0) return place;
  const change = delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`;
  return `${place.slice(0, -1)}, ${change} from last time.`;
}

export function clientHeroBestFindingLine(label: string): string {
  return `${label} is your best result today.`;
}

export function clientHeroImprovementsLine(labels: string[]): string {
  if (labels.length === 0) return '';
  if (labels.length === 1) return `The main area to improve is ${labels[0]}.`;
  if (labels.length === 2) return `The main areas to improve are ${labels[0]} and ${labels[1]}.`;
  return `The main areas to improve are ${labels[0]}, ${labels[1]}, and ${labels[2]}.`;
}

export function clientGoalPromiseWeightLoss(kgPerMonth: string): string {
  return `Over the next ${CLIENT_PLAN_WEEKS} weeks, a healthy pace is about ${kgPerMonth} kg a month, without crash dieting.`;
}

export function clientGoalPromiseRecomp(kgPerMonth: string): string {
  return `Over the next ${CLIENT_PLAN_WEEKS} weeks, expect about ${kgPerMonth} kg a month to come off while you add muscle. A stronger, leaner look, not a crash diet.`;
}

export function clientGoalPromiseMuscle(): string {
  return `Over the next ${CLIENT_PLAN_WEEKS} weeks we build muscle with regular strength work and enough protein at each meal.`;
}

export function clientGoalPromiseFitness(): string {
  return `Over the next ${CLIENT_PLAN_WEEKS} weeks we build easy cardio you can still talk through, then add short harder efforts.`;
}

export function clientGoalPromiseStrength(): string {
  return `Over the next ${CLIENT_PLAN_WEEKS} weeks we lock in technique, then add a little weight or a rep when it feels easy.`;
}

export function clientGoalPromiseDefault(label: string): string {
  return `Over the next ${CLIENT_PLAN_WEEKS} weeks we build a clear plan around ${label.toLowerCase()}, with steady progress you can see.`;
}

/** Short client-facing pillar names (radar, jumps, sections). */
export const CLIENT_PILLAR_LABELS: Record<string, string> = {
  'Body Composition': 'Body composition',
  'Functional Strength': 'Strength',
  'Metabolic Fitness': 'Fitness',
  'Movement Quality': 'Movement',
  'Lifestyle Factors': 'Lifestyle',
  bodyComp: 'Body composition',
  strength: 'Strength',
  cardio: 'Fitness',
  movementQuality: 'Movement',
  lifestyle: 'Lifestyle',
};

export const CLIENT_METRIC_LABELS: Record<
  string,
  { short: string; hint?: string }
> = {
  vo2: { short: 'Fitness level', hint: 'How well your heart and lungs support effort' },
  rhr: { short: 'Resting heart rate', hint: 'Lower is generally better at rest' },
  hrr: { short: 'Heart recovery', hint: 'How quickly your heart rate drops after effort' },
  bodyWeight: { short: 'Body weight' },
  muscleMass: { short: 'Muscle mass' },
  bodyFat: { short: 'Body fat' },
  endurance: { short: 'Muscular endurance' },
  upperBody: { short: 'Upper-body strength and endurance' },
  lowerBody: { short: 'Lower-body strength and endurance' },
  core: { short: 'Core strength' },
  grip: { short: 'Grip strength' },
  peakHr: { short: 'Peak heart rate' },
  waist: { short: 'Waist' },
  hips: { short: 'Hips' },
  chest: { short: 'Chest' },
  shoulders: { short: 'Shoulders' },
  armLeft: { short: 'Left arm' },
  armRight: { short: 'Right arm' },
  thighLeft: { short: 'Left thigh' },
  thighRight: { short: 'Right thigh' },
  calfLeft: { short: 'Left calf' },
  calfRight: { short: 'Right calf' },
};

/** Map radar / full label to scroll anchor section id */
export const FULL_LABEL_TO_SECTION_ID: Record<string, string> = {
  'Body Composition': 'body-comp',
  'Functional Strength': 'strength',
  'Metabolic Fitness': 'cardio',
  'Movement Quality': 'movement-quality',
  'Lifestyle Factors': 'lifestyle',
};

export const SCORING_ID_TO_SECTION_ID: Record<string, string> = {
  bodyComp: 'body-comp',
  strength: 'strength',
  cardio: 'cardio',
  movementQuality: 'movement-quality',
  lifestyle: 'lifestyle',
};
