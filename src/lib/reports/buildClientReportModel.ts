import type { ReactNode } from 'react';
import type { FormData } from '@/contexts/FormContext';
import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { GapAnalysisData } from '@/components/reports/useGapAnalysisData';
import type { PostureFindingRecord, PostureFindingViewId } from '@/lib/types/postureFindings';
import type { PostureAnalysisResult } from '@/lib/ai/postureAnalysis';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import type { SectionId } from '@/components/reports/client/clientReportSections';
import { SECTION_IDS, SECTION_META, scoringIdForSection } from '@/components/reports/client/clientReportSections';
import {
  buildClientPillarSummary,
  buildClientPriorityFallbacks,
} from '@/components/reports/client/sub-components/clientPillarSummary';
import { buildClientScoreHeadline, buildOverallResultsSummary } from '@/lib/reports/clientScoreHeadline';
import { buildClientProgressionRows } from '@/lib/reports/clientProgressionRows';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { buildClientSelfGuidedHabits } from '@/lib/reports/clientGoalPhases';
import { buildClientRoadmapCards, type ClientRoadmapCard } from '@/lib/reports/clientRoadmapCards';
import {
  buildClientNinetyDayTarget,
  type ClientNinetyDayTarget,
} from '@/lib/reports/clientNinetyDayTarget';
import { formatKg1 } from '@/lib/reports/weightLossProjection';
import { projectClientTwelveWeekWeightLoss } from '@/lib/reports/clientTwelveWeekWeight';
import {
  pillarScoresFromCategories,
  buildRadarDataFromScores,
  type RadarData,
} from '@/lib/reports/radarData';
import {
  GOAL_BUILD_MUSCLE,
  GOAL_BUILD_STRENGTH,
  GOAL_IMPROVE_FITNESS,
  GOAL_WEIGHT_LOSS,
  parseClientGoals,
  resolvePillarRole,
  type ClientGoalContext,
  type PillarId,
  type PillarRole,
} from '@/lib/goals/goalContext';
import {
  aggregatePostureFindings,
  buildFocusBullets,
  sortFindingsForDisplay,
} from '@/lib/posture/aggregatePostureInsights';
import { buildMovementFindings, type ClientMovementFindingsModel } from '@/lib/reports/clientMovementFindings';
import { sanitizeClientReportCopy } from '@/lib/reports/sanitizeClientReportCopy';
import {
  CLIENT_PILLAR_LABELS,
  CLIENT_REPORT_COPY,
  clientGoalPromiseDefault,
  clientGoalPromiseFitness,
  clientGoalPromiseMuscle,
  clientGoalPromiseRecomp,
  clientGoalPromiseStrength,
  clientGoalPromiseWeightLoss,
} from '@/constants/clientReport';

export type ClientPillarContentMode = 'progression' | 'lifestyle-factors' | 'movement-findings';

export interface ClientReportMetricChip {
  label: string;
  value: string;
}

export interface ClientReportPillarModel {
  sectionId: SectionId;
  scoringId: ScoreCategory['id'];
  title: string;
  shortTitle: string;
  icon: ReactNode;
  score: number;
  previousScore: number | null;
  summary: string;
  goingWell: string[];
  focusNext: string[];
  metrics: ClientReportMetricChip[];
  progressionRows: ClientReportProgressionRow[];
  contentMode: ClientPillarContentMode;
  movementFindings: ClientMovementFindingsModel | null;
  goalTieIn: string | null;
  pillarRole: PillarRole;
}

export interface ClientReportPlanStep {
  title: string;
  body: string;
}

export interface ClientReportPostureModel {
  findings: PostureFindingRecord[];
  postureResults: Partial<Record<PostureFindingViewId, PostureAnalysisResult>>;
  images: Record<string, string>;
  headline: string;
  summaryLines: string[];
  focusBullets: string[];
}

export interface ClientReportModel {
  clientName: string;
  reportDate: string;
  overall: number;
  previousOverall: number | null;
  headline: string | null;
  /** Goal-led promise — primary message for the client. */
  goalPromise: string;
  welcome: string;
  /** One deduplicated, goal-weighted priority list for the hero (replaces the measured split). */
  focusFirst: string[];
  /** All stated goals as display labels (chips in the hero). */
  goalLabels: string[];
  /** Goal-primary area to improve this 12-week block. */
  priorityFocus: { label: string; score: number } | null;
  /** Compact self-guided habits shown under the roadmap. */
  selfGuidedHabits: string[];
  /** High-level behaviour roadmap — one card per assessed pillar, goal-priority order. */
  roadmapCards: ClientRoadmapCard[];
  /** Achievable 12-week body-weight + macro target for the roadmap (null when data is insufficient). */
  roadmapTarget: ClientNinetyDayTarget | null;
  pillars: ClientReportPillarModel[];
  posture: ClientReportPostureModel | null;
  radarData: RadarData[];
  previousRadarData?: RadarData[];
  /** Render-only — lifestyle factor grid in v2 pillars. */
  formData?: FormData;
}

export interface BuildClientReportModelInput {
  scores: ScoreSummary;
  formData?: FormData;
  goals?: string[];
  previousScores?: ScoreSummary | null;
  gapAnalysisData: GapAnalysisData[];
  clientName: string;
  reportDate: string;
}

export function buildClientReportModel(input: BuildClientReportModelInput): ClientReportModel {
  const { scores, formData, goals, previousScores, gapAnalysisData, clientName, reportDate } =
    input;

  const overall = Math.round(scores.overall ?? 0);
  const previousOverall =
    previousScores?.overall != null && previousScores.overall > 0 ? previousScores.overall : null;

  const goalCtx = parseClientGoals(formData, goals);
  const goalIds = goalCtx.allGoals;
  const goalLabels = goalIds
    .map((id) => ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === id)?.label ?? id)
    .filter(Boolean)
    .slice(0, 4);

  const goalPromise = sanitizeClientReportCopy(
    buildGoalPromise(formData, scores, goals, goalCtx),
  );
  const headlineRaw = buildGoalAlignedSubheadline(scores, goalCtx);
  const headline = headlineRaw ? sanitizeClientReportCopy(headlineRaw) : null;
  const welcome = sanitizeClientReportCopy(
    buildOverallResultsSummary(scores, previousOverall),
  );

  const focusFirst = dedupeLines(
    buildHeroList(scores, 'focus', goalCtx, 3).map(sanitizeClientReportCopy),
  ).slice(0, 3);

  const selfGuidedHabits = buildClientSelfGuidedHabits(formData, goals);

  const pillars = sortPillarsByGoalRole(
    SECTION_IDS.map((sectionId) =>
      buildPillarModel(sectionId, scores, previousScores, gapAnalysisData, formData, goalCtx, goals),
    ).filter((p): p is ClientReportPillarModel => p != null),
  );

  const posture = buildPostureModel(formData);

  const roadmapCards = buildClientRoadmapCards(
    pillars.map((p) => ({
      // scoringId is the five-pillar union from ScoreCategory.
      scoringId: p.scoringId as PillarId,
      score: p.score,
    })),
    formData,
    goalCtx,
    scores,
  );

  const roadmapTarget = buildClientNinetyDayTarget(formData, scores, goalCtx);

  const radarData = buildRadarDataFromScores(pillarScoresFromCategories(scores.categories));
  const previousRadarData = previousScores
    ? buildRadarDataFromScores(pillarScoresFromCategories(previousScores.categories))
    : undefined;
  const priorityFocus = buildPriorityFocus(scores, goalCtx);

  return {
    clientName,
    reportDate,
    overall,
    previousOverall,
    headline,
    goalPromise,
    welcome,
    focusFirst,
    goalLabels,
    selfGuidedHabits,
    roadmapCards,
    roadmapTarget,
    pillars,
    posture,
    radarData,
    previousRadarData,
    formData,
    priorityFocus,
  };
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildGoalPromise(
  formData: FormData | undefined,
  scores: ScoreSummary,
  goals: string[] | undefined,
  goalCtx: ClientGoalContext,
): string {
  const label =
    ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalCtx.primaryGoal)?.label ??
    'your goals';

  if (formData && goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
    const projected = projectClientTwelveWeekWeightLoss(formData, scores, goals);
    if (projected && projected.lossKg > 0) {
      const kg12w = formatKg1(projected.lossKg);
      const rateLabel = projected.weeklyRateKg.toFixed(2);
      const protectMuscle = goalCtx.hasBuildMuscle || goalCtx.hasBodyRecomp;
      return protectMuscle
        ? clientGoalPromiseRecomp(rateLabel, kg12w)
        : clientGoalPromiseWeightLoss(rateLabel, kg12w);
    }
  }

  if (formData && goalCtx.primaryGoal === GOAL_BUILD_MUSCLE) {
    return clientGoalPromiseMuscle();
  }

  if (formData && goalCtx.primaryGoal === GOAL_IMPROVE_FITNESS) {
    return clientGoalPromiseFitness();
  }

  if (formData && goalCtx.primaryGoal === GOAL_BUILD_STRENGTH) {
    return clientGoalPromiseStrength();
  }

  return clientGoalPromiseDefault(label);
}

function buildGoalAlignedSubheadline(
  scores: ScoreSummary,
  goalCtx: ClientGoalContext,
): string | null {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  const strength = assessed.find((c) => c.id === 'strength');
  const bodyComp = assessed.find((c) => c.id === 'bodyComp');
  const movement = assessed.find((c) => c.id === 'movementQuality');

  if (goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
    if (strength && strength.score >= 80) {
      return 'You have a strong training base — we\'ll use it to hold muscle while body composition does the heavy lifting.';
    }
    if (bodyComp && bodyComp.score < 60) {
      return 'Body composition is the main lever; everything else supports sustainable fat loss.';
    }
    return 'Nutrition, steps, and strength training work together over the next 12 weeks.';
  }

  if (goalCtx.primaryGoal === GOAL_BUILD_MUSCLE && movement && movement.score >= 85) {
    return 'Movement quality is already solid — we can push volume and load with confidence.';
  }

  return buildClientScoreHeadline(scores);
}

const PILLAR_ROLE_ORDER: Record<PillarRole, number> = {
  primary: 0,
  secondary: 1,
  supporting: 2,
  'off-path': 3,
};

function sortPillarsByGoalRole(pillars: ClientReportPillarModel[]): ClientReportPillarModel[] {
  return [...pillars].sort(
    (a, b) => PILLAR_ROLE_ORDER[a.pillarRole] - PILLAR_ROLE_ORDER[b.pillarRole],
  );
}

function buildPriorityFocus(
  scores: ScoreSummary,
  goalCtx: ClientGoalContext,
): { label: string; score: number } | null {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  const primary = assessed.find((c) => resolvePillarRole(c.id, goalCtx) === 'primary');
  const fallback = [...assessed]
    .filter((c) => resolvePillarRole(c.id, goalCtx) !== 'off-path')
    .sort((a, b) => a.score - b.score)[0];
  const pick = primary ?? fallback;
  if (!pick) return null;
  return {
    label: CLIENT_PILLAR_LABELS[pick.id] ?? pick.title,
    score: Math.round(pick.score),
  };
}

function buildHeroList(
  scores: ScoreSummary,
  kind: 'strength' | 'focus',
  goalCtx: ClientGoalContext,
  limit = 2,
): string[] {
  const assessed = [...(scores.categories ?? [])].filter((c) => c.assessed);
  assessed.sort(
    (a, b) => pillarRoleRank(resolvePillarRole(a.id, goalCtx)) - pillarRoleRank(resolvePillarRole(b.id, goalCtx)),
  );

  const items: string[] = [];
  for (const cat of assessed) {
    const role = resolvePillarRole(cat.id, goalCtx);
    if (kind === 'focus' && role === 'off-path') continue;
    if (kind === 'focus' && cat.id === 'lifestyle' && goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
      continue;
    }
    const list = kind === 'strength' ? cat.strengths : cat.weaknesses;
    for (const line of list ?? []) {
      if (line && items.length < limit) items.push(line);
    }
  }

  if (items.length > 0) return items.slice(0, limit);

  const fallbacks = buildClientPriorityFallbacks(scores);
  const fb = kind === 'strength' ? fallbacks.strengths : fallbacks.focusAreas;
  return fb.slice(0, limit);
}

function pillarRoleRank(role: PillarRole): number {
  return PILLAR_ROLE_ORDER[role];
}

function buildPillarModel(
  sectionId: SectionId,
  scores: ScoreSummary,
  previousScores: ScoreSummary | null | undefined,
  gapAnalysisData: GapAnalysisData[],
  formData: FormData | undefined,
  goalCtx: ClientGoalContext,
  goals: string[] | undefined,
): ClientReportPillarModel | null {
  const scoringId = scoringIdForSection(sectionId);
  const cat = scores.categories?.find((c) => c.id === scoringId);
  if (!cat?.assessed) return null;

  const meta = SECTION_META[sectionId];
  const prev = previousScores?.categories?.find((c) => c.id === scoringId)?.score ?? null;
  const comparablePrev = prev != null && prev > 0 ? Math.round(prev) : null;
  const pillarRole = resolvePillarRole(scoringId, goalCtx);

  const gapIndex =
    sectionId === 'body-comp' ? 0 : sectionId === 'strength' ? 1 : sectionId === 'cardio' ? 2 : -1;

  const contentMode: ClientPillarContentMode =
    sectionId === 'movement-quality'
      ? 'movement-findings'
      : sectionId === 'lifestyle'
        ? 'lifestyle-factors'
        : 'progression';

  const movementFindings =
    sectionId === 'movement-quality' ? buildMovementFindings(formData, cat) : null;

  return {
    sectionId,
    scoringId,
    title: meta.title,
    shortTitle: meta.shortTitle,
    icon: meta.icon,
    score: Math.round(cat.score ?? 0),
    previousScore: comparablePrev,
    summary: sanitizeClientReportCopy(buildClientPillarSummary(cat, comparablePrev)),
    goingWell: (cat.strengths ?? []).slice(0, 2).map(sanitizeClientReportCopy),
    focusNext: (cat.weaknesses ?? []).slice(0, 2).map(sanitizeClientReportCopy),
    metrics:
      sectionId === 'lifestyle'
        ? extractLifestyleMetrics(formData)
        : sectionId === 'body-comp' || sectionId === 'strength' || sectionId === 'cardio'
          ? extractGapMetrics(sectionId, gapAnalysisData[gapIndex], Math.round(cat.score ?? 0))
          : [],
    progressionRows:
      contentMode === 'progression'
        ? buildClientProgressionRows(
            sectionId,
            gapAnalysisData,
            formData,
            cat,
            scores,
            goals,
          )
        : [],
    contentMode,
    movementFindings,
    goalTieIn: buildPillarGoalTieIn(scoringId, pillarRole, goalCtx),
    pillarRole,
  };
}

function buildPillarGoalTieIn(
  pillar: PillarId,
  role: PillarRole,
  goalCtx: ClientGoalContext,
): string | null {
  const goalLabel =
    ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalCtx.primaryGoal)?.label ??
    'your goal';

  if (role === 'primary') {
    return `This is central to ${goalLabel.toLowerCase()} — expect the biggest shifts here.`;
  }
  if (role === 'secondary') {
    return `Supports ${goalLabel.toLowerCase()} — we\'ll train this in service of your main target.`;
  }
  if (role === 'supporting' && pillar === 'lifestyle') {
    if (goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
      return `Habits that make fat loss easier — kept simple so ${goalLabel.toLowerCase()} stays the focus.`;
    }
    return `Lifestyle habits that back your ${goalLabel.toLowerCase()} plan.`;
  }
  if (role === 'off-path') {
    return null;
  }
  return null;
}

function extractGapMetrics(
  sectionId: 'body-comp' | 'strength' | 'cardio',
  gap: GapAnalysisData | undefined,
  pillarScore: number,
): ClientReportMetricChip[] {
  if (!gap) return [];

  if (sectionId === 'body-comp' && gap.bodyCompGaps) {
    const g = gap.bodyCompGaps;
    return [
      { label: 'Body fat', value: `${g.fat.current.toFixed(1)}%` },
      { label: 'Muscle', value: `${g.muscle.current.toFixed(1)} kg` },
    ].filter((m) => m.value && !m.value.includes('NaN'));
  }

  if (sectionId === 'cardio' && gap.cardioGaps) {
    const g = gap.cardioGaps;
    const chips: ClientReportMetricChip[] = [];
    if (pillarScore > 0) {
      chips.push({ label: 'Fitness level', value: String(Math.round(pillarScore)) });
    }
    if (g.rhr.current > 0) {
      chips.push({ label: 'Resting heart rate', value: `${Math.round(g.rhr.current)} bpm` });
    }
    return chips.slice(0, 2);
  }

  if (sectionId === 'strength' && gap.functionalGaps) {
    const g = gap.functionalGaps;
    return [
      { label: 'Endurance', value: `${Math.round(g.endurance.current)} reps` },
      { label: 'Core', value: `${Math.round(g.core.current)} sec` },
    ];
  }

  return [];
}

function extractLifestyleMetrics(formData?: FormData): ClientReportMetricChip[] {
  if (!formData) return [];
  const chips: ClientReportMetricChip[] = [];
  const steps = parseFloat(formData.stepsPerDay || '0');
  if (steps > 0) {
    chips.push({ label: 'Daily steps', value: steps >= 1000 ? `${Math.round(steps / 100) / 10}k` : String(steps) });
  }
  const stress = (formData.stressLevel || '').trim();
  if (stress) {
    chips.push({ label: 'Stress', value: stress.charAt(0).toUpperCase() + stress.slice(1) });
  }
  return chips.slice(0, 2);
}

function isPostureImageUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (value.startsWith('http') || value.startsWith('data:') || value.startsWith('gs://'))
  );
}

function buildPostureModel(formData?: FormData): ClientReportPostureModel | null {
  if (!formData) return null;

  const images = collectPostureImages(formData);
  const rawResults = formData.postureAiResults;
  const results =
    rawResults && typeof rawResults === 'object'
      ? (rawResults as Parameters<typeof aggregatePostureFindings>[0])
      : {};
  const hasImages = Object.keys(images).length > 0;
  const hasAnalysis = Object.keys(results).length > 0;
  if (!hasImages && !hasAnalysis) return null;

  const findings = hasAnalysis ? aggregatePostureFindings(results) : [];
  const notable = findings.filter((f) => f.severity !== 'aligned');
  const sorted = sortFindingsForDisplay(notable);
  const headline = buildPostureOverview(sorted, hasAnalysis);

  const summaryLines = sorted.slice(0, 5).map((f) => {
    const meaning = sanitizeClientReportCopy(f.whatItMeans?.trim() ?? '');
    const name = sanitizeClientReportCopy(f.name);
    return meaning ? `${name}: ${meaning}` : name;
  });

  return {
    findings,
    postureResults: results,
    images,
    headline,
    summaryLines,
    focusBullets: hasAnalysis ? buildFocusBullets(notable, 4) : [],
  };
}

function formatFindingList(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function buildPostureOverview(
  sorted: PostureFindingRecord[],
  hasAnalysis: boolean,
): string {
  if (!hasAnalysis) return CLIENT_REPORT_COPY.v2PostureImagesOnlyHeadline;
  if (sorted.length === 0) return CLIENT_REPORT_COPY.v2PostureBalancedHeadline;

  const names = sorted.slice(0, 3).map((f) => sanitizeClientReportCopy(f.name));
  const cue = sanitizeClientReportCopy(
    (sorted[0]?.whatWellDo || sorted[0]?.whatItMeans || '').trim(),
  );

  if (sorted.length === 1) {
    return cue
      ? `${names[0]} is the main finding from this scan. ${cue}`
      : `One area to refine: ${names[0]}.`;
  }

  const intro = `The scan flags ${formatFindingList(names)}.`;
  if (cue) return `${intro} ${cue}`;
  return `${intro} Those are the posture cues to work on first.`;
}

function collectPostureImages(formData: FormData): Record<string, string> {
  const postureImages: Record<string, string> = {};
  const take = (key: string, value: unknown) => {
    if (isPostureImageUrl(value) && !postureImages[key]) {
      postureImages[key] = value;
    }
  };

  if (formData.postureImages && typeof formData.postureImages === 'object') {
    Object.entries(formData.postureImages).forEach(([key, value]) => take(key, value));
  }
  if (formData.postureImagesStorage && typeof formData.postureImagesStorage === 'object') {
    Object.entries(formData.postureImagesStorage).forEach(([key, value]) => take(key, value));
  }

  const record = formData as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    if (key.startsWith('postureImagesFull_')) {
      take(key.replace('postureImagesFull_', ''), value);
    }
    if (key.startsWith('postureImagesStorage_')) {
      take(key.replace('postureImagesStorage_', ''), value);
    }
  }
  return postureImages;
}
