import { ASSESSMENT_DRAFT_COPY } from '@/constants/assessmentDraft';
import { Button } from '@/components/ui/button';
import { UI_CLIENT_DETAIL } from '@/constants/ui';
import { ArrowRight, Link2, UserRound } from 'lucide-react';

export type ClientOverviewEmptyVariant = 'intake-pending' | 'intake-ready' | 'not-started' | 'in-progress';

export interface ClientOverviewEmptyProps {
  name: string;
  variant: ClientOverviewEmptyVariant;
  onPrimaryAction?: () => void;
  busy?: boolean;
}

const COPY: Record<
  ClientOverviewEmptyVariant,
  { title: string; body: string; cta: string | null; icon: typeof Link2 }
> = {
  'in-progress': { title: ASSESSMENT_DRAFT_COPY.SAVED_PROGRESS, body: ASSESSMENT_DRAFT_COPY.RESUME_DESCRIPTION, cta: ASSESSMENT_DRAFT_COPY.RESUME, icon: UserRound },
  'intake-pending': {
    title: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_PENDING_TITLE,
    body: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_PENDING_BODY,
    cta: null,
    icon: Link2,
  },
  'intake-ready': {
    title: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_READY_TITLE,
    body: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_READY_BODY,
    cta: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_READY_CTA,
    icon: UserRound,
  },
  'not-started': {
    title: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_NEW_TITLE,
    body: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_NEW_BODY,
    cta: UI_CLIENT_DETAIL.OVERVIEW_EMPTY_NEW_CTA,
    icon: UserRound,
  },
};

/** Minimal coach summary before any in-app assessment exists. */
export function ClientOverviewEmpty({ name, variant, onPrimaryAction, busy }: ClientOverviewEmptyProps) {
  const copy = COPY[variant];
  const Icon = copy.icon;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{name}</h1>
        <p className="text-sm text-muted-foreground">
          {variant === 'in-progress' ? ASSESSMENT_DRAFT_COPY.IN_PROGRESS : variant === 'intake-pending'
            ? UI_CLIENT_DETAIL.INTAKE_PENDING_PILL
            : variant === 'intake-ready'
              ? UI_CLIENT_DETAIL.INTAKE_READY_PILL
              : 'Not yet assessed'}
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-6 shadow-[0_1px_2px_rgba(15,15,15,0.04)] sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {UI_CLIENT_DETAIL.OVERVIEW_WHATS_NEXT}
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">{copy.title}</h2>
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
            {copy.cta && onPrimaryAction ? (
              <Button type="button" className="h-11 rounded-full px-6" onClick={onPrimaryAction} disabled={busy}>
                {busy ? ASSESSMENT_DRAFT_COPY.RESUMING : copy.cta}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
