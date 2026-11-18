import type { ClientReportProgressionRow } from '@/lib/reports/clientProgressionRows';
import { formatProgressionChange } from '@/lib/reports/formatProgressionChange';
import { CLIENT_REPORT_COPY } from '@/constants/clientReport';
import { CLIENT_PLAN_COPY } from '@/constants/clientPlanCopy';
import { cn } from '@/lib/utils';
import { formatMeasuredChange } from '@/lib/reports/assessmentComparison';

interface ClientProgressionTableProps {
  rows: ClientReportProgressionRow[];
  className?: string;
  valueLayout?: 'numeric' | 'text';
}
export function ClientProgressionTable({ rows, className, valueLayout = 'numeric' }: ClientProgressionTableProps) {
  if (!rows.length) return null;
  return (
    <div className={cn('mt-4 border border-border-medium bg-card', className)}>
      <table className="w-full table-fixed border-collapse text-sm">
        <caption className="sr-only">{rows.some(row => row.measuredChange) ? CLIENT_REPORT_COPY.measuredAndEstimatedHeading : CLIENT_PLAN_COPY.changeCaption}</caption>
        <colgroup><col className="w-[34%]" /><col className="w-[20%]" /><col className="w-[23%]" /><col className="w-[23%]" /></colgroup>
        <thead className="bg-muted text-foreground-secondary">
          <tr className="text-[11px]">
            <th scope="col" className="px-3 py-3 text-left font-medium sm:px-4">{CLIENT_REPORT_COPY.progressionMetricCol}</th>
            <th scope="col" className="px-1 py-3 text-right font-medium sm:px-3">{CLIENT_REPORT_COPY.progressionNowCol}</th>
            <th scope="col" className="px-1 py-3 text-right font-medium sm:px-3">{CLIENT_REPORT_COPY.progressionOneMonthCol}</th>
            <th scope="col" className="px-2 py-3 text-right font-medium sm:px-4">{CLIENT_REPORT_COPY.progressionTwelveWeekCol}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.name} className={cn('border-t border-border-medium', index % 2 === 1 && 'bg-muted/50')}>
              <th scope="row" className="break-words px-3 py-4 text-left text-[13px] font-medium leading-snug text-foreground sm:px-4 sm:text-sm">
                {row.name}
                {row.detail ? <span className="mt-1 block text-xs font-normal text-foreground-secondary">{row.detail}</span> : null}
              </th>
              <td className="px-1 py-4 text-right align-middle tabular-nums sm:px-3">
                <span className="font-semibold text-foreground">{row.current}</span>
                {row.unit ? <span className="mt-1 block text-[11px] text-foreground-secondary">{row.unit}</span> : null}
                {row.measuredChange ? <span aria-label={`${CLIENT_REPORT_COPY.measuredChangeLabel}: ${formatMeasuredChange(row.measuredChange)}`} className="mt-2 block text-[11px] font-medium leading-tight text-foreground-secondary">{formatMeasuredChange(row.measuredChange)}</span> : null}
              </td>
              {(['month', 'plan'] as const).map(horizon => {
                const change = valueLayout === 'numeric' ? formatProgressionChange(row, horizon) : { value: row.twelveWeeks };
                return (
                  <td key={horizon} className="break-words px-2 py-4 text-right align-middle tabular-nums sm:px-4">
                    <span className="text-[13px] font-semibold text-foreground sm:text-sm">{change.value}</span>
                    {change.unit || change.detail ? <span className="mt-1 block text-[11px] leading-tight text-foreground-secondary">{change.detail ?? change.unit}</span> : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
