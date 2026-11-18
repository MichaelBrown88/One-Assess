import { useMemo } from 'react';
import { OWNER_CONSOLE_COPY } from '@/constants/ownerConsole';
import { payMixFromStudios } from '@/lib/platform/ownerTrends';
import type { StudioSnapshot } from '@/types/ownerConsole';

interface OwnerPayMixBandProps {
  studios: StudioSnapshot[];
}

export function OwnerPayMixBand({ studios }: OwnerPayMixBandProps) {
  const rows = useMemo(() => payMixFromStudios(studios), [studios]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{OWNER_CONSOLE_COPY.mix.title}</h2>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-foreground-secondary">{OWNER_CONSOLE_COPY.studios.empty}</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.key}
                className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 border-b border-border px-4 py-3 last:border-0"
              >
                <span className="text-sm text-foreground">{OWNER_CONSOLE_COPY.payStatus[row.key]}</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${row.pct}%` }} />
                </div>
                <span className="text-right text-sm tabular-nums text-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
