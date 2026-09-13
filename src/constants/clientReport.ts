/**
 * Client-facing copy for AXIS report surfaces.
 */

export const CLIENT_REPORT_COPY = {
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
  baselineNarrative: "This is your baseline — next time you'll see what moved.",
  partialAssessmentHeading: 'This session covered',
  goingWell: 'Going well',
  focusNext: 'Focus next',
  pillarsOverviewHeading: 'Your five scores',
  movementPatterns: 'Movement patterns',
  posture: 'Posture',
  postureTapHint: 'Tap a view for detail',
  /** V2 client report — calm debrief layout */
  v2HeroWelcomeFallback:
    'Your coach has a clear picture of where you are today — and a plan to help you reach your goals.',
  v2AxisScoreLabel: 'AXIS Score™',
  v2AxisScoreGloss: 'your overall picture',
  v2HeroFocusLabel: 'Focus this block',
  v2HeroFocusCaption: 'The area that most moves your goals over the next 12 weeks.',
  v2PlanHeading: 'Your path forward',
  v2RoadmapHeading: 'Your 12-week roadmap',
  v2RoadmapSubheading: 'What to start this week.',
  /** 12-week target strip */
  v2RoadmapTargetLabel: '12-week target',
  v2RoadmapTargetWeight: 'Target weight',
  v2RoadmapTargetFuel: 'Daily fuel',
  v2RoadmapTargetCalories: 'calories / day',
  v2RoadmapTargetProtein: 'protein / day',
  v2RoadmapTargetMaintain: 'Maintain',
  v2RoadmapTargetNote:
    'Realistic, healthy targets from your assessment — a starting point, not a strict prescription.',
  /** Soft closing line — the report is a no-obligation sales tool. */
  v2RoadmapCta:
    'This is yours to keep. If you work with us, we progress this plan every 12 weeks.',
  v2ScorecardHeading: 'Where you are',
  v2ScorecardSubheading:
    'Five scores from today. The 12-week column is a realistic target if you follow the roadmap.',
  v2PillarsHeading: 'Where you are',
  v2PostureHeading: 'Your posture scan',
  v2PostureSubheading: 'Tap a view for the scan.',
  v2PostureImagesOnlyHeadline: 'Photos from this session.',
  v2PostureBalancedHeadline: 'Your scan shows balanced alignment across the views we captured.',
  v2PostureViewBalanced: 'Looks balanced from this view.',
  v2PrimaryGoalPrefix: 'Your goals',
  v2FindingsHeading: 'Where to focus first',
  v2SelfGuidedHeading: 'Starting on your own?',
  v2SelfGuidedIntro: 'These three habits still move you toward your goals:',
  v2SelfGuidedReassess: 'Check in again in 12 weeks — the numbers here are your starting point.',
  v2ProgressionHeading: 'Next 12 weeks',
  v2MovementStoryHeading: 'How you move',
  v2MovementFindingsHeading: 'To work on',
  v2MovementPatternsOk: 'Patterns looked solid.',
  v2MovementPostureHint: 'Your posture photos are further down this report.',
  v2LifestyleStoryHeading: 'Daily habits',
  v2LifestyleFactorsHeading: 'Your daily habits',
  v2NarrativePlanHeading: "What we're building toward",
  v2TakeawayLabel: 'Takeaway',
  v2PostureWhatItMeans: 'What this means',
  v2PostureWhatWeDo: "What we'll work on",
  v2DocumentTitle: 'AXIS Assessment Report',
  v2DocumentSubtitle: 'Where you are now, and what 12 weeks can change',
  progressionMetricCol: 'Metric',
  progressionNowCol: 'Now',
  progressionTwelveWeekCol: '12 weeks',
  postureFindingsHeading: 'What we found',
  v2PostureViewMissing: 'Not captured',
} as const;

export function clientGoalPromiseWeightLoss(rate: string, kg12w: string): string {
  return `Over the next 12 weeks, a healthy pace is about ${kg12w} kg off the scale — roughly ${rate} kg a week — without crash dieting.`;
}

export function clientGoalPromiseRecomp(rate: string, kg12w: string): string {
  return `Over the next 12 weeks, expect about ${kg12w} kg off the scale while you add muscle — a stronger, leaner look, not a crash diet.`;
}

export function clientGoalPromiseMuscle(): string {
  return 'Over the next 12 weeks we build muscle with regular strength work and enough protein at each meal.';
}

export function clientGoalPromiseFitness(): string {
  return 'Over the next 12 weeks we build easy cardio you can still talk through, then add short harder efforts.';
}

export function clientGoalPromiseStrength(): string {
  return 'Over the next 12 weeks we lock in technique, then add a little weight or a rep when it feels easy.';
}

export function clientGoalPromiseDefault(label: string): string {
  return `Over the next 12 weeks we build a clear plan around ${label.toLowerCase()} — steady progress you can see.`;
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
  core: { short: 'Core stability' },
  grip: { short: 'Grip strength' },
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
