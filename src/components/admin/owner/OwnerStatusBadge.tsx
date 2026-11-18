import { Badge } from '@/components/ui/badge';
import { OWNER_CONSOLE_COPY, studioStatusKey } from '@/constants/ownerConsole';
import type { StudioSnapshot } from '@/types/ownerConsole';

const STATUS_VARIANT = {
  paying: 'success',
  trial: 'secondary',
  past_due: 'danger',
  cancelled: 'outline',
  paused: 'warning',
  internal: 'secondary',
  setup: 'outline',
} as const;

interface OwnerStatusBadgeProps {
  studio: Pick<StudioSnapshot, 'name' | 'firstAssessmentAt' | 'payStatus'>;
}

export function OwnerStatusBadge({ studio }: OwnerStatusBadgeProps) {
  const key = studioStatusKey(studio);
  return (
    <Badge variant={STATUS_VARIANT[key]} className="font-medium">
      {OWNER_CONSOLE_COPY.payStatus[key]}
    </Badge>
  );
}
