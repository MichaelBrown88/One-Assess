/**
 * "New intakes": answers clients sent from the gym's intake link, waiting to be assessed.
 * Start assessment turns one into a pre-filled draft; an email match always asks the coach first.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNewIntakes, type NewIntake } from '@/hooks/dashboard/useNewIntakes';
import { INTAKE_FAILURE_COPY } from '@/constants/intakeLink';
import { convertIntake, intakeFailureReason, type ConvertIntakeChoice, type IntakeCandidate } from '@/services/intakeLinkClient';


const resumeUrl = (slug: string) => `/dashboard/clients/${encodeURIComponent(slug)}?resume=1`;

export function NewIntakesPanel({ organizationId }: { organizationId: string | undefined }) {
  const { intakes, remove } = useNewIntakes(organizationId);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [choosing, setChoosing] = useState<{ intake: NewIntake; candidates: IntakeCandidate[] } | null>(null);
  const [newName, setNewName] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);

  const act = async (intake: NewIntake, choice?: ConvertIntakeChoice) => {
    setBusyId(intake.id);
    setDialogError(null);
    try {
      const result = await convertIntake(intake.id, choice);
      if (result.kind === 'choose') {
        setNewName(intake.clientName);
        setChoosing({ intake, candidates: result.candidates });
        return;
      }
      remove(intake.id);
      setChoosing(null);
      if (result.kind === 'converted') navigate(resumeUrl(result.clientSlug));
    } catch (e) {
      const reason = intakeFailureReason(e);
      const message = INTAKE_FAILURE_COPY[reason] ?? 'Something went wrong. Try again.';
      if (choosing) setDialogError(message);
      else toast({ title: "Couldn't start the assessment", description: message, variant: 'destructive' });
      if (reason === 'already_handled') remove(intake.id);
    } finally {
      setBusyId(null);
    }
  };

  if (intakes.length === 0) return null;

  return (
    <section aria-labelledby="new-intakes-title" className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <h2 id="new-intakes-title" className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Inbox className="h-4 w-4" aria-hidden /> New intakes
        <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{intakes.length}</span>
      </h2>
      <ul className="mt-3 divide-y divide-border">
        {intakes.map((intake) => (
          <li key={intake.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{intake.clientName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {intake.email}
                {intake.submittedAtMs ? ` · ${new Date(intake.submittedAtMs).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
              </p>
              {intake.parqYesCount > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  {intake.parqYesCount} health answer{intake.parqYesCount === 1 ? '' : 's'} to check
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button type="button" size="sm" disabled={busyId !== null} onClick={() => void act(intake)}>
                {busyId === intake.id ? 'Starting…' : 'Start assessment'}
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={busyId !== null} onClick={() => void act(intake, { dismiss: true })}>
                Dismiss
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={choosing !== null} onOpenChange={(open) => { if (!open) { setChoosing(null); setDialogError(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Is this an existing client?</DialogTitle>
            <DialogDescription>
              {choosing?.intake.email} is already on your roster. Nothing changes until you choose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {choosing?.candidates.map((c) => (
              <Button key={c.clientSlug} type="button" variant="outline" className="w-full justify-start" disabled={busyId !== null}
                onClick={() => choosing && void act(choosing.intake, { useClient: c.clientSlug })}>
                Use {c.clientName}
              </Button>
            ))}
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <label htmlFor="new-intake-name" className="text-sm font-medium text-foreground">Or create a new client</label>
            <Input id="new-intake-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          {dialogError ? <p role="alert" className="text-sm text-destructive">{dialogError}</p> : null}
          <DialogFooter>
            <Button type="button" disabled={busyId !== null || newName.trim().length < 2}
              onClick={() => choosing && void act(choosing.intake, { createNew: true, clientName: newName.trim() })}>
              Create new client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
