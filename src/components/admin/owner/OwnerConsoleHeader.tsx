import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { OWNER_CONSOLE_COPY } from '@/constants/ownerConsole';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

interface OwnerConsoleHeaderProps {
  onSignOut: () => void;
}

const NAV_LINK_CLASS =
  'rounded-full px-3 py-1.5 text-sm font-medium transition-apple';

export function OwnerConsoleHeader({ onSignOut }: OwnerConsoleHeaderProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <div className="flex min-w-0 flex-wrap items-center gap-4 sm:gap-6">
          <div className="min-w-0">
            <p className="text-xs text-foreground-secondary">{OWNER_CONSOLE_COPY.product}</p>
            <h1 className="text-base font-semibold tracking-tight text-foreground">{OWNER_CONSOLE_COPY.title}</h1>
          </div>
          <nav className="flex items-center gap-1" aria-label={OWNER_CONSOLE_COPY.title}>
            <NavLink
              to={ROUTES.ADMIN}
              end
              className={({ isActive }) =>
                cn(
                  NAV_LINK_CLASS,
                  isActive ? 'bg-muted text-foreground' : 'text-foreground-secondary hover:text-foreground',
                )
              }
            >
              {OWNER_CONSOLE_COPY.nav.overview}
            </NavLink>
            <NavLink
              to={ROUTES.ADMIN_STUDIOS}
              className={({ isActive }) =>
                cn(
                  NAV_LINK_CLASS,
                  isActive ? 'bg-muted text-foreground' : 'text-foreground-secondary hover:text-foreground',
                )
              }
            >
              {OWNER_CONSOLE_COPY.nav.studios}
            </NavLink>
          </nav>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onSignOut}>
          {OWNER_CONSOLE_COPY.signOut}
        </Button>
      </div>
    </header>
  );
}
