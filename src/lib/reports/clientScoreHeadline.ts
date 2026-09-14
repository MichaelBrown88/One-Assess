import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import { calculateAge } from '@/lib/scoring';
import { getPillarLabel } from '@/constants/pillars';
import { ageBracketFor } from '@/lib/cardio/cardioReference';
import {
  CLIENT_REPORT_COPY,
  clientHeroBestFindingLine,
  clientHeroImprovementsLine,
  clientHeroPlacementLine,
} from '@/constants/clientReport';

const PILLAR_SHORT: Record<string, string> = {
  bodyComp: 'body composition',
  strength: 'strength',
  cardio: 'fitness',
  movementQuality: 'movement',
  lifestyle: 'lifestyle',
};

export interface OverallSummaryProfile {
  dateOfBirth?: string;
  gender?: string;
}

function pillarLabel(id: string): string {
  return PILLAR_SHORT[id] ?? getPillarLabel(id, 'full').toLowerCase();
}

function sentenceCase(label: string): string {
  if (!label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function peerGroupLabel(dateOfBirth?: string, gender?: string): string | null {
  const age = dateOfBirth ? calculateAge(dateOfBirth) : 0;
  const sexRaw = (gender ?? '').trim().toLowerCase();
  const sex = sexRaw === 'female' ? 'women' : sexRaw === 'male' ? 'men' : null;
  if (age > 0) {
    const bracket = ageBracketFor(age).replace('-', '–');
    return sex ? `${sex} aged ${bracket}` : `people aged ${bracket}`;
  }
  return sex;
}

/** Lowest 2 pillars, plus a 3rd when it is still close to the 2nd. */
export function selectImprovementAreas(
  assessed: ScoreCategory[],
  bestId: string,
): ScoreCategory[] {
  const rest = assessed
    .filter((c) => c.id !== bestId)
    .sort((a, b) => a.score - b.score);
  if (rest.length <= 2) return rest;
  const third = rest[2];
  const second = rest[1];
  if (third.score <= 70 || third.score - second.score <= 8) {
    return rest.slice(0, 3);
  }
  return rest.slice(0, 2);
}

/**
 * Three-beat AXIS hero summary, the same shape every session:
 * 1. where the overall score sits vs age/sex norms
 * 2. best finding today
 * 3. two or three areas to improve
 *
 * Reassessments add a score delta on beat 1 only. First sessions never mention a prior.
 */
export function buildOverallResultsSummary(
  scores: ScoreSummary,
  previousOverall: number | null,
  profile?: OverallSummaryProfile | null,
): string {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  if (assessed.length === 0) return CLIENT_REPORT_COPY.v2HeroWelcomeFallback;

  const overall = Math.round(scores.overall ?? 0);
  const ranked = [...assessed].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const delta =
    previousOverall != null && previousOverall > 0 ? overall - Math.round(previousOverall) : null;

  const placement = clientHeroPlacementLine(
    overall,
    peerGroupLabel(profile?.dateOfBirth, profile?.gender),
    delta,
  );

  if (!top) return placement;

  const best = clientHeroBestFindingLine(sentenceCase(pillarLabel(top.id)));
  const gaps = selectImprovementAreas(assessed, top.id).map((c) => pillarLabel(c.id));
  const improve = clientHeroImprovementsLine(gaps);

  return [placement, best, improve].filter(Boolean).join(' ');
}

/**
 * Client-facing headline derived from scores — replaces fantasy archetype labels.
 */
export function buildClientScoreHeadline(scores: ScoreSummary): string | null {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  if (assessed.length === 0) return null;

  const ranked = [...assessed].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];

  const topLabel =
    PILLAR_SHORT[top.id] ?? getPillarLabel(top.id, 'full').toLowerCase();
  const bottomLabel =
    PILLAR_SHORT[bottom.id] ?? getPillarLabel(bottom.id, 'full').toLowerCase();

  if (top.id === bottom.id) {
    return `Focus on ${topLabel} — your main lever this block.`;
  }

  if (bottom.score < 55) {
    return `Strong ${topLabel}; ${bottomLabel} is the priority now.`;
  }

  if (top.score >= 75 && bottom.score >= 60) {
    return `Solid ${topLabel} and ${bottomLabel} still has room to grow.`;
  }

  return `Leading in ${topLabel}; next gains come from ${bottomLabel}.`;
}
