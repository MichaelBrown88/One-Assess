import { useMemo } from 'react';
import { OWNER_CONSOLE_COPY } from '@/constants/ownerConsole';
import { formatPrice } from '@/lib/utils/currency';
import type { OwnerTrendPoint } from '@/lib/platform/ownerTrends';
import { OwnerTrendChart } from '@/components/admin/owner/OwnerTrendChart';

interface OwnerTrendBandProps {
  points: OwnerTrendPoint[];
  loading: boolean;
}

function formatRevenue(pence: number): string {
  return formatPrice(pence / 100, 'GBP');
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}

const SERIES_PRIMARY = 'hsl(var(--foreground))';
const SERIES_SECONDARY = 'hsl(var(--foreground-secondary))';

const REVENUE_SERIES = [
  { key: 'monthlyRevenueGbpPence' as const, label: OWNER_CONSOLE_COPY.trends.revenue, color: SERIES_PRIMARY },
];

const STUDIO_SERIES = [
  { key: 'payingStudios' as const, label: OWNER_CONSOLE_COPY.trends.paying, color: SERIES_PRIMARY },
  { key: 'trialStudios' as const, label: OWNER_CONSOLE_COPY.trends.trial, color: SERIES_SECONDARY },
];

const ASSESSMENT_SERIES = [
  { key: 'assessments' as const, label: OWNER_CONSOLE_COPY.trends.assessments, color: SERIES_PRIMARY },
];

export function OwnerTrendBand({ points, loading }: OwnerTrendBandProps) {
  const copy = OWNER_CONSOLE_COPY.trends;
  const charts = useMemo(
    () => [
      { title: copy.revenue, series: REVENUE_SERIES, formatY: formatRevenue, yMinSpan: 10_000 },
      { title: copy.studios, series: STUDIO_SERIES, formatY: formatCount, yMinSpan: 4 },
      { title: copy.assessments, series: ASSESSMENT_SERIES, formatY: formatCount, yMinSpan: 1 },
    ],
    [copy.assessments, copy.revenue, copy.studios],
  );

  if (loading) {
    return <p className="text-sm text-foreground-secondary">{OWNER_CONSOLE_COPY.loading}</p>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {charts.map((chart, index) => (
        <div key={chart.title} className={index === 2 ? 'lg:col-span-2' : undefined}>
          <OwnerTrendChart
            title={chart.title}
            windowLabel={copy.window}
            data={points}
            series={chart.series}
            formatY={chart.formatY}
            emptyLabel={copy.empty}
            yMinSpan={chart.yMinSpan}
          />
        </div>
      ))}
    </div>
  );
}
