import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssessmentFlow } from './useAssessmentFlow';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';
import type { FormData } from '@/contexts/FormContext';
import type { OrgSettings } from '@/services/organizations';
import { writeAssessmentPhaseId, writeAssessmentPhaseIndex } from '@/lib/assessment/assessmentSessionStorage';

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let flow: ReturnType<typeof useAssessmentFlow>;

// Org module toggles make visiblePhases rebuild section arrays on every render.
const orgSettings = {
  modules: {
    parq: true, bodycomp: true, fitness: true, posture: true, overheadSquat: true,
    hinge: true, lunge: true, mobility: true, strength: true, lifestyle: true,
  },
} as unknown as Partial<OrgSettings>;

const base = { ...createEmptyAssessmentForm(), fullName: 'Test Client' } as FormData;

function Harness({ formData }: { formData: FormData }) {
  flow = useAssessmentFlow({ formData, orgSettings });
  const expanded = Object.keys(flow.expandedSections).find((id) => flow.expandedSections[id]);
  return <div>{`${flow.activePhase.id}:${expanded}:${flow.activeFieldIdx}`}</div>;
}

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  sessionStorage.clear();
  container = document.createElement('div');
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  vi.unstubAllGlobals();
});

describe('useAssessmentFlow section state', () => {
  it('stays on the next movement section after an answer changes formData', async () => {
    writeAssessmentPhaseId('P4');
    writeAssessmentPhaseIndex(4);
    await act(async () => root.render(<Harness formData={base} />));
    expect(flow.activePhase.id).toBe('P4');

    await act(async () => flow.setExpandedSections({ 'hinge-assessment': true }));
    // Saving the overhead-squat answers updates formData right after moving on.
    await act(async () => root.render(<Harness formData={{ ...base, ohsKneeAlignment: 'valgus' }} />));

    expect(container.textContent).toBe('P4:hinge-assessment:0');
  });

  it('keeps the current field when typing in a later step of a section', async () => {
    writeAssessmentPhaseId('P5');
    writeAssessmentPhaseIndex(5);
    await act(async () => root.render(<Harness formData={base} />));
    expect(flow.activePhase.id).toBe('P5');

    await act(async () => flow.setActiveFieldIdx(1));
    await act(async () => root.render(<Harness formData={{ ...base, gripRightKg: '44' }} />));

    expect(flow.activeFieldIdx).toBe(1);
  });

  it('opens the chosen section from the sidebar, not the first one', async () => {
    writeAssessmentPhaseId('P4');
    writeAssessmentPhaseIndex(4);
    await act(async () => root.render(<Harness formData={base} />));

    await act(async () => flow.toggleSection('lunge-assessment'));

    expect(container.textContent).toBe('P4:lunge-assessment:0');
  });

  it('still resets to the first section when the phase changes', async () => {
    writeAssessmentPhaseId('P4');
    writeAssessmentPhaseIndex(4);
    await act(async () => root.render(<Harness formData={base} />));
    await act(async () => flow.setExpandedSections({ 'hinge-assessment': true }));

    const strengthIdx = flow.visiblePhases.findIndex((p) => p.id === 'P5');
    await act(async () => flow.setActivePhaseIdx(strengthIdx));

    expect(container.textContent).toBe('P5:strength-endurance:0');
  });
});
