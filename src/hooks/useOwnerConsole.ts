import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getOwnerPulse,
  listStudioSnapshots,
  listStudiosNeedingYou,
  rebuildOwnerConsole,
} from '@/services/platform/ownerConsole';
import { logger } from '@/lib/utils/logger';
import type { OwnerPulse, StudioSnapshot } from '@/types/ownerConsole';
import { emptyWeekCounts, shouldSurfaceNeedsYou } from '@shared/ownerConsole';

const EMPTY_PULSE: OwnerPulse = {
  weekStartsAt: null,
  thisWeek: emptyWeekCounts(),
  lastWeek: emptyWeekCounts(),
  payingStudios: 0,
  monthlyRevenueGbpPence: 0,
};

const IDENTITY_BACKFILL_KEY = 'oa-owner-console-identity-v1';

export interface UseOwnerConsoleResult {
  loading: boolean;
  pulse: OwnerPulse;
  needsYou: StudioSnapshot[];
  studios: StudioSnapshot[];
  allStudios: StudioSnapshot[];
  search: string;
  setSearch: (value: string) => void;
}

export function useOwnerConsole(): UseOwnerConsoleResult {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pulse, setPulse] = useState<OwnerPulse>(EMPTY_PULSE);
  const [needsYou, setNeedsYou] = useState<StudioSnapshot[]>([]);
  const [studios, setStudios] = useState<StudioSnapshot[]>([]);

  const load = useCallback(async () => {
    let pulseResult = await getOwnerPulse();
    const needsIdentityBackfill =
      typeof localStorage !== 'undefined' && localStorage.getItem(IDENTITY_BACKFILL_KEY) !== '1';
    if (!pulseResult.exists || needsIdentityBackfill) {
      try {
        await rebuildOwnerConsole();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(IDENTITY_BACKFILL_KEY, '1');
        }
        pulseResult = await getOwnerPulse();
      } catch (error) {
        logger.error('owner console rebuild failed', error);
      }
    }
    const studioList = await listStudioSnapshots();
    let needList: StudioSnapshot[] = [];
    try {
      needList = await listStudiosNeedingYou();
    } catch (error) {
      logger.error('owner console needs-you query failed', error);
      needList = studioList.filter((studio) => studio.needsYou);
    }
    setPulse(pulseResult.pulse);
    setNeedsYou(
      needList.filter((studio) =>
        shouldSurfaceNeedsYou(
          studio.needsYouReason,
          studio.name,
          studio.firstAssessmentAt?.getTime() ?? null,
        ),
      ),
    );
    setStudios(studioList);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await load();
      } catch (error) {
        logger.error('owner console load failed', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const visibleStudios = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return studios;
    return studios.filter((studio) => {
      const haystack = `${studio.name} ${studio.ownerEmail}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [search, studios]);

  return {
    loading,
    pulse,
    needsYou,
    studios: visibleStudios,
    allStudios: studios,
    search,
    setSearch,
  };
}
