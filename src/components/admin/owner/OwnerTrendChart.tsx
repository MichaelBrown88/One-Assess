import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatTrendTick, type OwnerTrendPoint } from '@/lib/platform/ownerTrends';

interface OwnerTrendSeries {
  key: keyof OwnerTrendPoint;
  label: string;
  color: string;
}

interface OwnerTrendChartProps {
  title: string;
  windowLabel: string;
  data: OwnerTrendPoint[];
  series: OwnerTrendSeries[];
  formatY: (value: number) => string;
  emptyLabel: string;
  yMinSpan?: number;
}

const GRID = 'hsl(var(--border))';
const TICK = 'hsl(var(--foreground-secondary))';
const TOOLTIP_STYLE = {
  background: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
};

export function OwnerTrendChart({
  title,
  windowLabel,
  data,
  series,
  formatY,
  emptyLabel,
  yMinSpan = 1,
}: OwnerTrendChartProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-foreground-secondary">{windowLabel}</p>
      </div>
      {data.length === 0 ? (
        <p className="flex h-56 items-center justify-center text-sm text-foreground-secondary">{emptyLabel}</p>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatTrendTick}
                stroke={TICK}
                tick={{ fill: TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={formatY}
                stroke={TICK}
                tick={{ fill: TICK, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={64}
                allowDecimals={false}
                domain={[0, (dataMax: number) => Math.max(Number(dataMax) || 0, yMinSpan)]}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(label) => formatTrendTick(String(label))}
                formatter={(value, name) => [formatY(Number(value ?? 0)), String(name)]}
              />
              {series.length > 1 ? (
                <Legend wrapperStyle={{ fontSize: 12, color: TICK }} />
              ) : null}
              {series.map((item) => (
                <Area
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.label}
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={0.08}
                  strokeWidth={1.75}
                  dot={false}
                  activeDot={{ r: 3, fill: 'hsl(var(--foreground))' }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
