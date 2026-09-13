import ClientHistory from './ClientHistory';
import ClientCoachNotesTab from './ClientCoachNotesTab';

export default function ClientTimelineTab() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Assessment history</h2>
        <ClientHistory />
      </section>

      <section id="notes" className="space-y-3 scroll-mt-24">
        <h2 className="text-sm font-semibold text-foreground">Coach notes</h2>
        <ClientCoachNotesTab />
      </section>
    </div>
  );
}
