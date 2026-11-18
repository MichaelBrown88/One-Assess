import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/routes';
import {
  assessmentCountLabel,
  formatOwnerDay,
  OWNER_CONSOLE_COPY,
  studioPrimaryLabel,
  studioSecondaryLabel,
} from '@/constants/ownerConsole';
import { OwnerStatusBadge } from '@/components/admin/owner/OwnerStatusBadge';
import type { StudioSnapshot } from '@/types/ownerConsole';

interface OwnerStudioListBandProps {
  studios: StudioSnapshot[];
  search: string;
  onSearchChange: (value: string) => void;
}

export function OwnerStudioListBand({ studios, search, onSearchChange }: OwnerStudioListBandProps) {
  const cols = OWNER_CONSOLE_COPY.studios.columns;
  return (
    <section>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-semibold text-foreground">{OWNER_CONSOLE_COPY.studios.title}</h2>
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={OWNER_CONSOLE_COPY.searchPlaceholder}
          className="h-9 sm:max-w-xs"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        {studios.length === 0 ? (
          <p className="px-4 py-8 text-sm text-foreground-secondary">{OWNER_CONSOLE_COPY.studios.empty}</p>
        ) : (
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-foreground-secondary">
                <th className="px-4 py-2.5 font-medium">{cols.studio}</th>
                <th className="px-4 py-2.5 font-medium">{cols.type}</th>
                <th className="px-4 py-2.5 font-medium">{cols.joined}</th>
                <th className="px-4 py-2.5 font-medium">{cols.status}</th>
                <th className="px-4 py-2.5 text-right font-medium">{cols.assessments}</th>
                <th className="px-4 py-2.5 font-medium">{cols.lastActivity}</th>
              </tr>
            </thead>
            <tbody>
              {studios.map((studio) => {
                const secondary = studioSecondaryLabel(studio);
                return (
                  <tr key={studio.orgId} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <Link to={ROUTES.ADMIN_ORGANIZATION(studio.orgId)} className="block">
                        <span className="font-medium text-foreground">{studioPrimaryLabel(studio)}</span>
                        {secondary ? (
                          <span className="mt-0.5 block text-xs text-foreground-secondary">{secondary}</span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground-secondary">
                      {OWNER_CONSOLE_COPY.buyerType[studio.buyerType]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground-secondary">
                      {formatOwnerDay(studio.joinedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <OwnerStatusBadge studio={studio} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {assessmentCountLabel(studio.assessmentCount)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-foreground-secondary">
                      {studio.lastActivityAt
                        ? formatOwnerDay(studio.lastActivityAt)
                        : OWNER_CONSOLE_COPY.studios.lastActivityNone}
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
