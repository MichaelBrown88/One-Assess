import type { ConsultationNote } from '@/types/assessmentForm';

/** Read-only notes the coach captured in the studio CRM consultation (OFS hand-off). */
export function ConsultationNotesPanel({ notes }: { notes: ConsultationNote[] | undefined }) {
  if (!notes?.length) return null;
  return (
    <details className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">From consultation</summary>
      <dl className="mt-3 space-y-2">
        {notes.map((note, index) => (
          <div key={`${note.label}-${index}`}>
            <dt className="text-xs font-medium text-muted-foreground">{note.label}</dt>
            <dd className="text-sm text-foreground whitespace-pre-line">{note.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
