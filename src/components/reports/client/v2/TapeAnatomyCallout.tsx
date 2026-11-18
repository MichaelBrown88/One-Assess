import type { PlacedTapeLabel } from '@/lib/reports/tapeAnatomy';
import { cn } from '@/lib/utils';
import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { formatMeasuredChange } from '@/lib/reports/assessmentComparison';

const LEADER_WIDTH = '1.25rem';

interface TapeAnatomyCalloutProps {
  callout: PlacedTapeLabel;
  value: string;
  unit?: string;
  figureHalf: number;
  measuredChange?: ClientReportProgressionRow['measuredChange'];
}

export function TapeAnatomyCallout({ callout, value, unit, figureHalf, measuredChange }: TapeAnatomyCalloutProps) {
  const side = callout.side;
  const half = `${figureHalf}px`;
  return (
    <>
      <TapeLeader side={side} anchor={callout.anchor} label={callout.label} figureHalf={half} />
      <div
        className={cn(
          'absolute flex -translate-y-1/2 items-center whitespace-nowrap',
          side === 'left' ? 'text-right' : 'text-left',
        )}
        style={{
          top: `${callout.label}%`,
          ...(side === 'left'
            ? { right: `calc(50% + ${half} + ${LEADER_WIDTH})` }
            : { left: `calc(50% + ${half} + ${LEADER_WIDTH})` }),
        }}
      >
        <span>
          <span className="block text-[12px] leading-none text-foreground">{callout.name}</span>
          <span className="mt-1 block text-sm font-semibold tabular-nums leading-none text-foreground">
            {value}
            {unit ? (
              <span className="ml-0.5 text-[10px] font-medium text-foreground-secondary">{unit}</span>
            ) : null}
          </span>
          {measuredChange ? <span className="mt-1 block text-[11px] font-medium leading-none text-foreground-secondary">{formatMeasuredChange(measuredChange)}</span> : null}
        </span>
      </div>
    </>
  );
}

function TapeLeader({
  side,
  anchor,
  label,
  figureHalf,
}: {
  side: 'left' | 'right';
  anchor: number;
  label: number;
  figureHalf: string;
}) {
  const top = Math.min(anchor, label);
  const span = Math.max(Math.abs(anchor - label), 0.6);
  const yAnchor = ((anchor - top) / span) * 100;
  const yLabel = ((label - top) / span) * 100;
  const path =
    side === 'right'
      ? `M 0 ${yAnchor} H 28 L 72 ${yLabel} H 100`
      : `M 100 ${yAnchor} H 72 L 28 ${yLabel} H 0`;

  return (
    <svg
      className={cn(
        'pointer-events-none absolute text-foreground/45',
        side === 'right' ? 'left-1/2' : 'right-1/2',
      )}
      style={{
        top: `${top}%`,
        height: `${span}%`,
        width: LEADER_WIDTH,
        ...(side === 'right' ? { marginLeft: figureHalf } : { marginRight: figureHalf }),
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
