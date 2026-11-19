/**
 * Org admin control for CRM API keys: create (shown once), list, revoke.
 */
import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { createApiKey, listApiKeys, revokeApiKey, type ApiKeySummary } from '@/services/apiKeysClient';
import { intakeFailureReason } from '@/services/intakeLinkClient';
import { logger } from '@/lib/utils/logger';

const DOCS_URL = 'https://github.com/MichaelBrown88/One-Assess/blob/main/docs/api/assessment-intakes.md';

const when = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'never');

export function ApiKeysCard({ organizationId, docsUrl = DOCS_URL }: { organizationId: string; docsUrl?: string }) {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!organizationId) return;
    try {
      setKeys(await listApiKeys(organizationId));
    } catch (e) {
      logger.warn('[ApiKeysCard] load failed', e);
    }
  }, [organizationId]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy(true);
    try {
      const { apiKey } = await createApiKey(name.trim());
      setRevealed(apiKey);
      setName('');
      await load();
    } catch (e) {
      const reason = intakeFailureReason(e);
      toast({ title: "Couldn't create the key", description: reason === 'too_many_keys' ? 'Revoke an old key first (10 at most).' : reason, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (key: ApiKeySummary) => {
    if (!window.confirm(`Revoke "${key.name}"? Anything using it stops working immediately.`)) return;
    setBusy(true);
    try {
      await revokeApiKey(key.keyId);
      await load();
    } catch (e) {
      toast({ title: "Couldn't revoke the key", description: intakeFailureReason(e), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="api-keys-title" className="space-y-4">
      <div>
        <h3 id="api-keys-title" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <KeyRound className="h-4 w-4" aria-hidden /> CRM API keys
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Let your CRM or booking system start assessments with the client&apos;s details already filled in.
          Give the key and the <a className="underline" href={docsUrl} target="_blank" rel="noreferrer">API guide</a> to your developer.
        </p>
      </div>

      {revealed ? (
        <div role="status" className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm font-medium text-foreground">Copy this key now. It won&apos;t be shown again.</p>
          <code className="block break-all rounded bg-background px-2 py-1.5 text-xs">{revealed}</code>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(revealed).then(() => toast({ title: 'Key copied' })); }}>
              <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Copy key
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setRevealed(null)}>Done</Button>
          </div>
        </div>
      ) : null}

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void create(); }}>
        <Input aria-label="Key name" placeholder="Name, e.g. Booking system" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
        <Button type="submit" disabled={busy || !name.trim()}>Create key</Button>
      </form>

      {keys.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {keys.map((key) => (
            <li key={key.keyId} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className={`truncate text-sm font-medium ${key.revoked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{key.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <code>{key.preview}</code> · created {when(key.createdAtMs)} · last used {when(key.lastUsedAtMs)}{key.revoked ? ' · revoked' : ''}
                </p>
              </div>
              {!key.revoked ? (
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void revoke(key)}>Revoke</Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
