import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parqQuestions } from '@/components/ParQQuestionnaire';
import type { ConsultationNote } from '@/types/assessmentForm';

export type ClientParq = {
  /** formData parq1…parq13 answers ('yes' | 'no'). */
  answers: Record<string, string>;
  confirmedAt?: string;
  onConfirm: () => void;
};

/**
 * Read-only context carried into the assessment: notes from the consultation (CRM hand-off) and
 * PAR-Q answers the client gave on the intake link, which the coach confirms with the client.
 */
export function ConsultationNotesPanel({ notes, parq }: { notes: ConsultationNote[] | undefined; parq?: ClientParq }) {
  const answered = parq ? parqQuestions.filter((q) => parq.answers[q.id] === 'yes' || parq.answers[q.id] === 'no') : [];
  const flagged = answered.filter((q) => parq?.answers[q.id] === 'yes');
  if (!notes?.length && answered.length === 0) return null;
  const needsConfirm = Boolean(parq && answered.length > 0 && !parq.confirmedAt);

  return (
    <details open={needsConfirm || undefined} className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        From consultation{needsConfirm ? ' · health answers to confirm' : ''}
      </summary>

      {parq && answered.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">PAR-Q, answered by the client</p>
          {flagged.length === 0 ? (
            <p className="text-sm text-foreground">No to all {answered.length} questions.</p>
          ) : (
            <ul className="space-y-1.5">
              {flagged.map((q) => (
                <li key={q.id} className="flex gap-2 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>Yes: {q.question}</span>
                </li>
              ))}
            </ul>
          )}
          {parq.confirmedAt ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Confirmed with the client
            </p>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={parq.onConfirm}>Confirmed with client</Button>
          )}
        </div>
      ) : null}

      {notes?.length ? (
        <dl className="mt-3 space-y-2">
          {notes.map((note, index) => (
            <div key={`${note.label}-${index}`}>
              <dt className="text-xs font-medium text-muted-foreground">{note.label}</dt>
              <dd className="text-sm text-foreground whitespace-pre-line">{note.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </details>
  );
}
