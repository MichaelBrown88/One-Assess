import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { buildTapeMeasurementRows } from '@/lib/reports/clientProgressionProjections';
import type { FormData } from '@/contexts/FormContext';
import { TapeAnatomyFigure } from './TapeAnatomyFigure';
import { tapeFigureGender } from '@/lib/reports/tapeAnatomy';
import { cn } from '@/lib/utils';
import { withMeasuredChanges, comparisonDate, type AssessmentComparison } from '@/lib/reports/assessmentComparison';

interface TapeMeasurementsSectionProps {
  formData?: FormData;
  comparison?: AssessmentComparison | null;
}

export function TapeMeasurementsSection({ formData, comparison }: TapeMeasurementsSectionProps) {
  const readings = withMeasuredChanges(buildTapeMeasurementRows(formData), formData, comparison);
  const hasChanges = readings.some(row => row.measuredChange);
  const [open, setOpen] = useState(false);
  const action = open ? CLIENT_REPORT_COPY.v2TapeHide : CLIENT_REPORT_COPY.v2TapeShow;

  if (readings.length === 0) return null;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted/60"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-foreground">{CLIENT_REPORT_COPY.v2TapeHeading}</span>
            <span className="text-[12px] text-muted-foreground">
              {CLIENT_REPORT_COPY.v2TapeSites(readings.length)}
            </span>
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-muted-foreground">
            {CLIENT_REPORT_COPY.v2TapeHint}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border-medium bg-card px-3 py-1 text-[12px] font-medium text-foreground">
          {action}
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </span>
      </button>
      {open ? (
        <div className="mt-3 border border-border-medium bg-card px-2 py-5 sm:px-6">
          {comparison && hasChanges ? <p className="mb-5 px-2 text-xs leading-relaxed text-foreground-secondary">{CLIENT_REPORT_COPY.tapeChangeNote(comparisonDate(comparison.previousAssessedAt))}</p> : null}
          <TapeAnatomyFigure readings={readings} gender={tapeFigureGender(formData?.gender)} />
        </div>
      ) : null}
    </div>
  );
}
