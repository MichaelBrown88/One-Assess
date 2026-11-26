/**
 * Phase P1: Lifestyle Assessment
 */

import type { FormData } from '@/contexts/FormContext';
import type { PhaseDefinition, FieldType } from './types';
import {
  PHASE_TITLES,
  PHASE_SUMMARIES,
  PHASE_GATE_HINTS,
  ASSESSMENT_LABELS,
  ASSESSMENT_TOOLTIPS,
  ASSESSMENT_PLACEHOLDERS,
  ASSESSMENT_OPTIONS,
  SECTION_TITLES
} from '@/constants/assessment';

export const phaseP1: PhaseDefinition = {
  id: 'P1',
  title: PHASE_TITLES.P1,
  summary: PHASE_SUMMARIES.P1,
  gateHint: PHASE_GATE_HINTS.P1,
  sections: [
    {
      id: 'lifestyle-overview',
      title: SECTION_TITLES.P1['lifestyle-overview'],
      fields: [
        // Required fields — always shown, feed the lifestyle score
        { id: 'activityLevel' as keyof FormData, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.activityLevel, required: true, tooltip: ASSESSMENT_TOOLTIPS.P1.activityLevel, options: ASSESSMENT_OPTIONS.activityLevel },
        // Habit questions scored against guidelines (lifestyleHabits.ts). The older
        // sleep/stress/nutrition/hydration self-ratings are still read for past assessments.
        { id: 'sleepHours' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.sleepHours, options: ASSESSMENT_OPTIONS.sleepHours },
        { id: 'sleepRegularity' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.sleepRegularity, options: ASSESSMENT_OPTIONS.sleepRegularity },
        { id: 'stressFrequency' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.stressFrequency, options: ASSESSMENT_OPTIONS.stressFrequency },
        { id: 'stressCoping' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.stressCoping, options: ASSESSMENT_OPTIONS.stressCoping },
        { id: 'exerciseMinutesWeek' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.exerciseMinutesWeek, tooltip: ASSESSMENT_TOOLTIPS.P1.exerciseMinutesWeek, options: ASSESSMENT_OPTIONS.exerciseMinutesWeek },
        { id: 'strengthDaysWeek' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.strengthDaysWeek, options: ASSESSMENT_OPTIONS.strengthDaysWeek },
        { id: 'proteinMeals' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.proteinMeals, tooltip: ASSESSMENT_TOOLTIPS.P1.proteinMeals, options: ASSESSMENT_OPTIONS.proteinMeals },
        { id: 'fruitVegPortions' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.fruitVegPortions, tooltip: ASSESSMENT_TOOLTIPS.P1.fruitVegPortions, options: ASSESSMENT_OPTIONS.fruitVegPortions },
        { id: 'takeawaysWeek' as keyof FormData, required: true, type: 'select' as FieldType, label: ASSESSMENT_LABELS.P1.takeawaysWeek, options: ASSESSMENT_OPTIONS.takeawaysWeek },
        // Optional fields — shown by default, coach can disable per org
        { id: 'stepsPerDay' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.stepsPerDay, placeholder: ASSESSMENT_PLACEHOLDERS.P1.stepsPerDay, tooltip: ASSESSMENT_TOOLTIPS.P1.stepsPerDay, orgConfigKey: 'stepsPerDay' },
        { id: 'caffeineCupsPerDay' as keyof FormData, type: 'number' as FieldType, label: ASSESSMENT_LABELS.P1.caffeineCupsPerDay, placeholder: ASSESSMENT_PLACEHOLDERS.P1.caffeineCupsPerDay, tooltip: ASSESSMENT_TOOLTIPS.P1.caffeineCupsPerDay, orgConfigKey: 'caffeine' },
        { id: 'lastCaffeineIntake' as keyof FormData, type: 'time' as FieldType, label: ASSESSMENT_LABELS.P1.lastCaffeineIntake, tooltip: ASSESSMENT_TOOLTIPS.P1.lastCaffeineIntake, orgConfigKey: 'caffeine', conditional: { showWhen: { field: 'caffeineCupsPerDay', exists: true, notValue: '0' } } },
        {
          id: 'clientGoals' as keyof FormData,
          required: true,
          type: 'multiselect' as FieldType,
          label: ASSESSMENT_LABELS.P6.clientGoals,
          placeholder: ASSESSMENT_PLACEHOLDERS.P6.clientGoals,
          tooltip: ASSESSMENT_TOOLTIPS.P6.clientGoals,
          options: ASSESSMENT_OPTIONS.clientGoals,
        },
        {
          id: 'trainingFrequency' as keyof FormData,
          type: 'select' as FieldType,
          label: ASSESSMENT_LABELS.P6.trainingFrequency,
          tooltip: ASSESSMENT_TOOLTIPS.P6.trainingFrequency,
          options: ASSESSMENT_OPTIONS.trainingFrequency,
          // Only meaningful for clients who are currently training.
          conditional: { showWhen: { field: 'recentActivity', value: 'currently-training' } },
        },
      ],
    }
  ],
};
