import { describe, expect, it } from 'vitest';
import { clientReportHasCapturedData } from './clientReportHasCapturedData';
import type { FormData } from '@/contexts/FormContext';

function form(partial: Partial<FormData>): FormData {
  return partial as FormData;
}

describe('clientReportHasCapturedData', () => {
  it('is false for empty form data', () => {
    expect(clientReportHasCapturedData(undefined)).toBe(false);
    expect(clientReportHasCapturedData(form({}))).toBe(false);
  });

  it('does not treat alcohol-only answers as captured lifestyle', () => {
    expect(clientReportHasCapturedData(form({ alcoholFrequency: 'weekly' }))).toBe(false);
    expect(clientReportHasCapturedData(form({ alcoholFrequency: '' }))).toBe(false);
  });

  it('recognises current lifestyle archetypes without legacy sleepQuality', () => {
    expect(clientReportHasCapturedData(form({ sleepArchetype: 'good' }))).toBe(true);
    expect(clientReportHasCapturedData(form({ activityLevel: 'moderately-active' }))).toBe(true);
  });

  it('recognises tape, strength, and fitness numbers from saved sessions', () => {
    expect(clientReportHasCapturedData(form({ waistCm: '88' }))).toBe(true);
    expect(clientReportHasCapturedData(form({ armLeftCm: '31' }))).toBe(true);
    expect(clientReportHasCapturedData(form({ calfRightCm: '38' }))).toBe(true);
    expect(clientReportHasCapturedData(form({ plankDurationSeconds: '45' }))).toBe(true);
    expect(clientReportHasCapturedData(form({ cardioPeakHr: '152' }))).toBe(true);
  });
});
