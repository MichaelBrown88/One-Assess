import { useEffect, useState } from 'react';
import { getMetricsHistory } from '@/services/platform/platformMetrics';
import { OWNER_TREND_DAYS } from '@/constants/ownerConsole';
import { mapMetricsHistoryToTrends, type OwnerTrendPoint } from '@/lib/platform/ownerTrends';
import { logger } from '@/lib/utils/logger';

export function useOwnerTrends() {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<OwnerTrendPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const history = await getMetricsHistory(OWNER_TREND_DAYS);
        if (!cancelled) setPoints(mapMetricsHistoryToTrends(history));
      } catch (error) {
        logger.error('owner trends load failed', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { loading, points };
}
