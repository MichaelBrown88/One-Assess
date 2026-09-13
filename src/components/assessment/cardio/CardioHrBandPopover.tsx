import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CARDIO_REFERENCE_COPY } from '@/constants/cardioReference';
import {
  buildCardioReference,
  type CardioRefBand,
  type CardioRefMetricChart,
  type CardioRefMetricId,
  type CardioRefSex,
} from '@/lib/cardio/cardioReference';
import { cn } from '@/lib/utils';

const BAND_ROW: Record<CardioRefBand, string> = {
  excellent: 'bg-score-green/10 text-score-green-fg',
  good: 'bg-score-green/10 text-score-green-fg',
  average: 'bg-score-amber/15 text-score-amber-fg',
  poor: 'bg-score-red/10 text-score-red-fg',
};

interface CardioHrBandPopoverProps {
  metricId: CardioRefMetricId;
  age: number;
  gender: CardioRefSex;
  restingHr: number;
  peakHr: number;
  recoveryHr: number;
}

export function CardioHrBandPopover({
  metricId,
  age,
  gender,
  restingHr,
  peakHr,
  recoveryHr,
}: CardioHrBandPopoverProps) {
  const safeAge = age > 0 ? age : 35;
  const chart = buildCardioReference({
    age: safeAge,
    gender,
    restingHr,
    peakHr,
    recoveryHr,
  });
  const metric = chart.metrics.find((item) => item.id === metricId);
  if (!metric) return null;

  const recoveryWaitingOnPeak = metricId === 'hrr' && peakHr <= 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-[12px] font-semibold text-foreground-secondary hover:bg-muted hover:text-foreground"
        >
          {CARDIO_REFERENCE_COPY.trigger}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        collisionPadding={16}
        className="w-[min(22rem,calc(100vw-2rem))] border-border bg-card p-4 text-card-foreground shadow-xl"
      >
        <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">
          {CARDIO_REFERENCE_COPY.title}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {CARDIO_REFERENCE_COPY.subtitle(chart.bracketLabel)}
        </p>
        <div className="mt-3">
          <MetricChart metric={metric} />
        </div>
        {recoveryWaitingOnPeak ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {CARDIO_REFERENCE_COPY.recoveryNeedsPeak}
          </p>
        ) : null}
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {CARDIO_REFERENCE_COPY.footnote}
        </p>
      </PopoverContent>
    </Popover>
  );
}

function MetricChart({ metric }: { metric: CardioRefMetricChart }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] font-semibold text-foreground">{metric.label}</p>
        <p className="text-[12px] font-semibold tabular-nums text-foreground">{metric.valueLabel}</p>
      </div>
      <p className="text-[11px] text-muted-foreground">{metric.hint}</p>
      <ul className="mt-1.5 space-y-0.5">
        {metric.ranges.map((row) => {
          const active = metric.band === row.band;
          return (
            <li
              key={row.band}
              className={cn(
                'flex items-center justify-between rounded-sm px-2 py-1 text-[11px]',
                active ? BAND_ROW[row.band] : 'text-muted-foreground',
              )}
            >
              <span className="font-medium">
                {CARDIO_REFERENCE_COPY.bands[row.band]}
                {active ? ` · ${CARDIO_REFERENCE_COPY.yourValue}` : ''}
              </span>
              <span className="tabular-nums">{row.rangeLabel}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
