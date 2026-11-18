import { useState } from 'react';
import { useCheckout } from '@/hooks/useCheckout';
import { useToast } from '@/hooks/use-toast';
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';
import type { CapacityTier, Region } from '@/constants/pricing';
import type { DraftSubscription } from '@/types/billingLevers';

interface UseChangePlanConfirmArgs {
  organizationId: string;
  region: Region;
  checkoutLocked: boolean;
  isCrossTrack: boolean;
  statsClientCount: number;
  draft: DraftSubscription;
  draftTier: CapacityTier | undefined;
  offerBrandingAddOn: boolean;
  onSubscriptionUpdated: () => void;
  onBack: () => void;
}

function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
    return e.message;
  }
  return CHECKOUT_FLOW_COPY.changePlanUpdateFailedFallback;
}

export function useChangePlanConfirm({
  organizationId,
  region,
  checkoutLocked,
  isCrossTrack,
  statsClientCount,
  draft,
  draftTier,
  offerBrandingAddOn,
  onSubscriptionUpdated,
  onBack,
}: UseChangePlanConfirmArgs) {
  const { toast } = useToast();
  const { startCheckout, updateSubscriptionPlan, loading, planUpdateLoading, error } = useCheckout();
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);

  const performConfirm = async () => {
    if (!draftTier) return;
    if (draft.branding && offerBrandingAddOn) {
      const { redirected, errorMessage: checkoutError } = await startCheckout(
        organizationId,
        region,
        draftTier.clientLimit,
        draft.period,
        draft.track,
        true,
      );
      if (!redirected && checkoutError) {
        toast({
          variant: 'destructive',
          title: CHECKOUT_FLOW_COPY.checkoutCallableFailedToastTitle,
          description: checkoutError,
        });
      }
      return;
    }

    if (checkoutLocked) {
      try {
        const data = await updateSubscriptionPlan(
          organizationId,
          region,
          draftTier.clientLimit,
          draft.period,
          draft.track,
        );
        if (data.unchanged) {
          toast({
            title: CHECKOUT_FLOW_COPY.changePlanAlreadyTitle,
            description: CHECKOUT_FLOW_COPY.changePlanAlreadyBody,
          });
        } else if (isCrossTrack) {
          toast({
            title:
              draft.track === 'gym'
                ? CHECKOUT_FLOW_COPY.changePlanSwitchedGymTitle
                : CHECKOUT_FLOW_COPY.changePlanSwitchedSoloTitle,
            description: CHECKOUT_FLOW_COPY.changePlanSwitchedBody,
          });
        } else {
          toast({
            title: CHECKOUT_FLOW_COPY.changePlanUpdatedTitle,
            description: CHECKOUT_FLOW_COPY.changePlanUpdatedBody,
          });
        }
        onSubscriptionUpdated();
        onBack();
      } catch (e: unknown) {
        toast({
          variant: 'destructive',
          title: CHECKOUT_FLOW_COPY.changePlanUpdateFailedTitle,
          description: errorMessage(e),
        });
      }
      return;
    }

    const { redirected, errorMessage: checkoutError } = await startCheckout(
      organizationId,
      region,
      draftTier.clientLimit,
      draft.period,
      draft.track,
    );
    if (!redirected && checkoutError) {
      toast({
        variant: 'destructive',
        title: CHECKOUT_FLOW_COPY.checkoutCallableFailedToastTitle,
        description: checkoutError,
      });
    }
  };

  const handleConfirm = () => {
    if (!draftTier) return;
    if (isCrossTrack && draft.track === 'solo' && statsClientCount > draftTier.clientLimit) {
      setShowDowngradeDialog(true);
      return;
    }
    void performConfirm();
  };

  return {
    handleConfirm,
    isLoading: checkoutLocked ? planUpdateLoading : loading,
    error,
    showDowngradeDialog,
    setShowDowngradeDialog,
  };
}
