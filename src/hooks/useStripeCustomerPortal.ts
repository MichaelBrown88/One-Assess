import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '@/services/firebase';
import { logger } from '@/lib/utils/logger';
import { ORG_BILLING_COPY } from '@/constants/orgBilling';
import { useToast } from '@/hooks/use-toast';

export function useStripeCustomerPortal(organizationId: string | null) {
  const { toast } = useToast();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    if (!organizationId) return;
    setPortalLoading(true);
    try {
      const functions = getFirebaseFunctions();
      const createPortalSession = httpsCallable<
        { organizationId: string },
        { url: string; hasStripeSubscriptions?: boolean }
      >(functions, 'createCustomerPortalSession');
      const result = await createPortalSession({ organizationId });
      if (result.data.hasStripeSubscriptions === false) {
        toast({
          title: ORG_BILLING_COPY.billingPagePortalNoSubscriptionToastTitle,
          description: ORG_BILLING_COPY.billingPagePortalNoSubscriptionToastBody,
        });
      }
      window.location.href = result.data.url;
    } catch (err) {
      logger.error('Failed to open billing portal:', err);
      toast({
        title: ORG_BILLING_COPY.portalOpenFailedTitle,
        description: err instanceof Error ? err.message : ORG_BILLING_COPY.portalOpenFailedFallback,
        variant: 'destructive',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  return { portalLoading, openPortal };
}
