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
import { CHECKOUT_FLOW_COPY } from '@/constants/checkoutFlowCopy';

interface ChangePlanDowngradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientCount: number;
  clientLimit: number;
}

export function ChangePlanDowngradeDialog({
  open,
  onOpenChange,
  clientCount,
  clientLimit,
}: ChangePlanDowngradeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{CHECKOUT_FLOW_COPY.trackSwitchToSoloBlockTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {CHECKOUT_FLOW_COPY.trackSwitchToSoloBlockBody(clientCount, clientLimit)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => onOpenChange(false)}>OK</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
