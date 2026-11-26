import type { FormData } from '@/types/assessmentForm';
import { computeScores } from '@/lib/scoring';
import { assessSideImbalance } from '@/lib/scoring/sideImbalance';

/** Coach-only starting choices. Observations guide exercise selection, never diagnose a condition. */
export function buildProgrammingBrief(form: FormData): string[] {
  const notes: string[] = [];
  const score = computeScores(form);
  if ([form.ohsHasPain, form.hingeHasPain, form.lungeHasPain].includes('yes')) notes.push('Pain was reported: stop loading that pattern. Clarify the symptoms and use a comfortable alternative; refer for assessment if pain persists or is unexplained.');
  const height = Number(form.heightCm) / 100;
  if (height > 0 && Number(form.inbodyWeightKg) / (height * height) >= 30) notes.push('Start conditioning with walking, cycling or another comfortable low-impact option. Build tolerance before adding jumps or burpees.');
  const legs = assessSideImbalance(form.singleLegStandLeftReps, form.singleLegStandRightReps);
  const grip = assessSideImbalance(form.gripLeftKg, form.gripRightKg);
  if (legs?.material || grip?.material) notes.push('A side-to-side difference was measured. Start supported unilateral work on the weaker side and match its controlled repetitions on the other. Independent-lever machines can help.');
  if (form.ohsKneeAlignment === 'valgus' || [form.lungeLeftKneeAlignment, form.lungeRightKneeAlignment].includes('caves-inward')) notes.push('For inward knee movement, start with a supported split squat or a comfortable box squat. Cue knees to follow toes and reduce load if control slips.');
  if (['moderate', 'severe'].includes(form.hingeBackRounding)) notes.push('Rehearse the hinge with a dowel or wall touch before loaded floor lifts. Use a raised starting position or a controlled machine alternative.');
  if (['limited', 'compensated'].includes(form.ohsShoulderMobility)) notes.push('Use a comfortable press angle, such as a landmine or incline press, while building overhead control with wall slides.');
  if (form.ohsHeelsLift === 'yes') notes.push('Heels lifted in the squat. Check knee-to-wall reach and a supported squat before deciding whether ankle movement, balance or technique needs work.');
  const fitness = score.categories.find(category => category.id === 'cardio');
  if (fitness?.assessed && fitness.score < 50) notes.push('Build an aerobic base with short bouts at a conversational pace. Increase duration gradually before increasing intensity.');
  const lifestyle = score.categories.find(category => category.id === 'lifestyle');
  if (lifestyle?.details.some(detail => ['sleep', 'stress'].includes(detail.id) && detail.value !== '-' && detail.score < 50)) notes.push('Recovery habits need attention. Start with manageable training volume and review sleep, stress and energy before adding more work.');
  if (form.trainingHistory === 'beginner') notes.push('Begin with stable, easy-to-learn exercises or machines. Coach consistent technique before adding complexity or load.');
  return notes;
}
