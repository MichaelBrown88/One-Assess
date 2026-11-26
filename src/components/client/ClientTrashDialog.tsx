import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ClientTrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  restore: boolean;
  onConfirm: () => Promise<void>;
}

export function ClientTrashDialog({ open, onOpenChange, clientName, restore, onConfirm }: ClientTrashDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const action = restore ? 'Restore client' : 'Move to trash';
  return <Dialog open={open} onOpenChange={next => { if (!busy) { setError(null); onOpenChange(next); } }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{action}: {clientName}?</DialogTitle>
        <DialogDescription>{restore
          ? 'Return this client to your active list with their saved assessment history.'
          : 'Remove this client from your active list. Their profile and assessments can be restored from Trash within 30 days.'}</DialogDescription>
      </DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant={restore ? 'default' : 'destructive'} disabled={busy} onClick={async () => {
          setBusy(true); setError(null);
          try { await onConfirm(); onOpenChange(false); }
          catch (failure) { setError(failure instanceof Error ? failure.message : 'The change could not be saved. Please try again.'); }
          finally { setBusy(false); }
        }}>{busy ? 'Saving…' : action}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
