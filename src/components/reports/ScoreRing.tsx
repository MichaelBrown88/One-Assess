import React, { useId } from 'react';
import { scoreGrade, type ScoreGrade } from '@/lib/scoring/scoreColor';
import { cn } from '@/lib/utils';

/**
 * Partial-arc score gauge — the AXIS Score™ visual. A 260° arc with the
 * bottom open, score-tinted fill, large numeral inside.
 *
 * Inspired by the original `StartingPointSection` gauge; extracted so any
 * surface (hero, side cards, etc.) can drop in a consistent score visual.
 */

interface ScoreRingProps {
  score: number;
  /** Size in pixels (square). Default 180. */
  size?: number;
  /** Stroke width in viewbox units (0–100). Default 7. */
  strokeWidth?: number;
  /** Display label. Omit when the parent renders the caption. */
  label?: string;
  className?: string;
  /** Stroke follows the score band (green / amber / red). Defaults to true. */
  scoreTinted?: boolean;
}

const ARC_LENGTH = 190; // out of 264 (2π·42) ≈ 72% sweep, leaves ~100° bottom gap
const CIRCUMFERENCE = 264;
const ARC_ROTATION_DEG = 140;

const GRADE_GRADIENT: Record<ScoreGrade, { from: string; to: string }> = {
  green: { from: 'hsl(var(--score-green))', to: 'hsl(var(--score-green-fg))' },
  amber: { from: 'hsl(var(--score-amber))', to: 'hsl(var(--score-amber-fg))' },
  red: { from: 'hsl(var(--score-red))', to: 'hsl(var(--score-red-fg))' },
};

export function ScoreRing({
  score,
  size = 180,
  strokeWidth = 7,
  label,
  className,
  scoreTinted = true,
}: ScoreRingProps) {
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * ARC_LENGTH;
  const compactNumerals = size <= 130;
  const grade = scoreGrade(score);
  const gradientId = `${useId().replace(/:/g, '')}ring`;
  const stroke = scoreTinted ? `url(#${gradientId})` : 'hsl(var(--foreground))';
  const stops = GRADE_GRADIENT[grade];

  return (
    <div className={cn('inline-flex flex-col items-center', className)} style={{ width: size }}>
      {label ? (
        <span className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="h-full w-full" viewBox="-4 -4 108 108" aria-hidden>
          {scoreTinted ? (
            <defs>
              <linearGradient id={gradientId} x1="12%" y1="8%" x2="88%" y2="92%">
                <stop offset="0%" stopColor={stops.from} stopOpacity={0.55} />
                <stop offset="42%" stopColor={stops.from} />
                <stop offset="100%" stopColor={stops.to} />
              </linearGradient>
            </defs>
          ) : null}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            className="stroke-border"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
            transform={`rotate(${ARC_ROTATION_DEG} 50 50)`}
          />
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="transparent"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            transform={`rotate(${ARC_ROTATION_DEG} 50 50)`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className={
              compactNumerals
                ? 'text-4xl font-bold tabular-nums tracking-[-0.02em] text-foreground sm:text-[2.65rem]'
                : 'text-4xl font-bold tabular-nums tracking-[-0.02em] text-foreground sm:text-[2.75rem]'
            }
          >
            {score || '—'}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            / 100
          </span>
        </div>
      </div>
    </div>
  );
}
