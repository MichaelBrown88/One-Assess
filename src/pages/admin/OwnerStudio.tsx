import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OwnerStatusBadge } from '@/components/admin/owner/OwnerStatusBadge';
import {
  OwnerStudioFactList,
  OwnerStudioKpis,
  studioHealthLabel,
  studioMoneyFacts,
  studioUsageFacts,
} from '@/components/admin/owner/OwnerStudioDashboard';
import { useOwnerStudio } from '@/hooks/useOwnerStudio';
import { OWNER_CONSOLE_COPY, studioPrimaryLabel } from '@/constants/ownerConsole';

const OwnerStudio = () => {
  const { orgId } = useParams<{ orgId: string }>();
  const [confirmPause, setConfirmPause] = useState(false);
  const {
    loading,
    pausing,
    loggingIn,
    studio,
    isPaused,
    handleLogInAsThem,
    handlePause,
    handleResume,
  } = useOwnerStudio(orgId);

  if (loading) {
    return <p className="text-sm text-foreground-secondary">{OWNER_CONSOLE_COPY.loading}</p>;
  }

  if (!studio) {
    return <p className="text-sm text-foreground-secondary">{OWNER_CONSOLE_COPY.studio.notFound}</p>;
  }

  const health = studioHealthLabel(studio);

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            to={ROUTES.ADMIN_STUDIOS}
            className="mb-2 inline-block text-sm text-foreground-secondary hover:text-foreground"
          >
            {OWNER_CONSOLE_COPY.studio.back}
          </Link>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{studioPrimaryLabel(studio)}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-foreground-secondary">
              {OWNER_CONSOLE_COPY.buyerType[studio.buyerType]}
            </span>
            <OwnerStatusBadge studio={studio} />
            {health ? <span className="text-sm text-foreground-secondary">{health}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleLogInAsThem} disabled={loggingIn}>
            {OWNER_CONSOLE_COPY.studio.logInAsThem}
          </Button>
          {isPaused ? (
            <Button type="button" variant="secondary" onClick={handleResume} disabled={pausing}>
              {OWNER_CONSOLE_COPY.studio.resume}
            </Button>
          ) : (
            <Button type="button" variant="secondary" onClick={() => setConfirmPause(true)} disabled={pausing}>
              {OWNER_CONSOLE_COPY.studio.pause}
            </Button>
          )}
        </div>
      </div>

      <OwnerStudioKpis studio={studio} />

      <div className="grid gap-6 lg:grid-cols-2">
        <OwnerStudioFactList title={OWNER_CONSOLE_COPY.studio.money} facts={studioMoneyFacts(studio)} />
        <OwnerStudioFactList title={OWNER_CONSOLE_COPY.studio.usage} facts={studioUsageFacts(studio)} />
      </div>

      <AlertDialog open={confirmPause} onOpenChange={setConfirmPause}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{OWNER_CONSOLE_COPY.studio.pauseTitle}</AlertDialogTitle>
            <AlertDialogDescription>{OWNER_CONSOLE_COPY.studio.pauseBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{OWNER_CONSOLE_COPY.studio.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmPause(false);
                void handlePause();
              }}
            >
              {OWNER_CONSOLE_COPY.studio.pauseConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default OwnerStudio;
