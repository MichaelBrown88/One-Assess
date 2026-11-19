/**
 * Org admin control for the reusable intake link: on/off, copy, QR, regenerate.
 */
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Link2, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getDb } from '@/services/firebase';
import { intakeFailureReason, intakeLinkUrl, manageIntakeLink, type IntakeLinkState } from '@/services/intakeLinkClient';
import { logger } from '@/lib/utils/logger';

const QR_SIZE = 132;

export function IntakeLinkCard({ organizationId, origin = window.location.origin }: { organizationId: string; origin?: string }) {
  const [link, setLink] = useState<IntakeLinkState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    getDoc(doc(getDb(), `organizations/${organizationId}`))
      .then((snap) => {
        const raw = snap.get('intakeLink') as { token?: unknown; enabled?: unknown } | undefined;
        if (!cancelled) setLink(typeof raw?.token === 'string' ? { token: raw.token, enabled: raw.enabled === true } : null);
      })
      .catch((e) => logger.warn('[IntakeLinkCard] load failed', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [organizationId]);

  const run = async (action: 'enable' | 'disable' | 'regenerate') => {
    setBusy(true);
    try {
      setLink(await manageIntakeLink(action));
      if (action === 'regenerate') toast({ title: 'New link created', description: 'The old link no longer works.' });
    } catch (e) {
      toast({ title: "Couldn't update the intake link", description: intakeFailureReason(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const url = link ? intakeLinkUrl(origin, link.token) : '';

  return (
    <section aria-labelledby="intake-link-title" className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="intake-link-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Link2 className="h-4 w-4" aria-hidden /> Client intake link
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            One link for every new client. They answer the consultation and health questions on their phone,
            and it appears under New intakes ready to assess. Put it in your booking emails, CRM, WhatsApp or a QR code.
          </p>
        </div>
        <Switch
          aria-label="Intake link on"
          checked={Boolean(link?.enabled)}
          disabled={loading || busy}
          onCheckedChange={(on) => void run(on ? 'enable' : 'disable')}
        />
      </div>

      {link?.enabled ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            <code className="block break-all rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">{url}</code>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => {
                void navigator.clipboard.writeText(url).then(() => toast({ title: 'Link copied' }));
              }}>
                <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Copy link
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void run('regenerate')}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Regenerate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Add <code>?name=</code> and <code>&amp;email=</code> to fill those in from your CRM. Regenerating stops the old link working.
            </p>
          </div>
          {/* QR codes need a light quiet zone to scan in dark mode too, so this stays white. */}
          {/* eslint-disable-next-line no-restricted-syntax */}
          <div className="rounded-lg bg-white p-2 self-start" aria-label="QR code for the intake link">
            <QRCodeSVG value={url} size={QR_SIZE} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{loading ? 'Loading…' : 'The link is off. Switch it on to get your link.'}</p>
      )}
    </section>
  );
}
