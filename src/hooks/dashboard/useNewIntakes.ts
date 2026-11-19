import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, query, where, type Timestamp } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';

export type NewIntake = {
  id: string;
  clientName: string;
  email?: string;
  submittedAtMs: number | null;
  /** PAR-Q questions the client answered "yes" to. */
  parqYesCount: number;
};

/** Equality-only query (no composite index); newest first is sorted here. */
const NEW_INTAKES_LIMIT = 50;

export function toNewIntake(id: string, data: Record<string, unknown>): NewIntake {
  const formData = (data.formData ?? {}) as Record<string, unknown>;
  const submittedAt = data.submittedAt as Timestamp | undefined;
  return {
    id,
    clientName: typeof data.clientName === 'string' ? data.clientName : 'Unnamed client',
    ...(typeof data.email === 'string' ? { email: data.email } : {}),
    submittedAtMs: typeof submittedAt?.toMillis === 'function' ? submittedAt.toMillis() : null,
    parqYesCount: Object.entries(formData).filter(([k, v]) => /^parq\d+$/.test(k) && v === 'yes').length,
  };
}

export function useNewIntakes(organizationId: string | undefined) {
  const [intakes, setIntakes] = useState<NewIntake[]>([]);
  const [loading, setLoading] = useState(Boolean(organizationId));

  const refresh = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(getDb(), `organizations/${organizationId}/intakes`),
        where('status', '==', 'new'),
        limit(NEW_INTAKES_LIMIT),
      ));
      setIntakes(snap.docs.map((d) => toNewIntake(d.id, d.data()))
        .sort((a, b) => (b.submittedAtMs ?? 0) - (a.submittedAtMs ?? 0)));
    } catch (e) {
      logger.warn('[NewIntakes] load failed', e);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { intakes, loading, refresh, remove: (id: string) => setIntakes((prev) => prev.filter((i) => i.id !== id)) };
}
