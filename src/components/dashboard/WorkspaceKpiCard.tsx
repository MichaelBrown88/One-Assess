import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkspaceKpiCardProps {
  /** 11px uppercase label (e.g. "Active clients", "Assessments · 30d"). */
  label: string;
  /** Big numeric value, or "—" placeholder when data is missing. */
  value: string;
  /** Optional trend pill below the value. Use sparingly. */
  trend?: { dir: 'up' | 'down'; label: string };
  className?: string;
}

/**
 * One Assess workspace stat cell — used in a divided pulse band
 * (Clients roster, owner console). Hairline structure, not nested cards.
 */
export function WorkspaceKpiCard({ label, value, trend, className }: WorkspaceKpiCardProps) {
  return (
    <div className={cn('flex flex-col gap-1 px-4 py-4 sm:px-5', className)}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
        {value}
      </div>
      {trend ? (
        <div
          className={cn(
            'flex items-center gap-1 text-xs font-semibold',
            trend.dir === 'up' ? 'text-score-green-fg' : 'text-score-amber-fg',
          )}
        >
          {trend.dir === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.label}
        </div>
      ) : (
        <div className="h-[18px]" />
      )}
    </div>
  );
}
