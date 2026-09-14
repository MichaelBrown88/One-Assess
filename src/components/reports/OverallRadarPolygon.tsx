import React from 'react';
import { CHART_HEX } from '@/lib/design/chartColors';
import { scoreGrade, type ScoreGrade } from '@/lib/scoring/scoreColor';
import { CLIENT_PILLAR_LABELS, SCORING_ID_TO_SECTION_ID } from '@/constants/clientReport';
import { PILLAR_SCORE_ORDER, type RadarData } from '@/lib/reports/radarData';
import { cn } from '@/lib/utils';

interface OverallRadarPolygonProps {
  data: RadarData[];
  previousData?: RadarData[];
  compact?: boolean;
  /** Moderate plot beside the AXIS score ring. */
  hero?: boolean;
  onPillarSelect?: (sectionId: string) => void;
  className?: string;
  /** Use short plain-language pillar labels on public client reports. */
  clientFacingLabels?: boolean;
  /** Overall AXIS score — drives the hull colour. Falls back to the pillar average. */
  overallScore?: number;
}

const GRADE_HEX: Record<ScoreGrade, string> = {
  green: CHART_HEX.scoreGreen,
  amber: CHART_HEX.scoreAmber,
  red: CHART_HEX.scoreRed,
};

const GRADE_FG: Record<ScoreGrade, string> = {
  green: 'hsl(var(--score-green-fg))',
  amber: 'hsl(var(--score-amber-fg))',
  red: 'hsl(var(--score-red-fg))',
};

function displayPillarLabel(label: string, fullLabel: string | undefined, clientFacing: boolean): string {
  if (!clientFacing) return label;
  const key = fullLabel ?? label;
  return CLIENT_PILLAR_LABELS[key] ?? CLIENT_PILLAR_LABELS[label] ?? label;
}

function point(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function sectionIdForIndex(index: number): string | undefined {
  const id = PILLAR_SCORE_ORDER[index];
  return id ? SCORING_ID_TO_SECTION_ID[id] : undefined;
}

function valueAt(data: RadarData[], index: number, previous?: RadarData[]): number {
  const entry = data[index];
  if (!entry) return 0;
  if (previous) {
    const prev = previous.find((p) => p.name === entry.name);
    return prev?.value ?? entry.value;
  }
  return entry.value;
}

/**
 * Five-pillar radar. Single filled hull tinted by the overall score:
 * green when strong, amber for room to improve, red when low.
 */
export default function OverallRadarPolygon({
  data,
  previousData,
  compact = false,
  hero = false,
  onPillarSelect,
  className,
  clientFacingLabels = false,
  overallScore,
}: OverallRadarPolygonProps) {
  const n = data.length;
  if (n === 0) return null;

  const scoreForColor =
    overallScore ?? data.reduce((sum, d) => sum + Math.max(0, Math.min(100, d.value)), 0) / n;
  const hullColor = GRADE_HEX[scoreGrade(scoreForColor)];

  const size = hero ? 480 : compact ? 400 : 480;
  const cx = size / 2;
  const cy = size / 2;
  const baseR = hero ? 148 : compact ? 108 : 130;
  const labelR = hero ? baseR + 36 : compact ? baseR + 28 : baseR + 38;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const vertices = data.map((d, i) => {
    const r = (Math.max(0, Math.min(100, d.value)) / 100) * baseR;
    return { ...point(cx, cy, r, ang(i)), value: d.value, label: d.name, fullLabel: d.fullLabel };
  });

  const prevVertices = previousData
    ? data.map((d, i) => {
        const prevVal = valueAt(data, i, previousData);
        const r = (Math.max(0, Math.min(100, prevVal)) / 100) * baseR;
        return point(cx, cy, r, ang(i));
      })
    : null;

  const outerPts = data
    .map((_, i) => {
      const p = point(cx, cy, baseR, ang(i));
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');

  const hullPts = vertices.map((v) => `${v.x.toFixed(2)},${v.y.toFixed(2)}`).join(' ');

  const prevHullPts = prevVertices
    ? prevVertices.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    : null;

  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        compact ? 'min-h-[220px]' : hero ? 'h-[17.5rem] w-full overflow-visible' : 'min-h-[260px]',
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className={cn(
          'h-full w-full max-w-full',
          hero ? 'h-full max-h-[17.5rem] overflow-visible' : 'max-h-[320px]',
        )}
        role="img"
        aria-label="Five-pillar score radar"
      >
        <polygon
          points={outerPts}
          fill="none"
          stroke={CHART_HEX.gridLight}
          strokeWidth={1}
          opacity={0.85}
        />

        {data.map((_, i) => {
          const tip = point(cx, cy, baseR, ang(i));
          return (
            <line
              key={`spoke-${i}`}
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke={CHART_HEX.gridLight}
              strokeWidth={0.9}
              opacity={0.7}
            />
          );
        })}

        {prevHullPts ? (
          <polygon
            points={prevHullPts}
            fill="none"
            stroke={CHART_HEX.neutralStroke}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            opacity={0.7}
          />
        ) : null}

        <polygon
          points={hullPts}
          fill={hullColor}
          fillOpacity={hero ? 0.2 : 0.16}
          stroke={hullColor}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {vertices.map((v, i) => (
          <circle
            key={`dot-${i}`}
            cx={v.x}
            cy={v.y}
            r={hero ? 5.5 : compact ? 4.5 : 5.5}
            fill={hullColor}
            stroke="hsl(var(--card))"
            strokeWidth={2.5}
          />
        ))}

        {vertices.map((v, i) => {
          const prev = previousData?.find((p) => p.name === data[i]?.name);
          const improved = prev != null && v.value > prev.value;
          const regressed = prev != null && v.value < prev.value;
          if (!improved && !regressed) return null;
          const ringColor = improved ? CHART_HEX.scoreGreen : CHART_HEX.scoreRed;
          return (
            <circle
              key={`delta-${i}`}
              cx={v.x}
              cy={v.y}
              r={compact ? 8.5 : 10}
              fill="none"
              stroke={ringColor}
              strokeWidth={1.5}
              opacity={0.85}
            />
          );
        })}

        {data.map((d, i) => {
          const a = ang(i);
          const lp = point(cx, cy, labelR, a);
          const anchor: 'start' | 'middle' | 'end' =
            lp.x < cx - 8 ? 'end' : lp.x > cx + 8 ? 'start' : 'middle';
          const isAbove = lp.y < cy - 4;
          const isBelow = lp.y > cy + 4;
          const labelDy = isAbove ? (compact ? -6 : -8) : isBelow ? (compact ? 14 : 16) : 4;
          const sectionId = sectionIdForIndex(i);
          const clickable = Boolean(onPillarSelect && sectionId);
          const score = Math.round(Math.max(0, Math.min(100, d.value)));
          const name = displayPillarLabel(d.name, d.fullLabel ?? d.name, clientFacingLabels);

          return (
            <text
              key={`lbl-${i}`}
              x={lp.x}
              y={lp.y + labelDy}
              fontSize={hero ? 16 : compact ? 10 : 11}
              fontWeight={700}
              textAnchor={anchor}
              fill={hero ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
              className={clickable ? 'cursor-pointer' : undefined}
              onClick={
                clickable
                  ? () => {
                      if (sectionId) onPillarSelect?.(sectionId);
                    }
                  : undefined
              }
            >
              {name}
              <tspan
                dx={hero ? 7 : 5}
                fill={GRADE_FG[scoreGrade(score)]}
                fontWeight={700}
                className="tabular-nums"
              >
                {score}
              </tspan>
            </text>
          );
        })}
      </svg>
    </div>
  );
}
