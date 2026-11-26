import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ASSESSMENT_OPTIONS, ASSESSMENT_LABELS } from '@/constants/assessment';

const P1_LABELS = ASSESSMENT_LABELS.P1;

export type LifestyleRemoteState = {
  sleepHours: string;
  sleepRegularity: string;
  stressFrequency: string;
  stressCoping: string;
  exerciseMinutesWeek: string;
  strengthDaysWeek: string;
  proteinMeals: string;
  fruitVegPortions: string;
  takeawaysWeek: string;
  lastCaffeineIntake: string;
  activityLevel: string;
  sleepArchetype: string;
  stressLevel: string;
  nutritionHabits: string;
  hydrationHabits: string;
  stepsPerDay: string;
  caffeineCupsPerDay: string;
};

export const INITIAL_LIFESTYLE_REMOTE: LifestyleRemoteState = {
  sleepHours: '',
  sleepRegularity: '',
  stressFrequency: '',
  stressCoping: '',
  exerciseMinutesWeek: '',
  strengthDaysWeek: '',
  proteinMeals: '',
  fruitVegPortions: '',
  takeawaysWeek: '',
  lastCaffeineIntake: '',
  activityLevel: '',
  sleepArchetype: '',
  stressLevel: '',
  nutritionHabits: '',
  hydrationHabits: '',
  stepsPerDay: '',
  caffeineCupsPerDay: '',
};

type PublicRemoteLifestyleFieldsProps = {
  value: LifestyleRemoteState;
  onChange: (next: LifestyleRemoteState) => void;
  allowedKeys: Set<string>;
};

export function PublicRemoteLifestyleFields({
  value,
  onChange,
  allowedKeys,
}: PublicRemoteLifestyleFieldsProps) {
  const patch = (partial: Partial<LifestyleRemoteState>) => onChange({ ...value, ...partial });

  return (
    <div className="space-y-4">
      {(['sleepHours', 'sleepRegularity', 'stressFrequency', 'stressCoping', 'exerciseMinutesWeek', 'strengthDaysWeek', 'proteinMeals', 'fruitVegPortions', 'takeawaysWeek'] as const).filter(key => allowedKeys.has(key)).map(key => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`remote-${key}`}>{P1_LABELS[key]}</Label>
          <Select value={value[key]} onValueChange={answer => patch({ [key]: answer })}>
            <SelectTrigger id={`remote-${key}`}><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>{ASSESSMENT_OPTIONS[key].map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      ))}
      {allowedKeys.has('activityLevel') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.activityLevel}</Label>
          <Select value={value.activityLevel} onValueChange={(v) => patch({ activityLevel: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.activityLevel.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!allowedKeys.has('sleepHours') && allowedKeys.has('sleepArchetype') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.sleepArchetype}</Label>
          <Select value={value.sleepArchetype} onValueChange={(v) => patch({ sleepArchetype: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.sleepArchetype.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!allowedKeys.has('sleepHours') && allowedKeys.has('stressLevel') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.stressLevel}</Label>
          <Select value={value.stressLevel} onValueChange={(v) => patch({ stressLevel: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.stressLevel.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!allowedKeys.has('sleepHours') && allowedKeys.has('nutritionHabits') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.nutritionHabits}</Label>
          <Select value={value.nutritionHabits} onValueChange={(v) => patch({ nutritionHabits: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.nutritionHabits.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!allowedKeys.has('sleepHours') && allowedKeys.has('hydrationHabits') ? (
        <div className="space-y-2">
          <Label>{P1_LABELS.hydrationHabits}</Label>
          <Select value={value.hydrationHabits} onValueChange={(v) => patch({ hydrationHabits: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {ASSESSMENT_OPTIONS.hydrationHabits.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  );
}
