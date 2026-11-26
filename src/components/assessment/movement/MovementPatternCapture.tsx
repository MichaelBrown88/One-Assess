import { Input } from '@/components/ui/input';
import { numericIssue } from '@/lib/assessment/numericValidation';
import { useMemo, useState } from 'react';
import { useFormContext, type FormData } from '@/contexts/FormContext';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { ASSESSMENT_OPTIONS } from '@/constants/assessment';

export type MovementPatternSectionId = 'overhead-squat' | 'hinge-assessment' | 'lunge-assessment';

interface MovementPatternCaptureProps {
  sectionId: MovementPatternSectionId;
  sectionTitle: string;
  onComplete: () => void;
  onBack?: () => void;
}

type PartialForm = Partial<FormData>;

interface IssueChip {
  id: string;
  label: string;
  patch: PartialForm;
  /** Chips sharing a group are mutually exclusive (e.g. shifts left vs right). */
  exclusiveGroup?: string;
}

const OHS_BENIGN: PartialForm = {
  ohsShoulderMobility: 'full-range',
  ohsTorsoLean: 'upright',
  ohsSquatDepth: 'full-depth',
  ohsHipShift: 'none',
  ohsKneeAlignment: 'stable',
  ohsFeetPosition: 'stable',
  ohsHeelsLift: 'no',
  ohsHasPain: 'no',
};

const OHS_CHIPS: IssueChip[] = [
  { id: 'heels', label: 'Heels lift', patch: { ohsHeelsLift: 'yes' } },
  { id: 'depth', label: 'Limited squat depth', patch: { ohsSquatDepth: 'quarter-depth' } },
  { id: 'knees', label: 'Knees cave inward', patch: { ohsKneeAlignment: 'valgus' } },
  { id: 'lean', label: 'Leans forward', patch: { ohsTorsoLean: 'moderate-lean' } },
  { id: 'shoulders', label: 'Shoulders struggle overhead', patch: { ohsShoulderMobility: 'limited' } },
  { id: 'feet', label: 'Feet roll inward', patch: { ohsFeetPosition: 'pronation' } },
  { id: 'shift-left', label: 'Shifts left', patch: { ohsHipShift: 'left' }, exclusiveGroup: 'shift' },
  { id: 'shift-right', label: 'Shifts right', patch: { ohsHipShift: 'right' }, exclusiveGroup: 'shift' },
];

const HINGE_BENIGN: PartialForm = {
  hingeDepth: 'good',
  hingeBackRounding: 'none',
  hingeHasPain: 'no',
};

const HINGE_CHIPS: IssueChip[] = [
  { id: 'depth', label: 'Limited hinge depth', patch: { hingeDepth: 'fair' } },
  { id: 'rounding', label: 'Rounding through the back', patch: { hingeBackRounding: 'moderate' } },
];

const LUNGE_BENIGN: PartialForm = {
  lungeLeftBalance: 'good',
  lungeRightBalance: 'good',
  lungeLeftKneeAlignment: 'tracks-straight',
  lungeRightKneeAlignment: 'tracks-straight',
  lungeLeftTorso: 'neutral',
  lungeRightTorso: 'neutral',
  lungeHasPain: 'no',
};

const LUNGE_CHIPS: IssueChip[] = [
  { id: 'balance-l', label: 'Left side — balance issues', patch: { lungeLeftBalance: 'fair' } },
  { id: 'balance-r', label: 'Right side — balance issues', patch: { lungeRightBalance: 'fair' } },
  { id: 'knee-l', label: 'Left knee caves in', patch: { lungeLeftKneeAlignment: 'caves-inward' } },
  { id: 'knee-r', label: 'Right knee caves in', patch: { lungeRightKneeAlignment: 'caves-inward' } },
  { id: 'torso-l', label: 'Left side — torso shifts', patch: { lungeLeftTorso: 'shifts-left' } },
  { id: 'torso-r', label: 'Right side — torso shifts', patch: { lungeRightTorso: 'shifts-right' } },
];

function configForSection(sectionId: MovementPatternSectionId): {
  benign: PartialForm;
  chips: IssueChip[];
  painField: keyof FormData;
  painOptions: readonly { value: string; label: string }[];
} {
  if (sectionId === 'hinge-assessment') {
    return {
      benign: HINGE_BENIGN,
      chips: HINGE_CHIPS,
      painField: 'hingeHasPain',
      painOptions: ASSESSMENT_OPTIONS.hingeHasPain,
    };
  }
  if (sectionId === 'lunge-assessment') {
    return {
      benign: LUNGE_BENIGN,
      chips: LUNGE_CHIPS,
      painField: 'lungeHasPain',
      painOptions: ASSESSMENT_OPTIONS.lungeHasPain,
    };
  }
  return {
    benign: OHS_BENIGN,
    chips: OHS_CHIPS,
    painField: 'ohsHasPain',
    painOptions: ASSESSMENT_OPTIONS.ohsHasPain,
  };
}

function mergePatches(base: PartialForm, chips: IssueChip[], selected: Set<string>): PartialForm {
  const out = { ...base };
  for (const chip of chips) {
    if (selected.has(chip.id)) {
      Object.assign(out, chip.patch);
    }
  }
  return out;
}

/** Re-derive which chips were previously selected from persisted form values. */
function chipsFromFormData(formData: FormData, chips: IssueChip[]): Set<string> {
  const selected = new Set<string>();
  for (const chip of chips) {
    const matches = Object.entries(chip.patch).every(
      ([key, value]) => formData[key as keyof FormData] === value,
    );
    if (matches) selected.add(chip.id);
  }
  return selected;
}

/** True when the section was previously completed as all-benign (ignoring pain). */
function isMarkedGoodInFormData(formData: FormData, benign: PartialForm, painField: keyof FormData): boolean {
  return Object.entries(benign).every(([key, value]) => {
    if (key === painField) return true;
    return formData[key as keyof FormData] === value;
  });
}

export function MovementPatternCapture({
  sectionId,
  sectionTitle,
  onComplete,
  onBack,
}: MovementPatternCaptureProps) {
  const { formData, updateFormData } = useFormContext();
  const { benign, chips, painField, painOptions } = useMemo(
    () => configForSection(sectionId),
    [sectionId],
  );

  // Rehydrate from persisted form values so revisiting a section shows the
  // previous observations instead of an apparently blank capture pad.
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(
    () => chipsFromFormData(formData, chips),
  );
  const [markedGood, setMarkedGood] = useState(
    () => selectedIssues.size === 0 && isMarkedGoodInFormData(formData, benign, painField),
  );

  const observationComplete = markedGood || selectedIssues.size > 0;
  const canContinue = !numericIssue('kneeToWallLeftCm', formData.kneeToWallLeftCm) && !numericIssue('kneeToWallRightCm', formData.kneeToWallRightCm) && observationComplete && (formData[painField] === 'yes' || formData[painField] === 'no');

  const persistObservation = (selected: Set<string>, observed: boolean) => {
    const patch = observed ? mergePatches(benign, chips, selected)
      : Object.fromEntries(Object.keys(benign).map(key => [key, '']));
    updateFormData({ ...patch, [painField]: formData[painField] } as PartialForm);
  };
  const toggleIssue = (id: string) => {
    setMarkedGood(false);
    const next = new Set(selectedIssues);
    if (next.has(id)) next.delete(id);
    else {
      const group = chips.find(c => c.id === id)?.exclusiveGroup;
      if (group) for (const chip of chips) if (chip.exclusiveGroup === group) next.delete(chip.id);
      next.add(id);
    }
    setSelectedIssues(next);
    persistObservation(next, next.size > 0);
  };

  /** Never overwrite an explicit pain answer with the benign default. */
  const withPainPreserved = (patch: PartialForm): PartialForm => {
    const existingPain = formData[painField];
    if (existingPain === 'yes' || existingPain === 'no') {
      return { ...patch, [painField]: existingPain };
    }
    return patch;
  };

  const handleLooksGood = () => {
    setMarkedGood(true);
    setSelectedIssues(new Set());
    persistObservation(new Set(), true);
    // Selecting the observation never advances or invents a pain answer.
  };

  const handleContinue = () => {
    if (!canContinue) return;
    const patch = mergePatches(benign, chips, selectedIssues);
    updateFormData(withPainPreserved(patch));
    onComplete();
  };

  const setPain = (value: string) => {
    updateFormData({ [painField]: value === 'no' ? 'no' : 'yes' } as PartialForm);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="bg-background rounded-3xl border border-primary/5 p-8 shadow-xl shadow-primary/10 lg:p-10">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
          Movement pattern
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground">{sectionTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Watch the client move once, then tap what you saw — or mark it as looking good.
        </p>

        {sectionId === 'overhead-squat' && (selectedIssues.has('heels') || (selectedIssues.has('depth') && selectedIssues.has('lean'))) && (
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium">Optional ankle check: knee to wall</p>
            <p className="text-sm text-muted-foreground">Keep the heel down and move the knee toward the wall over the toes. Record the furthest comfortable toe-to-wall distance. A reach below 10 cm is a coaching prompt to review ankle movement, not a diagnosis.</p>
            <div className="grid grid-cols-2 gap-4">{(['Left', 'Right'] as const).map(side => {
              const id = side === 'Left' ? 'kneeToWallLeftCm' : 'kneeToWallRightCm';
              const issue = numericIssue(id, formData[id]);
              return <label key={id} className="space-y-2 text-sm">{side} (cm)<Input type="number" min="0" max="30" step="0.1" value={formData[id] ?? ''} onChange={event => updateFormData({ [id]: event.target.value })} aria-invalid={!!issue} />{issue && <span role="alert" className="text-destructive">{issue}</span>}</label>;
            })}</div>
          </div>
        )}

        <div className="mt-8">
          <Button
            type="button"
            variant={markedGood ? 'default' : 'outline'}
            aria-pressed={markedGood}
            className="h-12 w-full rounded-lg text-base font-semibold"
            onClick={handleLooksGood}
          >
            Looks good
          </Button>
        </div>

        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Or note what you saw
          </p>
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => {
              const active = selectedIssues.has(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => toggleIssue(chip.id)}
                  aria-pressed={active}
                  className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-muted/40 text-foreground-secondary hover:bg-muted'
                  }`}
                >
                  {active && <Check className="mr-1 inline h-4 w-4" aria-hidden />} {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 space-y-3 border-t border-border/60 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pain during this pattern?
          </p>
          <div className="flex flex-wrap gap-2">
            {painOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPain(opt.value)}
                aria-pressed={formData[painField] === opt.value}
                className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  formData[painField] === opt.value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-muted/40 text-foreground-secondary hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border/60 pt-8">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={!onBack}
            className="h-12 px-6 rounded-lg font-bold text-muted-foreground"
          >
            <ChevronLeft className="mr-2 h-5 w-5" />
            Back
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="h-12 rounded-lg px-8 font-bold"
          >
            Section complete
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
