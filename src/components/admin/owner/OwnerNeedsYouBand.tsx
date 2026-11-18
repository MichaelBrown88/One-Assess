import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import {
  OWNER_CONSOLE_COPY,
  OWNER_NEEDS_YOU_COPY,
  studioPrimaryLabel,
  studioSecondaryLabel,
} from '@/constants/ownerConsole';
import type { StudioSnapshot } from '@/types/ownerConsole';

interface OwnerNeedsYouBandProps {
  studios: StudioSnapshot[];
}

export function OwnerNeedsYouBand({ studios }: OwnerNeedsYouBandProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{OWNER_CONSOLE_COPY.needsYou.title}</h2>
        <p className="text-xs tabular-nums text-foreground-secondary">{studios.length}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {studios.length === 0 ? (
          <p className="px-4 py-8 text-sm text-foreground-secondary">{OWNER_CONSOLE_COPY.needsYou.empty}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-foreground-secondary">
                <th className="px-4 py-2.5 font-medium">{OWNER_CONSOLE_COPY.needsYou.studio}</th>
                <th className="px-4 py-2.5 font-medium">{OWNER_CONSOLE_COPY.needsYou.reason}</th>
              </tr>
            </thead>
            <tbody>
              {studios.map((studio) => {
                const secondary = studioSecondaryLabel(studio);
                return (
                  <tr key={studio.orgId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link to={ROUTES.ADMIN_ORGANIZATION(studio.orgId)} className="block hover:text-foreground">
                        <span className="font-medium text-foreground">{studioPrimaryLabel(studio)}</span>
                        {secondary ? (
                          <span className="mt-0.5 block text-xs text-foreground-secondary">{secondary}</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground-secondary">
                      {studio.needsYouReason
                        ? OWNER_NEEDS_YOU_COPY[studio.needsYouReason]
                        : OWNER_CONSOLE_COPY.needsYou.unactivated}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
