/**
 * Render-level regression for "Resume opens step 1": after prepareAssessmentResume the real
 * FormProvider + AssessmentGate tree must land on the saved phase, also when org settings
 * arrive after the first render (as they do from AuthContext).
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyAssessmentForm } from '@/types/assessmentForm';

const state: { orgSettings: unknown } = { orgSettings: null };

vi.mock('@/services/firebase', () => {
  const o = {};
  return {
    db: o, auth: { currentUser: null }, storage: o, getDb: () => o,
    getFirebaseAuth: () => ({ currentUser: null }), getFirebaseStorage: () => o, getStorage: () => o,
    getFirebaseFunctions: () => o, getFirebaseApp: () => o, googleProvider: o, appleProvider: o,
    initAppCheck: () => null, default: () => o,
  };
});
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { uid: 'coach-1' },
    profile: { organizationId: 'org-test', role: 'coach' },
    orgSettings: state.orgSettings,
    effectiveOrgId: 'org-test',
  }),
}));
vi.mock('@/services/coachAssessments', async (original) => ({
  ...(await original<object>()),
  getDraftAssessment: vi.fn(async () => null),
  saveDraftAssessment: vi.fn(async () => {}),
}));

import { prepareAssessmentResume } from '@/lib/assessment/resumeAssessment';
import { FormProvider } from '@/contexts/FormContext';
import { AssessmentGate } from './AssessmentGate';

const ALL_MODULES = {
  parq: true, bodycomp: true, fitness: true, posture: true, overheadSquat: true,
  hinge: true, lunge: true, mobility: true, strength: true, lifestyle: true,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  window.matchMedia = ((query: string) => ({
    matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  window.scrollTo = () => {};
  sessionStorage.clear();
  state.orgSettings = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const headings = () => Array.from(container.querySelectorAll('h1,h2,h3')).map((n) => n.textContent ?? '').join(' | ');

describe('Resume through the real assessment gate', () => {
  it.each([
    ['P3', 'Metabolic Fitness'],
    ['P4', 'Movement Quality'],
    ['P5', 'Functional Strength'],
    ['P2', 'Body Composition'],
  ])('lands on saved phase %s (%s) after org settings load', async (phaseId, title) => {
    prepareAssessmentResume({
      formData: {
        ...createEmptyAssessmentForm(),
        fullName: 'Test Client', dateOfBirth: '1990-01-01', gender: 'male',
        trainingHistory: 'beginner', recentActivity: 'currently-training', activityLevel: 'sedentary',
        cardioRestingHr: '60',
      },
      activePhaseId: phaseId,
      activePhaseIdx: 3,
    });
    const tree = (
      <MemoryRouter>
        <FormProvider>
          <AssessmentGate sidebarOpen={false} setSidebarOpen={() => {}} />
        </FormProvider>
      </MemoryRouter>
    );
    await act(async () => root.render(tree));
    expect(headings()).toContain(title);

    state.orgSettings = { modules: ALL_MODULES };
    await act(async () => root.render(tree));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 400)); });
    expect(headings()).toContain(title);
    expect(headings()).not.toContain('Basic Client Info');
  });
});
