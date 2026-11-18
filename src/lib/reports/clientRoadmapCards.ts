import type { FormData } from '@/contexts/FormContext';
import type { ClientGoalContext, ClientGoalId, PillarId } from '@/lib/goals/goalContext';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';
import { CLIENT_PLAN_COPY as COPY } from '@/constants/clientPlanCopy';

export interface ClientRoadmapCard {
  goalId: ClientGoalId;
  label: string;
  smartGoal: string;
  how: string;
  track: string;
  review: string;
  score: number | null;
  pillar: PillarId;
  pillarLabel: string;
  title: string;
  prescriptions: string[];
}
export interface RoadmapCardBuildOptions {
  monthlyWeightChangeKg?: number | null;
  scoresByPillar?: Partial<Record<PillarId, number>>;
}
const PRIMARY_PILLAR: Record<ClientGoalId, PillarId> = {
  'weight-loss': 'bodyComp', 'build-muscle': 'bodyComp', 'body-recomposition': 'bodyComp',
  'build-strength': 'strength', 'improve-fitness': 'cardio', 'general-health': 'lifestyle',
};
type CardBody = Pick<ClientRoadmapCard, 'smartGoal' | 'how' | 'track' | 'review'>;
function bodyFor(goal: ClientGoalId, ctx: ClientGoalContext, pace?: number | null): CardBody {
  switch (goal) {
    case 'weight-loss': return {
      smartGoal: pace != null ? pace < 0 ? COPY.lossTitle(pace) : COPY.lossMaintain : COPY.lossNoEstimate,
      how: COPY.lossHow, track: COPY.lossTrack, review: COPY.lossReview,
    };
    case 'build-muscle': return {
      smartGoal: ctx.hasWeightLoss ? COPY.muscleCutTitle : COPY.muscleTitle,
      how: COPY.muscleHow, track: COPY.muscleTrack, review: COPY.muscleReview,
    };
    case 'body-recomposition': return {
      smartGoal: COPY.recompTitle, how: COPY.recompHow, track: COPY.muscleTrack, review: COPY.muscleReview,
    };
    case 'build-strength': return {
      smartGoal: COPY.strengthTitle, how: COPY.strengthHow, track: COPY.strengthTrack, review: COPY.strengthReview,
    };
    case 'improve-fitness': return {
      smartGoal: COPY.fitnessTitle, how: COPY.fitnessHow, track: COPY.fitnessTrack, review: COPY.fitnessReview,
    };
    case 'general-health': return {
      smartGoal: COPY.healthTitle, how: COPY.healthHow, track: COPY.healthTrack, review: COPY.healthReview,
    };
  }
}
/** One entry per stated goal. Actions do not depend on buying coaching. */
export function buildClientRoadmapCards(
  pillars: { scoringId: PillarId; score: number }[],
  _formData: FormData | undefined,
  ctx: ClientGoalContext,
  options: RoadmapCardBuildOptions = {},
): ClientRoadmapCard[] {
  return [...new Set(ctx.allGoals)].map(goalId => {
    const body = bodyFor(goalId, ctx, options.monthlyWeightChangeKg);
    const pillar = PRIMARY_PILLAR[goalId];
    const label = ASSESSMENT_OPTIONS.clientGoals.find(g => g.value === goalId)?.label ?? goalId;
    return { goalId, label, ...body, pillar, pillarLabel: label, title: body.smartGoal,
      prescriptions: [body.how], score: options.scoresByPillar?.[pillar] ?? pillars.find(p => p.scoringId === pillar)?.score ?? null };
  });
}
