/**
 * Coach-facing cue when analyzer segmental L/R lean mass differs materially.
 * Pure helper for future coach UI — not shown on the client AXIS report.
 */

import { safeParse } from '@/lib/utils/numbers';

/** Relative L/R gap (vs heavier side) that warrants a short coach cue. */
export const SEGMENTAL_IMBALANCE_MATERIAL_PCT = 8;

export type SegmentalLeanInputs = {
  segmentalArmLeftKg?: string | number | null;
  segmentalArmRightKg?: string | number | null;
  segmentalLegLeftKg?: string | number | null;
  segmentalLegRightKg?: string | number | null;
};

function relativeGapPct(left: number, right: number): number {
  const hi = Math.max(left, right);
  const lo = Math.min(left, right);
  if (hi <= 0) return 0;
  return ((hi - lo) / hi) * 100;
}

function sideLabel(left: number, right: number): 'left' | 'right' {
  return left < right ? 'left' : 'right';
}

/**
 * Returns a short coach cue when arm and/or leg L/R gap is material; otherwise null.
 */
export function segmentalImbalanceCue(input: SegmentalLeanInputs): string | null {
  const armL = safeParse(input.segmentalArmLeftKg);
  const armR = safeParse(input.segmentalArmRightKg);
  const legL = safeParse(input.segmentalLegLeftKg);
  const legR = safeParse(input.segmentalLegRightKg);

  const parts: string[] = [];

  if (armL > 0 && armR > 0) {
    const gap = relativeGapPct(armL, armR);
    if (gap >= SEGMENTAL_IMBALANCE_MATERIAL_PCT) {
      parts.push(`Arms: ${sideLabel(armL, armR)} lighter (~${gap.toFixed(0)}% gap)`);
    }
  }

  if (legL > 0 && legR > 0) {
    const gap = relativeGapPct(legL, legR);
    if (gap >= SEGMENTAL_IMBALANCE_MATERIAL_PCT) {
      parts.push(`Legs: ${sideLabel(legL, legR)} lighter (~${gap.toFixed(0)}% gap)`);
    }
  }

  if (parts.length === 0) return null;
  return parts.join('. ') + '.';
}
