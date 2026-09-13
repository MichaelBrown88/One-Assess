import React from 'react';
import { ArrowRight, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientReportHeroActionsProps {
  firstName: string;
  onDownloadPdf?: () => void;
  onShare?: () => void;
  onSendToClient?: () => void;
}

export function ClientReportHeroActions({
  firstName,
  onDownloadPdf,
  onShare,
  onSendToClient,
}: ClientReportHeroActionsProps) {
  if (!onDownloadPdf && !onShare && !onSendToClient) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-5">
      {onDownloadPdf ? (
        <Button variant="outline" onClick={onDownloadPdf} className="h-9 gap-2 rounded-md text-sm">
          <Download className="h-4 w-4" aria-hidden />
          Download PDF
        </Button>
      ) : null}
      {onShare ? (
        <Button variant="outline" onClick={onShare} className="h-9 gap-2 rounded-md text-sm">
          <Share2 className="h-4 w-4" aria-hidden />
          Share link
        </Button>
      ) : null}
      {onSendToClient ? (
        <Button onClick={onSendToClient} className="h-9 gap-2 rounded-md text-sm">
          <ArrowRight className="h-4 w-4" aria-hidden />
          Send to {firstName}
        </Button>
      ) : null}
    </div>
  );
}
