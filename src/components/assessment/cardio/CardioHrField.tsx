import { numericIssue, numericWarning } from '@/lib/assessment/numericValidation';
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
  const issue = numericIssue(id, value);
  const warning = numericWarning(id, value);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <input
          id={id}
          aria-invalid={Boolean(issue)}
          aria-describedby={issue ? `${id}-error` : undefined}
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
      {warning && <p className="text-sm text-amber-800 dark:text-amber-300">{warning}</p>}
      {issue && <p id={`${id}-error`} role="alert" className="text-sm text-destructive">{issue}</p>}
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
