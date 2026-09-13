import type { ScoreSummary } from '@/lib/scoring';
import { getPillarLabel } from '@/constants/pillars';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';

const PILLAR_SHORT: Record<string, string> = {
  bodyComp: 'body composition',
  strength: 'strength',
  cardio: 'fitness',
  movementQuality: 'movement',
  lifestyle: 'lifestyle',
};

function pillarLabel(id: string): string {
  return PILLAR_SHORT[id] ?? getPillarLabel(id, 'full').toLowerCase();
}

function sentenceCase(label: string): string {
  if (!label) return label;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Two or three sentences for the AXIS hero: what the scores say, not a plan.
 */
export function buildOverallResultsSummary(
  scores: ScoreSummary,
  previousOverall: number | null,
): string {
  const assessed = (scores.categories ?? []).filter((c) => c.assessed);
  if (assessed.length === 0) return CLIENT_REPORT_COPY.v2HeroWelcomeFallback;

  const overall = Math.round(scores.overall ?? 0);
  const ranked = [...assessed].sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  const improved =
    previousOverall != null && previousOverall > 0 && overall > previousOverall;

  const picture =
    overall >= 75
      ? improved
        ? 'Your overall picture is strong — and it has improved since last time.'
        : 'Your overall picture is strong across the areas we measured.'
      : overall >= 55
        ? improved
          ? 'Your overall picture is solid, with a few clear gaps, and it has improved since last time.'
          : 'Your overall picture is solid, with a few clear gaps.'
        : improved
          ? 'This assessment shows a clear starting point, and you have already improved since last time.'
          : 'This assessment shows a clear starting point, with more work ahead.';

  if (!top || !bottom || top.id === bottom.id) {
    return `${picture} ${sentenceCase(pillarLabel(top?.id ?? 'lifestyle'))} is the main story from today.`;
  }

  const strengthLine =
    top.score >= 75
      ? `${sentenceCase(pillarLabel(top.id))} stands out as a real strength.`
      : `${sentenceCase(pillarLabel(top.id))} is currently your strongest area.`;

  const gapLine =
    bottom.score < 55
      ? `${sentenceCase(pillarLabel(bottom.id))} is the main thing holding the score back.`
      : `${sentenceCase(pillarLabel(bottom.id))} has the most room to grow.`;

  return `${picture} ${strengthLine} ${gapLine}`;
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
