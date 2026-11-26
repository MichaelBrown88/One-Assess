import { numericIssue } from '@/lib/assessment/numericValidation';
import { useEffect, useState } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CARDIO_RUN_SHEET_COPY as COPY } from '@/constants/phaseFormCopy';
import { calculateAge } from '@/lib/scoring';
import { safeParse } from '@/lib/utils/numbers';
import { CardioHrField } from './CardioHrField';

/** Default protocol so scoring/strengths that check `cardioTestSelected` still work. */
const DEFAULT_CARDIO_PROTOCOL = 'treadmill';

interface CardioRunSheetProps {
  sectionTitle: string;
  onComplete: () => void;
  onBack?: () => void;
}

/**
 * P3 fitness capture: three heart-rate readings and a short coach protocol note.
 * No in-app timers — the coach times the test on the treadmill (or watch).
 */
export function CardioRunSheet({ sectionTitle, onComplete, onBack }: CardioRunSheetProps) {
  const { formData, updateFormData } = useFormContext();

  const [restingHr, setRestingHr] = useState(String(formData.cardioRestingHr ?? ''));
  const [peakHr, setPeakHr] = useState(String(formData.cardioPeakHr ?? ''));
  const [recoveryHr, setRecoveryHr] = useState(String(formData.cardioPost1MinHr ?? ''));

  useEffect(() => {
    if (!formData.cardioTestSelected?.trim()) {
      updateFormData({ cardioTestSelected: DEFAULT_CARDIO_PROTOCOL });
    }
  }, [formData.cardioTestSelected, updateFormData]);

  const commit = (patch: Partial<FormData>) => updateFormData(patch);
  const isNum = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v));
  const canComplete = isNum(restingHr) && isNum(peakHr) && isNum(recoveryHr) &&
    !numericIssue('cardioRestingHr', restingHr) && !numericIssue('cardioPeakHr', peakHr) && !numericIssue('cardioPost1MinHr', recoveryHr);
  const age = formData.dateOfBirth ? calculateAge(formData.dateOfBirth) : 0;
  const gender = (formData.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
  const hrBandProps = {
    age,
    gender,
    restingHr: safeParse(restingHr),
    peakHr: safeParse(peakHr),
    recoveryHr: safeParse(recoveryHr),
  } as const;

  const handleComplete = () => {
    if (!canComplete) return;
    updateFormData({
      cardioProtocolVersion: 'incline-walk-4min-v1',
      cardioRestingHr: restingHr.trim(),
      cardioPeakHr: peakHr.trim(),
      cardioPost1MinHr: recoveryHr.trim(),
      cardioTestSelected: formData.cardioTestSelected?.trim() || DEFAULT_CARDIO_PROTOCOL,
    });
    onComplete();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-background rounded-3xl border border-primary/5 p-8 shadow-xl shadow-primary/10 lg:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">{COPY.KICKER}</p>
        <h2 className="sr-only">{sectionTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{COPY.INTRO}</p>

        <div className="mt-6 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{COPY.PROTOCOL_HEADING}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{COPY.PROTOCOL_INSTRUCTION}</p>
        </div>

        <div className="mt-8 space-y-8">
          <section className="space-y-2">
            <label htmlFor="cardioRestingHr" className="text-sm font-bold text-foreground">{COPY.RESTING_LABEL}</label>
            <p className="text-xs text-muted-foreground">{COPY.RESTING_HINT}</p>
            <CardioHrField
              id="cardioRestingHr"
              metricId="rhr"
              value={restingHr}
              onChange={setRestingHr}
              onCommit={() => commit({ cardioRestingHr: restingHr.trim() })}
              {...hrBandProps}
            />
          </section>

          <section className="space-y-2">
            <label htmlFor="cardioPeakHr" className="text-sm font-bold text-foreground">{COPY.PEAK_LABEL}</label>
            <p className="text-xs text-muted-foreground">{COPY.PEAK_HINT}</p>
            <CardioHrField
              id="cardioPeakHr"
              metricId="peak"
              value={peakHr}
              onChange={setPeakHr}
              onCommit={() => commit({ cardioPeakHr: peakHr.trim() })}
              {...hrBandProps}
            />
          </section>

          <section className="space-y-2">
            <label htmlFor="cardioPost1MinHr" className="text-sm font-bold text-foreground">{COPY.RECOVERY_LABEL}</label>
            <p className="text-xs text-muted-foreground">{COPY.RECOVERY_HINT}</p>
            <CardioHrField
              id="cardioPost1MinHr"
              metricId="hrr"
              value={recoveryHr}
              onChange={setRecoveryHr}
              onCommit={() => commit({ cardioPost1MinHr: recoveryHr.trim() })}
              {...hrBandProps}
            />
          </section>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={!onBack}
            className="h-12 rounded-lg px-6 font-bold text-muted-foreground"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            {COPY.BACK}
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={!canComplete}
            className="h-12 rounded-lg px-8 font-bold"
          >
            {COPY.COMPLETE}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
