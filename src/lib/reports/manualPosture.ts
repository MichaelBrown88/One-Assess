import type { FormData } from '@/contexts/FormContext';

const OBSERVATIONS: Record<string, string> = {
  'forward-head': 'Head sits forward. Practise gentle chin nods and rows to build comfortable head and shoulder control.',
  tilted: 'Head tilts to one side. Check a comfortable head position and work on even neck and shoulder control.',
  'chin-tucked': 'Chin sits tucked down. Practise a comfortable forward gaze without forcing the neck.',
  rounded: 'Shoulders sit forward. Rows and wall slides can help build upper-back strength and comfortable overhead movement.',
  elevated: 'Shoulder heights differ. Use controlled, even pulling movements and review the position with your coach.',
  'winged-scapula': 'A shoulder blade lifts away from the back. Practise wall push-ups and controlled reaching with your coach.',
  'increased-kyphosis': 'Upper back sits more rounded. Practise wall slides and supported upper-back movement.',
  'increased-lordosis': 'Lower back sits more arched. Practise dead bugs and a controlled hip hinge without forcing a new standing posture.',
  scoliosis: 'The back appears uneven from side to side. Your coach can adapt exercises and check whether further assessment is needed.',
  'flat-back': 'The back sits relatively flat. Build comfortable movement and control through your normal range.',
  'anterior-tilt': 'Hips tip forward. Build comfortable trunk control with dead bugs and glute bridges.',
  'posterior-tilt': 'Hips tuck under. Practise a comfortable hip hinge and controlled movement through the hips.',
  'valgus-knee': 'Knees angle inward. Practise supported split squats with knees following the toes.',
  'varus-knee': 'Knees angle outward. Use a comfortable stance and practise controlled step-ups with your coach.',
};
const FIELDS = ['postureHeadOverall', 'postureShouldersOverall', 'postureBackOverall', 'postureHipsOverall', 'postureKneesOverall'] as const;

export function manualPostureSummary(form: Partial<FormData>): string[] | null {
  const values = FIELDS.flatMap(key => Array.isArray(form[key]) ? form[key] : []);
  if (!values.length) return null;
  const lines = [...new Set(values)].flatMap(value => OBSERVATIONS[value] ? [OBSERVATIONS[value]] : []);
  return lines.length ? lines : ['Your coach observed a balanced standing position in the areas checked.'];
}
