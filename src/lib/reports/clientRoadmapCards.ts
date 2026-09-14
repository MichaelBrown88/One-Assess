/**
 * High-level client roadmap cards — one behaviour theme per assessed area,
 * each with a few CONCRETE, referenceable prescriptions.
 *
 * Lead-magnet: a client who doesn't sign up still leaves with habits they
 * can run (easy talking-pace cardio, protein per meal, sleep, last meal).
 * No set/rep/%-1RM schemes. Deterministic from scores + goals + lifestyle.
 *
 * The AXIS report shows each prescription as its own short line.
 */

import type { FormData } from '@/contexts/FormContext';
import type { ClientGoalContext, PillarId } from '@/lib/goals/goalContext';

export interface ClientRoadmapCard {
  pillar: PillarId;
  /** Short label for the numbered kicker, e.g. "Fitness". */
  pillarLabel: string;
  /** Behaviour theme, e.g. "Build easy cardio fitness". */
  title: string;
  /** Concrete, referenceable levers — targets/ranges, never exact programming. */
  prescriptions: string[];
}

const PILLAR_LABELS: Record<PillarId, string> = {
  bodyComp: 'Body composition',
  strength: 'Strength',
  cardio: 'Fitness',
  movementQuality: 'Movement',
  lifestyle: 'Lifestyle',
};

type CardBody = Pick<ClientRoadmapCard, 'title' | 'prescriptions'>;

const PROTEIN_EVERY_MEAL = 'A palm-sized protein serving at every meal';

function cardioCard(score: number): CardBody {
  const habit =
    '2 easy, low-heart-rate cardio sessions a week — breathe through your nose, at a pace you can still talk.';
  if (score < 55) {
    return { title: 'Build easy cardio fitness', prescriptions: [habit] };
  }
  if (score <= 75) {
    return { title: 'Keep easy cardio in the week', prescriptions: [habit] };
  }
  return { title: 'Keep the fitness you have', prescriptions: [habit] };
}

function strengthCard(score: number): CardBody {
  const sessions = '3–4 lifting sessions a week.';
  const progress = 'Aim to add a little weight each week.';
  if (score < 55) {
    return { title: 'Build a strength habit', prescriptions: [sessions, progress] };
  }
  if (score <= 75) {
    return { title: 'Keep getting stronger', prescriptions: [sessions, progress] };
  }
  return { title: 'Keep the strength you\u2019ve built', prescriptions: [sessions, progress] };
}

function bodyCompCard(score: number, ctx: ClientGoalContext): CardBody {
  if (ctx.hasWeightLoss || ctx.hasBodyRecomp) {
    return {
      title: 'Lose fat, keep muscle',
      prescriptions: [
        `${PROTEIN_EVERY_MEAL}. Trim portions a little until your weight is moving the right way.`,
      ],
    };
  }
  if (ctx.hasBuildMuscle) {
    return {
      title: 'Fuel for muscle',
      prescriptions: [
        `${PROTEIN_EVERY_MEAL}. Eat enough that your weight holds or slowly rises.`,
      ],
    };
  }
  if (score < 60) {
    return {
      title: 'Look leaner while you get stronger',
      prescriptions: [
        `${PROTEIN_EVERY_MEAL}. Keep portions steady and let training change how you look.`,
      ],
    };
  }
  return {
    title: 'Hold your composition',
    prescriptions: [
      `${PROTEIN_EVERY_MEAL}. Keep portions about where they are if your weight is already steady.`,
    ],
  };
}

function movementCard(score: number): CardBody {
  const habit =
    'Warm up before you train, use a full range of motion, and stretch when you finish.';
  if (score < 60) {
    return { title: 'Train through a full range', prescriptions: [habit] };
  }
  if (score <= 75) {
    return { title: 'Move with more control', prescriptions: [habit] };
  }
  return { title: 'Move well, keep it', prescriptions: [habit] };
}

function lifestyleCard(formData: FormData | undefined): CardBody {
  const lines = [
    'Keep a regular bedtime, and finish your last meal 2–3 hours before you sleep.',
  ];

  const cups = parseFloat(formData?.caffeineCupsPerDay || '0');
  const lastCaffeine = formData?.lastCaffeineIntake || '';
  const cutoffHour = parseInt(lastCaffeine.split(':')[0] || '0', 10);
  if (cups >= 3 || cutoffHour >= 14) {
    lines.push('Stop caffeine 8 hours before bed so it doesn\u2019t bleed into your sleep.');
  }

  return {
    title: 'Sleep and recovery',
    prescriptions: lines.slice(0, 3),
  };
}

/**
 * One card per assessed area, in the order the pillars are given
 * (callers pass the goal-role-sorted list so priority order carries over).
 */
export function buildClientRoadmapCards(
  pillars: Array<{ scoringId: PillarId; score: number }>,
  formData: FormData | undefined,
  ctx: ClientGoalContext,
): ClientRoadmapCard[] {
  return pillars.map(({ scoringId, score }) => {
    const body =
      scoringId === 'cardio'
        ? cardioCard(score)
        : scoringId === 'strength'
          ? strengthCard(score)
          : scoringId === 'bodyComp'
            ? bodyCompCard(score, ctx)
            : scoringId === 'movementQuality'
              ? movementCard(score)
              : lifestyleCard(formData);

    return {
      pillar: scoringId,
      pillarLabel: PILLAR_LABELS[scoringId],
      ...body,
    };
  });
}
