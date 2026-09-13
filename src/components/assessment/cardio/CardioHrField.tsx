import { CARDIO_RUN_SHEET_COPY as COPY } from '@/constants/phaseFormCopy';
import type { CardioRefMetricId, CardioRefSex } from '@/lib/cardio/cardioReference';
import { CardioHrBandPopover } from './CardioHrBandPopover';

interface CardioHrFieldProps {
  id: string;
  metricId: CardioRefMetricId;
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  age: number;
  gender: CardioRefSex;
  restingHr: number;
  peakHr: number;
  recoveryHr: number;
}

export function CardioHrField({
  id,
  metricId,
  value,
  onChange,
  onCommit,
  age,
  gender,
  restingHr,
  peakHr,
  recoveryHr,
}: CardioHrFieldProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          placeholder="—"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          className="h-12 w-28 rounded-lg border border-border bg-background px-4 text-xl font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <span className="text-sm font-semibold text-muted-foreground">{COPY.BPM_UNIT}</span>
      </div>
      <CardioHrBandPopover
        metricId={metricId}
        age={age}
        gender={gender}
        restingHr={restingHr}
        peakHr={peakHr}
        recoveryHr={recoveryHr}
      />
    </div>
  );
}
