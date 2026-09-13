import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { POSTURE_STUDIO_MODAL_COPY as COPY } from '@/constants/coachPostureCapture';

interface PosturePhotoModePanelProps {
  hasResults: boolean;
  onCapture: () => void;
  onSwitchToManual: () => void;
}

export function PosturePhotoModePanel({
  hasResults,
  onCapture,
  onSwitchToManual,
}: PosturePhotoModePanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-6 rounded-3xl border-2 border-dashed border-primary/20 bg-muted p-8 text-center">
        <div className="rounded-3xl bg-background p-4 shadow-sm">
          <Camera className="h-10 w-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h4 className="text-xl font-bold text-foreground">{COPY.TITLE}</h4>
          <p className="mx-auto max-w-xs text-sm font-medium text-foreground-secondary">
            {hasResults ? COPY.PHOTO_BODY_DONE : COPY.PHOTO_BODY}
          </p>
        </div>
        <Button
          onClick={onCapture}
          className="h-14 w-full max-w-sm gap-3 rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-sm"
        >
          <Camera className="h-5 w-5" />
          {COPY.PHOTO_CTA}
        </Button>
      </div>
      <button
        type="button"
        onClick={onSwitchToManual}
        className="w-full text-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {COPY.SWITCH_MANUAL}
      </button>
    </div>
  );
}
