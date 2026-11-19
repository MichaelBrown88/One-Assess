import { validAssessmentComparison, withMeasuredChanges } from './assessmentComparison';
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
import { buildBodyCompProgressionRows, buildStrengthProgressionRows, buildCardioProgressionRows } from './clientProgressionProjections';
import { withOneMonthHorizon } from './clientProgressionRows';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { buildClientRoadmapCards, type ClientRoadmapCard } from '@/lib/reports/clientRoadmapCards';
import {
  buildClientNinetyDayTarget,
  type ClientNinetyDayTarget,
} from '@/lib/reports/clientNinetyDayTarget';
import { formatKg1 } from '@/lib/reports/weightLossProjection';
import { PLAN_CALENDAR_MONTHS, reportTrainingWeek, reportPlanSessions, withReportLiftingSessions, type ReportTrainingWeek } from '@/lib/reports/plannedTraining';
import { projectClientTwelveWeekWeightLoss } from '@/lib/reports/clientTwelveWeekWeight';
import {
  type PlanSmartGoal,
} from '@/lib/reports/planSmartGoals';
import { isReportablePostureFinding } from '@/lib/posture/buildStructuredPostureFindings';
import { buildPostureOverview, reportablePostureFindings } from '@/lib/posture/postureOverview';
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
  CLIENT_PLAN_WEEKS,
} from '@/constants/clientReport';

import { assessSideImbalance, type SideImbalance } from '@/lib/scoring/sideImbalance';
import { readLowerBody } from '@/lib/scoring/lowerBody';

export interface ClientSideBalance {
  kind: 'grip' | 'legs';
  imbalance: SideImbalance;
}

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
  /** Strength only: material left/right gaps (grip, legs). Empty otherwise. */
  sideBalances: ClientSideBalance[];
  goalTieIn: string | null;
  pillarRole: PillarRole;
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
  comparison?: import('./assessmentComparison').AssessmentComparison | null;
  clientName: string;
  reportDate: string;
  trainingWeek: ReportTrainingWeek;
  calculationVersion: '2026-11-16';
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
  /** One actionable entry per stated client goal. */
  roadmapCards: ClientRoadmapCard[];
  /** Achievable plan-length body-weight + macro target (null when data is insufficient). */
  roadmapTarget: ClientNinetyDayTarget | null;
  /** Compatibility targets derived from the same report rows; not a separate calculation. */
  planSmartGoals: PlanSmartGoal[];
  pillars: ClientReportPillarModel[];
  posture: ClientReportPostureModel | null;
  radarData: RadarData[];
  previousRadarData?: RadarData[];
  /** Render-only — lifestyle factor grid in v2 pillars. */
  formData?: FormData;
}

export interface BuildClientReportModelInput {
  comparison?: import('./assessmentComparison').AssessmentComparison | null;
  scores: ScoreSummary;
  formData?: FormData;
  goals?: string[];
  previousScores?: ScoreSummary | null;
  gapAnalysisData: GapAnalysisData[];
  clientName: string;
  reportDate: string;
}

export function buildClientReportModel(input: BuildClientReportModelInput): ClientReportModel {
  const { scores, formData: rawFormData, goals, previousScores, gapAnalysisData, clientName, reportDate } = input;
  const referenceDate = rawFormData?.assessedAt || (Number.isFinite(Date.parse(reportDate)) ? new Date(reportDate).toISOString() : undefined);
  const formData = rawFormData ? { ...withReportLiftingSessions(rawFormData, reportPlanSessions(rawFormData)), assessedAt: referenceDate } : undefined;

  const comparison = validAssessmentComparison(rawFormData, input.comparison);
  const overall = Math.round(scores.overall ?? 0);
  const previousOverall =
    previousScores?.overall != null && previousScores.overall > 0 ? previousScores.overall : null;

  const goalCtx = parseClientGoals(formData, goals);
  const goalIds = goalCtx.allGoals;
  const goalLabels = goalIds
    .map((id) => ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === id)?.label ?? id)
    .filter(Boolean);

  const trainingWeek = reportTrainingWeek(formData, goalCtx);
  const roadmapTarget = buildClientNinetyDayTarget(formData, scores, goalCtx);
  const progression = {
    'body-comp': withOneMonthHorizon(buildBodyCompProgressionRows(formData, scores, goals, undefined, roadmapTarget)),
    strength: withOneMonthHorizon(buildStrengthProgressionRows(formData, goals, undefined, scores)),
    cardio: withOneMonthHorizon(buildCardioProgressionRows(formData, scores, goals, gapAnalysisData[2])),
  };
  const goalPromise = sanitizeClientReportCopy(
    buildGoalPromise(formData, scores, goals, goalCtx, roadmapTarget),
  );
  const headlineRaw = buildGoalAlignedSubheadline(scores, goalCtx);
  const headline = headlineRaw ? sanitizeClientReportCopy(headlineRaw) : null;
  const welcome = sanitizeClientReportCopy(
    buildOverallResultsSummary(scores, previousOverall, {
      dateOfBirth: formData?.dateOfBirth,
      gender: formData?.gender,
      assessedAt: formData?.assessedAt,
    }),
  );

  const focusFirst = dedupeLines(
    buildHeroList(scores, 'focus', goalCtx, 3).map(sanitizeClientReportCopy),
  ).slice(0, 3);

  const pillars = sortPillarsByGoalRole(
    SECTION_IDS.map((sectionId) =>
      buildPillarModel(sectionId, scores, previousScores, gapAnalysisData, formData, goalCtx,
        sectionId === 'body-comp' || sectionId === 'strength' || sectionId === 'cardio' ? withMeasuredChanges(progression[sectionId], formData, comparison, scores) : []),
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
    { monthlyWeightChangeKg: roadmapTarget?.monthlyWeightChangeKg ?? null },
  );

  const planSmartGoals: PlanSmartGoal[] = Object.entries(progression).flatMap(([section, rows]) => rows
    .filter(row => row.twelveWeeks !== '–')
    .map(row => ({ id: row.name === 'Body weight' ? 'bc-weight' : `${section}-${row.name}`,
      category: section === 'body-comp' ? 'body-comp' : 'performance', label: row.name, unit: row.unit ?? '',
      current: row.current, at1Month: row.oneMonth ?? '–', at16Weeks: row.twelveWeeks,
      smartLine: `${row.name}: ${CLIENT_PLAN_WEEKS}-week progress guide`,
    })));

  const radarData = buildRadarDataFromScores(pillarScoresFromCategories(scores.categories));
  const previousRadarData = previousScores
    ? buildRadarDataFromScores(pillarScoresFromCategories(previousScores.categories))
    : undefined;
  const priorityFocus = buildPriorityFocus(scores, goalCtx);

  return {
    clientName,
    reportDate,
    trainingWeek,
    comparison,
    calculationVersion: '2026-11-16',
    overall,
    previousOverall,
    headline,
    goalPromise,
    welcome,
    focusFirst,
    goalLabels,
    roadmapCards,
    roadmapTarget,
    planSmartGoals,
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
  roadmapTarget: ClientNinetyDayTarget | null,
): string {
  const label =
    ASSESSMENT_OPTIONS.clientGoals.find((g) => g.value === goalCtx.primaryGoal)?.label ??
    'your goals';

  if (formData && goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
    const projected = projectClientTwelveWeekWeightLoss(formData, scores, goals);
    // Same rounded pace the roadmap prints, so the hero and roadmap never differ by 0.1.
    const kgPerMonth =
      roadmapTarget?.monthlyWeightChangeKg != null
        ? -roadmapTarget.monthlyWeightChangeKg
        : (projected?.lossKg ?? 0) / PLAN_CALENDAR_MONTHS;
    if (Math.round(kgPerMonth * 10) > 0) {
      const perMonth = formatKg1(kgPerMonth);
      const protectMuscle = goalCtx.hasBuildMuscle || goalCtx.hasBodyRecomp;
      return protectMuscle ? clientGoalPromiseRecomp(perMonth) : clientGoalPromiseWeightLoss(perMonth);
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
      return "You have a strong training base. We'll use it to hold on to muscle while the fat comes off.";
    }
    if (bodyComp && bodyComp.score < 60) {
      return 'Body composition is the main lever; everything else supports sustainable fat loss.';
    }
    return `Nutrition, steps, and strength training work together over the next ${CLIENT_PLAN_WEEKS} weeks.`;
  }

  if (goalCtx.primaryGoal === GOAL_BUILD_MUSCLE && movement && movement.score >= 85) {
    return 'You already move well, so we can train harder and lift heavier with confidence.';
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
  progressionRows: ClientReportProgressionRow[],
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
    progressionRows,
    contentMode,
    movementFindings,
    sideBalances: sectionId === 'strength' ? materialSideBalances(formData) : [],
    goalTieIn: buildPillarGoalTieIn(scoringId, pillarRole, goalCtx),
    pillarRole,
  };
}

function materialSideBalances(formData: FormData | undefined): ClientSideBalance[] {
  if (!formData) return [];
  const out: ClientSideBalance[] = [];
  const grip = assessSideImbalance(formData.gripLeftKg, formData.gripRightKg);
  if (grip?.material) out.push({ kind: 'grip', imbalance: grip });
  if (readLowerBody(formData)?.protocol === 'single-leg-sts-30sec') {
    const legs = assessSideImbalance(formData.singleLegStandLeftReps, formData.singleLegStandRightReps);
    if (legs?.material) out.push({ kind: 'legs', imbalance: legs });
  }
  return out;
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
    return `This is central to ${goalLabel.toLowerCase()}, so expect the biggest changes here.`;
  }
  if (role === 'secondary') {
    return `This supports ${goalLabel.toLowerCase()}, so we'll train it alongside your main goal.`;
  }
  if (role === 'supporting' && pillar === 'lifestyle') {
    if (goalCtx.primaryGoal === GOAL_WEIGHT_LOSS) {
      return `Habits that make fat loss easier, kept simple so ${goalLabel.toLowerCase()} stays the focus.`;
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
  const notable = findings.filter(isReportablePostureFinding);
  const sorted = reportablePostureFindings(results);
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
