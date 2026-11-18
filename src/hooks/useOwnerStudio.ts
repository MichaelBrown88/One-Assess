import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirebaseAuth } from '@/services/firebase';
import { pauseSubscription, reactivateSubscription } from '@/services/platformAdmin';
import { getStudioSnapshot } from '@/services/platform/ownerConsole';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';
import { ROUTES } from '@/constants/routes';
import { OWNER_CONSOLE_COPY } from '@/constants/ownerConsole';
import { OWNER_PAY_STATUS } from '@shared/ownerConsole';
import type { StudioSnapshot } from '@/types/ownerConsole';

export function useOwnerStudio(orgId: string | undefined) {
  const navigate = useNavigate();
  const { startImpersonation } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [studio, setStudio] = useState<StudioSnapshot | null>(null);

  const load = useCallback(async () => {
    if (!orgId) {
      setStudio(null);
      return;
    }
    setStudio(await getStudioSnapshot(orgId));
  }, [orgId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await load();
      } catch (error) {
        logger.error('owner studio load failed', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const adminUid = getFirebaseAuth().currentUser?.uid;

  const handleLogInAsThem = useCallback(async () => {
    if (!orgId || !studio) return;
    setLoggingIn(true);
    try {
      await startImpersonation(orgId, studio.name || OWNER_CONSOLE_COPY.unnamedStudio);
      navigate(ROUTES.DASHBOARD);
    } catch (error) {
      logger.error('owner studio login-as failed', error);
    } finally {
      setLoggingIn(false);
    }
  }, [navigate, orgId, startImpersonation, studio]);

  const handlePause = useCallback(async () => {
    if (!orgId || !adminUid) return;
    setPausing(true);
    try {
      await pauseSubscription(orgId, adminUid);
      setStudio((current) =>
        current ? { ...current, payStatus: OWNER_PAY_STATUS.PAUSED } : current,
      );
    } catch (error) {
      logger.error('owner studio pause failed', error);
    } finally {
      setPausing(false);
    }
  }, [adminUid, orgId]);

  const handleResume = useCallback(async () => {
    if (!orgId || !adminUid) return;
    setPausing(true);
    try {
      await reactivateSubscription(orgId, adminUid);
      setStudio((current) =>
        current ? { ...current, payStatus: OWNER_PAY_STATUS.PAYING } : current,
      );
    } catch (error) {
      logger.error('owner studio resume failed', error);
    } finally {
      setPausing(false);
    }
  }, [adminUid, orgId]);

  return {
    loading,
    pausing,
    loggingIn,
    studio,
    isPaused: studio?.payStatus === OWNER_PAY_STATUS.PAUSED,
    handleLogInAsThem,
    handlePause,
    handleResume,
  };
}
