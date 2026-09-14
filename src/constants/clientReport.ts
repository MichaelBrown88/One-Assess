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
    'This session is the starting picture. Complete the scores to see where you sit and what to train first.',
  v2AxisScoreLabel: 'AXIS Score™',
  /** Descriptive — no branded radar name; AXIS Score™ is the overall rollup. */
  v2RadarLabel: 'Pillar scores',
  v2AxisScoreGloss: 'your overall picture',
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
  /** Soft close — how we can help, no obligation. */
  v2RoadmapCta:
    'Want a coach on this? We’ll turn it into a weekly plan and keep it moving every 12 weeks.',
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
  v2ProgressionHeading: 'Next 12 weeks',
  v2MovementStoryHeading: 'How you move',
  v2MovementFindingsHeading: 'Next 12 weeks',
  v2MovementPatternsOk: 'Patterns looked solid.',
  v2MovementGradeLimited: 'Limited',
  v2MovementGradeFair: 'Fair',
  v2MovementGradeStrong: 'Strong',
  v2MovementPostureHint: 'Posture photos from this session are below.',
  v2LifestyleStoryHeading: 'Daily habits',
  v2LifestyleFactorsHeading: 'Your daily habits',
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

export type AxisPlacementBand = 'well-above' | 'above' | 'typical' | 'below' | 'well-below';

const PLACEMENT_BAND_COPY: Record<AxisPlacementBand, string> = {
  'well-above': 'well above typical',
  above: 'above typical',
  typical: 'around typical',
  below: 'below typical',
  'well-below': 'well below typical',
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
    ? `Among ${peerGroup}, your AXIS Score™ of ${score} sits ${band}.`
    : `Your AXIS Score™ of ${score} sits ${band} on this assessment.`;
  if (delta == null || delta === 0) return place;
  const change = delta > 0 ? `up ${delta}` : `down ${Math.abs(delta)}`;
  return `${place.slice(0, -1)} — ${change} from last time.`;
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
