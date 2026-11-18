import React from 'react';
import { CHART_HEX } from '@/lib/design/chartColors';
import { scoreGradeHex } from '@/lib/scoring/scoreColor';
import { cn } from '@/lib/utils';

interface MiniPillarRadarProps {
  /** Five scores: Body, Strength, Cardio, Movement, Lifestyle. */
  scores: number[];
  size?: number;
  /** Outline = empty / target slot (dashed hull). */
  variant?: 'filled' | 'outline';
  className?: string;
  /** Overall AXIS score — hull colour matches the client report radar. */
  overallScore?: number;
}

function point(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function averageScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return scores.reduce((sum, s) => sum + Math.max(0, Math.min(100, s)), 0) / scores.length;
}

/**
 * Compact five-pillar radar — same filled, score-coloured hull as the AXIS report.
 */
export function MiniPillarRadar({
  scores,
  size = 96,
  variant = 'filled',
  className,
  overallScore,
}: MiniPillarRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.38;
  const n = Math.max(scores.length, 5);
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const isOutline = variant === 'outline';
  const hullColor = scoreGradeHex(overallScore ?? averageScore(scores));

  const vertices = scores.slice(0, n).map((s, i) => {
    const r = (Math.max(0, Math.min(100, s)) / 100) * baseR;
    return point(cx, cy, r, ang(i));
  });

  const outerPts = Array.from({ length: n }, (_, i) => {
    const p = point(cx, cy, baseR, ang(i));
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(' ');

  const hullPts = vertices.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('block shrink-0', className)}
      role="img"
      aria-label="Five-pillar score shape"
    >
      <polygon
        points={outerPts}
        fill="none"
        stroke={CHART_HEX.gridLight}
        strokeWidth={1}
        opacity={0.85}
      />
      {Array.from({ length: n }, (_, i) => {
        const p = point(cx, cy, baseR, ang(i));
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={CHART_HEX.gridLight}
            strokeWidth={0.9}
            opacity={0.7}
          />
        );
      })}
      <polygon
        points={hullPts}
        fill={isOutline ? 'none' : hullColor}
        fillOpacity={isOutline ? 0 : 0.2}
        stroke={hullColor}
        strokeWidth={isOutline ? 1.2 : 1.6}
        strokeLinejoin="round"
        strokeDasharray={isOutline ? '3 2' : undefined}
        opacity={isOutline ? 0.75 : 1}
      />
      {vertices.map((p, i) => (
        <circle
          key={`v-${i}`}
          cx={p.x}
          cy={p.y}
          r={size >= 80 ? 3 : 2}
          fill={hullColor}
          stroke="hsl(var(--card))"
          strokeWidth={1.5}
          opacity={isOutline ? 0.55 : 1}
        />
      ))}
    </svg>
  );
}
