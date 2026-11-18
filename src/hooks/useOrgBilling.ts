import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { getDb } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { parseOrgBilling } from '@/lib/billing/parseOrgBilling';
import type { OrgBillingData } from '@/types/orgBilling';

export type OrgBillingLoadProblem = 'no_org' | 'missing_doc' | 'error';

export function useOrgBilling(organizationId: string | null, refreshKey: number) {
  const [orgData, setOrgData] = useState<OrgBillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProblem, setLoadProblem] = useState<OrgBillingLoadProblem | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setOrgData(null);
      setLoadProblem('no_org');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoadProblem(null);
    setLoading(true);

    getDoc(doc(getDb(), 'organizations', organizationId))
      .then((snap) => {
        if (cancelled) return;
        if (!snap.exists()) {
          setOrgData(null);
          setLoadProblem('missing_doc');
          return;
        }
        setOrgData(parseOrgBilling(snap.data()));
        setLoadProblem(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        logger.error('Failed to load billing data:', err);
        setOrgData(null);
        setLoadProblem('error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [organizationId, refreshKey]);

  return { orgData, loading, loadProblem };
}
