import type { ScoreCategory, ScoreSummary } from '@/lib/scoring';
import type { ScoreDetail } from '@/lib/scoring/types';
import { getPillarLabel } from '@/constants/pillars';
import { PILLAR_DETAIL_COPY, PILLAR_SUMMARY_COPY } from '@/constants/clientPillarSummaryCopy';

const PILLAR_LABEL_SHORT: Record<ScoreCategory['id'], string> = {
  bodyComp: 'body composition',
  strength: 'strength',
  cardio: 'fitness',
  movementQuality: 'movement quality',
  lifestyle: 'lifestyle',
};

const STRONG_DETAIL = 75;
const NUDGE_DETAIL = 50;

function measuredDetails(category: ScoreCategory): ScoreDetail[] {
  return (category.details ?? []).filter((d) => {
    if (!PILLAR_DETAIL_COPY[d.id]) return false;
    if (!Number.isFinite(d.score) || d.score <= 0) return false;
    const value = String(d.value ?? '').trim();
    return value !== '' && value !== '-';
  });
}

/**
 * Client-facing per-pillar summary: what's good, what's not, and why it
 * matters — built from the scored metrics, never from coach scoring labels.
 */
export function buildClientPillarSummary(
  category: ScoreCategory,
  previousScore: number | null | undefined,
): string {
  const score = Math.round(category.score ?? 0);
  const label = capitalise(
    PILLAR_LABEL_SHORT[category.id] ?? getPillarLabel(category.id, 'full').toLowerCase(),
  );

  if (!category.assessed) return PILLAR_SUMMARY_COPY.notAssessed(label);

  const improved = previousScore != null && previousScore > 0 && score > Math.round(previousScore);
  const declined = previousScore != null && previousScore > 0 && score < Math.round(previousScore);
  const trend = improved ? PILLAR_SUMMARY_COPY.improved : declined ? PILLAR_SUMMARY_COPY.declined : '';

  const details = measuredDetails(category);
  const best = [...details].sort((a, b) => b.score - a.score)[0];
  const weakest = [...details].sort((a, b) => a.score - b.score)[0];
  const strongLine = best && best.score >= STRONG_DETAIL ? PILLAR_DETAIL_COPY[best.id].strong : '';
  const focusLine =
    weakest && weakest.score < STRONG_DETAIL
      ? weakest.score < NUDGE_DETAIL
        ? PILLAR_DETAIL_COPY[weakest.id].focus
        : PILLAR_DETAIL_COPY[weakest.id].nudge
      : '';

  let body: string;
  if (strongLine || focusLine) {
    body = [strongLine, focusLine || PILLAR_SUMMARY_COPY.keepGoing].filter(Boolean).join(' ');
  } else if (score >= STRONG_DETAIL) {
    body = PILLAR_SUMMARY_COPY.bandStrong(label);
  } else if (score >= NUDGE_DETAIL) {
    body = PILLAR_SUMMARY_COPY.bandMid(label);
  } else {
    body = PILLAR_SUMMARY_COPY.bandLow(label);
  }

  return [trend, body].filter(Boolean).join(' ');
}

/**
 * Hero synthesis for clients — uses risk-pattern copy when present;
 * otherwise a plain-language rollup (no "amber band" / coach jargon).
 */
export function buildClientOverallSummary(
  scores: ScoreSummary,
  previousOverall: number | null | undefined,
): string {
  const synthesis = scores.synthesis ?? [];
  const ranked = [...synthesis].sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity),
  );
  const top = ranked[0];
  if (top?.description) return top.description;

  const overall = Math.round(scores.overall ?? 0);
  const cats = scores.categories ?? [];
  const assessed = cats.filter((c) => c.assessed);
  const total = assessed.length;

  const lowest = assessed.slice().sort((a, b) => a.score - b.score)[0];
  const focusBit = lowest
    ? ` Your lowest pillar is ${PILLAR_LABEL_SHORT[lowest.id] ?? lowest.title.toLowerCase()} at ${Math.round(lowest.score)}, a good place to focus first.`
    : '';

  const prev = previousOverall;
  const trendBit =
    prev != null && overall > Math.round(prev)
      ? ' You are up since your last assessment.'
      : prev != null && overall < Math.round(prev)
        ? ' You are down slightly since your last assessment.'
        : '';

  if (total === 0) {
    return `This assessment is still incomplete.${trendBit} Finish the remaining sections with your coach for a full picture.`;
  }

  const strong = assessed.filter((c) => c.score >= 75).length;
  const mid = assessed.filter((c) => c.score >= 50 && c.score < 75).length;
  const low = assessed.filter((c) => c.score < 50).length;

  const scoreLine = `Your overall score is ${overall} out of 100.`;

  if (overall >= 75) {
    return `${scoreLine} You are in a healthy range overall.${trendBit} ${strong} of ${total} pillars are strong. Keep building on that.${focusBit}`;
  }
  if (overall >= 50) {
    return `${scoreLine} You have a solid base with clear upside.${trendBit} ${strong} pillars are strong, ${mid} have room to grow${low > 0 ? `, and ${low} need more attention` : ''}.${focusBit}`;
  }
  return `${scoreLine} Several areas need focused work right now.${trendBit} ${low} of ${total} pillars are below where we want them.${focusBit}`;
}

/** Plain-language strength/focus lines when category bullets are sparse. */
export function buildClientPriorityFallbacks(
  scores: ScoreSummary,
): { strengths: string[]; focusAreas: string[] } {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  if (assessed.length === 0) {
    return { strengths: [], focusAreas: [] };
  }

  const ranked = [...assessed].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  const strengths: string[] = [];
  const focusAreas: string[] = [];

  if (top && top.score >= 55) {
    const label = PILLAR_LABEL_SHORT[top.id] ?? top.title.toLowerCase();
    const detail = top.strengths?.[0];
    strengths.push(
      detail
        ? `${capitalise(label)} (${Math.round(top.score)}): ${decapitalise(detail)}`
        : `${capitalise(label)} is your strongest pillar at ${Math.round(top.score)}.`,
    );
  }

  if (bottom && bottom.score < 75) {
    const label = PILLAR_LABEL_SHORT[bottom.id] ?? bottom.title.toLowerCase();
    const detail = bottom.weaknesses?.[0];
    focusAreas.push(
      detail
        ? `${capitalise(label)} (${Math.round(bottom.score)}): ${decapitalise(detail)}`
        : `${capitalise(label)} is the best place to focus next (${Math.round(bottom.score)}).`,
    );
  }

  return { strengths, focusAreas };
}

function severityRank(severity: 'low' | 'medium' | 'high'): number {
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

function capitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function decapitalise(s: string): string {
  if (!s) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}
