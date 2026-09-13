import React from 'react';
import { Dumbbell, Heart, Scale, Sun, Zap, type LucideIcon } from 'lucide-react';
import { CHART_PILLAR_COLOR_ORDER } from '@/lib/design/chartColors';
import { SCORE_COLORS, scoreGrade } from '@/lib/scoring/scoreColor';
import type { PillarKey } from '@/lib/reports/radarData';
import { cn } from '@/lib/utils';

interface PillarScoreBadgeProps {
  pillar: PillarKey;
  score: number;
  size?: number;
  className?: string;
  /** When false, show only the numeral — used on the client AXIS scorecard. */
  showIcon?: boolean;
}

const PILLAR_INDEX: Record<PillarKey, number> = {
  bodyComp: 0,
  strength: 1,
  cardio: 2,
  movementQuality: 3,
  lifestyle: 4,
};

const PILLAR_ICONS: Record<PillarKey, LucideIcon> = {
  bodyComp: Scale,
  strength: Dumbbell,
  cardio: Heart,
  movementQuality: Zap,
  lifestyle: Sun,
};

function scoreToneClass(score: number): string {
  return SCORE_COLORS[scoreGrade(score)].text;
}

/**
 * Pillar score tile — icon + numeral on a tinted panel (replaces petal bloom badge).
 */
export function PillarScoreBadge({
  pillar,
  score,
  size = 56,
  className,
  showIcon = true,
}: PillarScoreBadgeProps) {
  const colour = CHART_PILLAR_COLOR_ORDER[PILLAR_INDEX[pillar]];
  const Icon = PILLAR_ICONS[pillar];
  const safe = Math.round(Math.max(0, Math.min(100, score)));
  const iconSize = Math.round(size * 0.22);
  const fontSize = Math.round(size * (showIcon ? 0.34 : 0.42));
  const grade = scoreGrade(safe);

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 flex-col items-center justify-center gap-0.5',
        showIcon ? 'rounded-xl ring-1 ring-border/50' : cn('rounded-full', SCORE_COLORS[grade].pill),
        className,
      )}
      style={
        showIcon
          ? {
              width: size,
              height: size,
              backgroundColor: `${colour}18`,
            }
          : { width: size, height: size }
      }
      aria-hidden
    >
      {showIcon ? (
        <Icon className="opacity-80" style={{ width: iconSize, height: iconSize, color: colour }} />
      ) : null}
      <span
        className={cn('font-bold tabular-nums leading-none', scoreToneClass(safe))}
        style={{ fontSize }}
      >
        {safe || '—'}
      </span>
    </span>
  );
}

export type { PillarKey };
