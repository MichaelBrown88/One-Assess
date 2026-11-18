import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/services/firebase';
import { getPlatformAdmin } from '@/services/platformAdmin';
import { logger } from '@/lib/utils/logger';
import { ROUTES } from '@/constants/routes';
import type { PlatformAdmin } from '@/types/platform';

export function useOwnerAdminGate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate(ROUTES.ADMIN_LOGIN, { replace: true });
        return;
      }
      try {
        const adminData = await getPlatformAdmin(user.uid);
        if (cancelled) return;
        if (!adminData) {
          await signOut(auth);
          navigate(ROUTES.ADMIN_LOGIN, { replace: true });
          return;
        }
        setAdmin(adminData);
      } catch (error) {
        logger.error('owner admin gate failed', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [navigate]);

  const handleSignOut = useCallback(async () => {
    await signOut(getFirebaseAuth());
    navigate(ROUTES.ADMIN_LOGIN, { replace: true });
  }, [navigate]);

  return { loading, admin, handleSignOut };
}
