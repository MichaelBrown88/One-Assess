/**
 * Deterministic client-facing copy + thresholds for posture scan findings.
 *
 * Copy is written for the client, not the coach: plain names (no anatomy
 * terms), what we saw and why it matters, what causes it, and how we fix it
 * with a few named moves (no sets or reps).
 */

import type { PostureFindingViewId } from '@/lib/types/postureFindings';

export type PostureFeedbackSeverityTier = 'mild' | 'moderate' | 'significant';

export type PostureBodyArea = 'neck' | 'shoulders' | 'back' | 'lower back' | 'hips' | 'knees' | 'feet';

export interface PostureFeedbackTierCopy {
  what_it_means: string;
  what_well_do: string;
}

export interface PostureFixMove {
  name: string;
  how: string;
}

export interface PostureFix {
  cause: string;
  strengthen: string;
  loosen: string;
  moves: PostureFixMove[];
}

export interface PostureFeedbackDefinition {
  id: string;
  name: string;
  /** One-line "so what" shown next to the finding on the report filmstrip. */
  impact: string;
  area: PostureBodyArea;
  views: PostureFindingViewId[];
  thresholds: { mild: number; moderate: number; significant: number };
  priority: 'high' | 'medium' | 'low';
  feedback: Record<PostureFeedbackSeverityTier, PostureFeedbackTierCopy>;
  fix: PostureFix;
}

const tier = (means: string, plan: string): PostureFeedbackTierCopy => ({
  what_it_means: means,
  what_well_do: plan,
});

const MOVES = {
  chinTucks: {
    name: 'Chin tucks',
    how: 'Gently draw your chin straight back, as if making a double chin, and hold for a few seconds.',
  },
  bandPullAparts: {
    name: 'Band pull-aparts',
    how: 'Hold a band at chest height and pull it apart, squeezing your shoulder blades together.',
  },
  doorwayStretch: {
    name: 'Doorway chest stretch',
    how: 'Rest your forearms on a door frame and step through until you feel your chest open.',
  },
  upperBackRoll: {
    name: 'Upper-back roll',
    how: 'Lie over a foam roller across your upper back, support your head, and gently lean back over it.',
  },
  rows: {
    name: 'Rows',
    how: 'Pull a cable or dumbbell towards your ribs, squeezing your shoulder blades together at the end.',
  },
  facePulls: {
    name: 'Face pulls',
    how: 'Pull a rope towards your face with your elbows high, finishing with your hands beside your ears.',
  },
  singleArmRow: {
    name: 'Single-arm rows',
    how: 'One arm at a time, pull a dumbbell to your hip while staying square, so each side does its own work.',
  },
  suitcaseCarry: {
    name: 'Suitcase carry',
    how: 'Walk tall holding a weight in one hand without leaning, then switch hands.',
  },
  sideNeckStretch: {
    name: 'Side neck stretch',
    how: 'Gently tilt your ear towards your shoulder on the loose side to stretch the tight side.',
  },
  gluteBridge: {
    name: 'Glute bridges',
    how: 'Lie on your back, knees bent, then push through your heels and lift your hips, squeezing your glutes at the top.',
  },
  deadBug: {
    name: 'Dead bugs',
    how: 'Lie on your back, arms and knees up, then slowly lower your opposite arm and leg while keeping your lower back pressed down.',
  },
  kneelingHipStretch: {
    name: 'Kneeling hip stretch',
    how: 'Kneel on one knee, tuck your hips under, and ease forward until you feel a stretch at the front of that hip.',
  },
  hipHinge: {
    name: 'Hip hinge practice',
    how: 'With a broomstick along your back, push your hips back and keep the stick touching your head, upper back and tailbone.',
  },
  birdDog: {
    name: 'Bird dogs',
    how: 'On hands and knees, reach one arm forward and the opposite leg back, keeping your back still.',
  },
  hamstringStretch: {
    name: 'Hamstring stretch',
    how: 'Put your heel on a low step, keep your back flat, and lean forward from your hips.',
  },
  sideLyingLegRaise: {
    name: 'Side-lying leg raises',
    how: 'Lie on your side and lift your top leg slightly behind you, toes pointing forward.',
  },
  stepDown: {
    name: 'Step-downs',
    how: 'Stand on a low step and slowly lower one heel to the floor, keeping your hips level and your knee over your toes.',
  },
  sidePlank: {
    name: 'Side plank',
    how: 'On your forearm and the side of your feet, lift your hips into a straight line and hold.',
  },
  bandedSquat: {
    name: 'Banded squats',
    how: 'With a small band just above your knees, squat while gently pushing your knees out against it.',
  },
  clamshell: {
    name: 'Clamshells',
    how: 'Lie on your side with knees bent and open your top knee like a clam, keeping your feet together.',
  },
  calfStretch: {
    name: 'Calf stretch',
    how: 'Hands on a wall, step one leg back, keep that heel down and lean in until you feel the calf.',
  },
  splitSquat: {
    name: 'Split squats',
    how: 'In a long stride, lower your back knee towards the floor, keeping your front knee in line with your middle toes.',
  },
  innerThighLift: {
    name: 'Inner-thigh lifts',
    how: 'Lie on your side, cross your top leg over, and lift your bottom leg a few inches off the floor.',
  },
  outerThighRoll: {
    name: 'Outer-thigh roll',
    how: 'Lie on a foam roller along the outside of your hip and thigh and roll slowly over the tight spots.',
  },
  standingSideStretch: {
    name: 'Standing side stretch',
    how: 'Reach one arm overhead and lean gently away until you feel the side of your waist stretch.',
  },
  singleLegBridge: {
    name: 'Single-leg glute bridges',
    how: 'A glute bridge with one foot down and the other leg lifted, so each side has to do its own work.',
  },
  plank: {
    name: 'Plank',
    how: 'On your forearms and toes, hold a straight line from head to heels, squeezing your glutes.',
  },
  gobletSquat: {
    name: 'Goblet squats',
    how: 'Hold a weight at your chest and sit down between your heels, keeping your chest tall.',
  },
  shortFoot: {
    name: 'Arch lifts',
    how: 'Without curling your toes, gently pull the ball of your foot towards your heel so the arch lifts.',
  },
  singleLegBalance: {
    name: 'Single-leg balance',
    how: 'Stand on one leg, keeping the arch lifted and the knee in line with your toes.',
  },
  calfRaise: {
    name: 'Slow calf raises',
    how: 'Rise up onto your toes, then lower down slowly with your ankles staying straight.',
  },
} satisfies Record<string, PostureFixMove>;

const kneeInward = (side: 'left' | 'right') => ({
  mild: tier(
    `Your ${side} knee drifts slightly inward when you stand. It's small now, but it tends to get worse when you squat, lunge or run, and that's a common cause of knee pain.`,
    'Strengthen the outside of your hips and coach your knee to stay in line with your toes.',
  ),
  moderate: tier(
    `Your ${side} knee drifts clearly inward. That twists the knee under load, and it's one of the most common causes of knee pain and injury in the gym.`,
    'Stronger hips, looser ankles, and slow, controlled single-leg work before we add weight.',
  ),
  significant: tier(
    `Your ${side} knee drifts well inward. Until that improves, deep squats and jumping put the knee at real risk.`,
    "We'll start with bodyweight exercises and build hip control, then add weight as your knee tracks straight.",
  ),
});

const kneeInwardFix: PostureFix = {
  cause:
    "The muscles on the outside of your hips aren't strong enough yet to hold your knee in line, so it drifts in. Stiff ankles can add to it.",
  strengthen: 'the outside of your hips and your glutes',
  loosen: 'your inner thighs and calves',
  moves: [MOVES.bandedSquat, MOVES.clamshell, MOVES.calfStretch],
};

const kneeOutward = (side: 'left' | 'right') => ({
  mild: tier(
    `Your ${side} knee bows slightly outward. This can simply be how you're built, and on its own it's usually nothing to worry about.`,
    "We'll keep an eye on it and build balanced strength around the hip and knee, without forcing the knee into a different position.",
  ),
  moderate: tier(
    `Your ${side} knee bows clearly outward. That puts more pressure on the inside of the knee, especially when running and jumping.`,
    'Hip control and single-leg strength, with the load shared evenly between both legs.',
  ),
  significant: tier(
    `Your ${side} knee bows well outward, which keeps extra pressure on the inside of the knee joint. Worth managing carefully as training gets harder.`,
    "We'll check your squat stance and footwear, and build up impact and weight gradually.",
  ),
});

const kneeOutwardFix: PostureFix = {
  cause:
    'Often it is simply how your legs are built. Tight muscles on the outside of your hip and thigh can add to it.',
  strengthen: 'your inner thighs and the muscles around your knee',
  loosen: 'the outside of your hips and thighs',
  moves: [MOVES.splitSquat, MOVES.innerThighLift, MOVES.outerThighRoll],
};

const archRollsIn = (side: 'left' | 'right') => ({
  mild: tier(
    `Your ${side} arch drops slightly when you stand. Small, but your feet are your base, and when the arch rolls in the knee tends to follow.`,
    'Simple foot-strength and balance drills, with supportive shoes where needed.',
  ),
  moderate: tier(
    `Your ${side} arch rolls in clearly, which pulls the knee inward too. It's a common source of foot, shin and knee aches, especially when running.`,
    'Single-leg balance and foot and lower-leg strength, built up gradually.',
  ),
  significant: tier(
    `Your ${side} arch rolls in a lot. This pattern is a common cause of foot, shin and knee pain, so foot strength and the right shoes matter here.`,
    'A step-by-step foot and ankle strength plan, plus a check that your shoes suit how you train.',
  ),
});

const archRollsInFix: PostureFix = {
  cause:
    'The small muscles in your foot and lower leg are not holding the arch up. Weak hips can add to it, because when the knee rolls in it takes the foot with it.',
  strengthen: 'the small muscles in your feet and the outside of your hips',
  loosen: 'your calves',
  moves: [MOVES.shortFoot, MOVES.singleLegBalance, MOVES.calfRaise],
};

export const POSTURE_FEEDBACK_LIBRARY = {
  forward_head: {
    id: 'forward_head',
    name: 'Head forward of shoulders',
    impact: 'A common cause of a stiff neck and tension headaches.',
    area: 'neck',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 8, moderate: 15, significant: 25 },
    priority: 'high',
    feedback: {
      mild: tier(
        "Your head sits a little ahead of your shoulders, which is very common with desk and phone time. Left alone, it's the usual cause of a stiff neck and tight upper back.",
        'A few minutes of neck and upper-back drills in your warm-up, and your screen raised to eye level.',
      ),
      moderate: tier(
        'Your head sits clearly ahead of your shoulders. The further forward it sits, the harder your neck works to hold it up. That is where neck ache, tension headaches and tight shoulders come from.',
        'Neck and upper-back strength in every session, plus regular breaks from sitting so the new position sticks.',
      ),
      significant: tier(
        'Your head sits well ahead of your shoulders, putting real strain on your neck and upper back all day. This is often behind ongoing neck pain and tension headaches.',
        "We'll fix your head and upper-back position first, before any heavy lifting overhead.",
      ),
    },
    fix: {
      cause:
        'Hours looking down at screens and phones. The muscles that hold your head back get weak, the front of your chest gets tight, and your head drifts forward.',
      strengthen: 'the deep muscles at the front of your neck and your upper back',
      loosen: 'your chest and the back of your neck',
      moves: [MOVES.chinTucks, MOVES.bandPullAparts, MOVES.doorwayStretch],
    },
  },
  head_pitch_up: {
    id: 'head_pitch_up',
    name: 'Chin tilted up',
    impact: 'Squeezes the back of your neck, which leads to tightness and headaches.',
    area: 'neck',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 12, moderate: 22, significant: 35 },
    priority: 'medium',
    feedback: {
      mild: tier(
        "Your chin lifts slightly when you stand. It's minor, but it squeezes the back of your neck and can leave it feeling tight.",
        'A simple "nod and lengthen" cue, and a relaxed neck position in your warm-up.',
      ),
      moderate: tier(
        'Your chin points up noticeably, which keeps the back of your neck squeezed. It often goes with your head sitting forward, and leads to neck tightness and headaches.',
        'Neck strength and upper-back loosening in your warm-ups, plus a check of your screen and desk setup.',
      ),
      significant: tier(
        'Your chin is tilted well up, keeping the back of your neck squeezed all day. That is a common cause of neck pain and headaches.',
        "We'll coach your head position step by step and build neck strength before heavier lifting.",
      ),
    },
    fix: {
      cause:
        'It usually comes with a stiff upper back or your head sitting forward. To keep your eyes level, you tip your chin up, which squeezes the back of your neck.',
      strengthen: 'the deep muscles at the front of your neck and between your shoulder blades',
      loosen: 'the back of your neck and a stiff upper back',
      moves: [MOVES.chinTucks, MOVES.upperBackRoll, MOVES.bandPullAparts],
    },
  },
  rounded_shoulders: {
    id: 'rounded_shoulders',
    name: 'Rounded shoulders',
    impact: 'Limits overhead reach and raises shoulder injury risk when you press.',
    area: 'shoulders',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 0.045, moderate: 0.07, significant: 0.1 },
    priority: 'high',
    feedback: {
      mild: tier(
        'Your shoulders roll slightly forward. Small now, but it tends to get worse with sitting and leads to tight shoulders and a stiff upper back.',
        'More rowing and pulling in your programme, plus chest and upper-back stretches.',
      ),
      moderate: tier(
        'Your shoulders roll clearly forward. That limits how far you can reach overhead and puts your shoulders in a weaker position for pressing, which is a common route to shoulder pain.',
        "Rows and upper-back work on most training days, so your shoulders sit back where they're strongest.",
      ),
      significant: tier(
        'Your shoulders roll well forward, with a tight chest and a stiff upper back. Pressing or lifting overhead from here raises your risk of a shoulder injury.',
        "We'll build your upper back and open up your chest before heavy pressing or overhead work.",
      ),
    },
    fix: {
      cause:
        'Sitting, driving and typing pull your shoulders forward all day. Your chest gets tight, and the muscles between your shoulder blades get weak.',
      strengthen: 'your upper back and the back of your shoulders',
      loosen: 'your chest and the front of your shoulders',
      moves: [MOVES.rows, MOVES.facePulls, MOVES.doorwayStretch],
    },
  },
  shoulder_asymmetry: {
    id: 'shoulder_asymmetry',
    name: 'One shoulder higher',
    impact: 'One side ends up doing more of the work.',
    area: 'shoulders',
    views: ['front', 'back'],
    thresholds: { mild: 0.4, moderate: 0.8, significant: 1.2 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'One shoulder sits a little higher than the other. This is very common and usually comes from habits like carrying a bag on the same side.',
        "Single-arm exercises so both sides work equally. We'll check it again on your next scan.",
      ),
      moderate: tier(
        'One shoulder sits noticeably higher. Over time one side does more of the work, which can show up as tightness in one side of your neck or shoulder.',
        'Single-arm strength work and a look at daily habits, like which side you carry bags and which hand uses the mouse.',
      ),
      significant: tier(
        'There is a clear height difference between your shoulders. Left alone, one side keeps taking more load in presses and rows, which raises injury risk on that side.',
        "We'll find where it's coming from and balance your training so both sides share the load.",
      ),
    },
    fix: {
      cause:
        'Usually habit: carrying bags on one side, a dominant arm in your sport or job, or always using the mouse with the same hand.',
      strengthen: 'the upper back on your weaker side',
      loosen: 'the top of your shoulder and neck on the tight side',
      moves: [MOVES.singleArmRow, MOVES.suitcaseCarry, MOVES.sideNeckStretch],
    },
  },
  anterior_pelvic_tilt: {
    id: 'anterior_pelvic_tilt',
    name: 'Arched lower back',
    impact: 'Keeps your lower back working overtime, a common cause of back ache.',
    area: 'lower back',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 5, moderate: 12, significant: 20 },
    priority: 'high',
    feedback: {
      mild: tier(
        'Your hips tip slightly forward, putting a small extra arch in your lower back. Common with lots of sitting, and easiest to fix early.',
        'Glute and core work, plus stretching the front of your hips in your warm-up.',
      ),
      moderate: tier(
        'Your hips tip forward, putting a clear arch in your lower back and pushing your stomach out. Your lower back muscles end up working overtime, which is a common cause of lower back ache.',
        'Stronger glutes and core, and stretching the hip muscles that tighten from sitting, so your lower back can relax.',
      ),
      significant: tier(
        'Your hips tip well forward, with a strong arch in your lower back. That loads your lower back every time you stand, squat or lift, which is the usual set-up for lower back pain.',
        "We'll fix your hip and core position first, before heavy squats and deadlifts.",
      ),
    },
    fix: {
      cause:
        'Long hours sitting tighten the muscles at the front of your hips, while your glutes and stomach muscles do less and less. The tight front pulls your hips forward and arches your back.',
      strengthen: 'your glutes and deep stomach muscles',
      loosen: 'the front of your hips and your lower back',
      moves: [MOVES.gluteBridge, MOVES.deadBug, MOVES.kneelingHipStretch],
    },
  },
  posterior_pelvic_tilt: {
    id: 'posterior_pelvic_tilt',
    name: 'Flat lower back',
    impact: 'Stiffens your hips, so your lower back takes the strain when you bend.',
    area: 'lower back',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 5, moderate: 12, significant: 20 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'Your hips tuck slightly under, flattening your lower back. This is often linked to tight hamstrings and long hours sitting.',
        'Hamstring stretches, glute strength, and practising how to bend from the hips before we add weight.',
      ),
      moderate: tier(
        'Your hips tuck under noticeably, flattening the natural curve of your lower back. It stops your hips moving freely, so your back takes the strain when you bend and lift.',
        'Stronger glutes, a looser upper back, and practice bending from the hips so your hips do the work, not your back.',
      ),
      significant: tier(
        'Your hips tuck well under, leaving your lower back flat and your hips stiff. Bending and lifting from here puts extra strain on your lower back.',
        "We'll rebuild your hip position step by step, starting light on squats and deadlifts.",
      ),
    },
    fix: {
      cause:
        'Tight hamstrings and long hours slumped in a chair pull your hips under and flatten the natural curve of your lower back.',
      strengthen: 'your lower back and the muscles that bend you at the hips',
      loosen: 'your hamstrings',
      moves: [MOVES.hipHinge, MOVES.birdDog, MOVES.hamstringStretch],
    },
  },
  lateral_pelvic_shift: {
    id: 'lateral_pelvic_shift',
    name: 'Hips shifted to one side',
    impact: 'One leg takes more of the load in squats and lunges.',
    area: 'hips',
    views: ['front', 'back'],
    thresholds: { mild: 3, moderate: 6, significant: 10 },
    priority: 'high',
    feedback: {
      mild: tier(
        'Your hips sit slightly to one side when you stand, usually from a habit of leaning on one leg.',
        'Single-leg balance and strength work, and standing with your weight even on both feet.',
      ),
      moderate: tier(
        'Your hips shift clearly to one side, so one leg is doing more of the work. It tends to show up in squats and lunges and can lead to aches in one hip or one side of your back.',
        'Single-leg and hip strength, and practising standing with your weight even on both feet.',
      ),
      significant: tier(
        'Your hips shift well to one side, so one side of your body takes much more load. Lifting heavy from here can turn that imbalance into hip, knee or back pain.',
        "We'll look at how you stand and walk, and even out both sides before heavy two-legged lifts.",
      ),
    },
    fix: {
      cause:
        'Usually a habit of standing on one leg, or one hip being stronger than the other, so your body leans on the stronger side.',
      strengthen: 'the side of your hip on the weaker side',
      loosen: 'the side of your waist on the tight side',
      moves: [MOVES.sideLyingLegRaise, MOVES.stepDown, MOVES.sidePlank],
    },
  },
  left_knee_valgus: {
    id: 'left_knee_valgus',
    name: 'Left knee drifts inward',
    impact: 'Knees that drift in are a leading cause of knee pain in training.',
    area: 'knees',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'high',
    feedback: kneeInward('left'),
    fix: kneeInwardFix,
  },
  right_knee_valgus: {
    id: 'right_knee_valgus',
    name: 'Right knee drifts inward',
    impact: 'Knees that drift in are a leading cause of knee pain in training.',
    area: 'knees',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'high',
    feedback: kneeInward('right'),
    fix: kneeInwardFix,
  },
  left_knee_varus: {
    id: 'left_knee_varus',
    name: 'Left knee bows outward',
    impact: 'Adds pressure to the inside of the knee when you run and jump.',
    area: 'knees',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'medium',
    feedback: kneeOutward('left'),
    fix: kneeOutwardFix,
  },
  right_knee_varus: {
    id: 'right_knee_varus',
    name: 'Right knee bows outward',
    impact: 'Adds pressure to the inside of the knee when you run and jump.',
    area: 'knees',
    views: ['front'],
    thresholds: { mild: 2, moderate: 5, significant: 9 },
    priority: 'medium',
    feedback: kneeOutward('right'),
    fix: kneeOutwardFix,
  },
  spinal_lateral_shift: {
    id: 'spinal_lateral_shift',
    name: 'Upper body leans to one side',
    impact: 'One side of your back and core works harder than the other.',
    area: 'back',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 8, significant: 14 },
    priority: 'high',
    feedback: {
      mild: tier(
        'Your upper body leans slightly to one side, usually from how you stand or sit.',
        'Core work, and carrying weights on each side separately to even things up.',
      ),
      moderate: tier(
        'Your upper body leans noticeably to one side. One side of your back and core is working harder, which can show up as tightness on that side.',
        'One-sided core and carry exercises, and a look at your daily habits together.',
      ),
      significant: tier(
        "Your upper body leans clearly to one side. We'll track it on every scan and ease off heavy lifting if it ever comes with pain.",
        'One-sided strength work, breathing drills, and a careful build-up to heavier lifts.',
      ),
    },
    fix: {
      cause:
        'Usually one-sided habits: carrying on one side, leaning on one elbow when you sit, or one side of your core being stronger than the other.',
      strengthen: 'the weaker side of your core',
      loosen: 'the tight side of your waist',
      moves: [MOVES.suitcaseCarry, MOVES.sidePlank, MOVES.standingSideStretch],
    },
  },
  uneven_hip_height: {
    id: 'uneven_hip_height',
    name: 'One hip higher',
    impact: 'Often means one side is doing more of the work.',
    area: 'hips',
    views: ['front', 'back'],
    thresholds: { mild: 0.5, moderate: 1.0, significant: 1.5 },
    priority: 'medium',
    feedback: {
      mild: tier(
        'One hip sits slightly higher than the other. Very common, and on its own usually nothing to worry about.',
        'Single-leg exercises and side-core work so both hips stay level when you lift.',
      ),
      moderate: tier(
        'One hip sits noticeably higher. It often means one leg and one side do more of the work, which can lead to aches in one hip or your lower back.',
        'Single-leg strength, and a check of habits, like which leg you stand on and whether one side tires first.',
      ),
      significant: tier(
        "There is a clear difference in your hip height. If you have pain or a limp, tell your coach, because it's worth checking properly.",
        "We'll look at where it comes from, and refer you on if needed, before any heavy lifting.",
      ),
    },
    fix: {
      cause:
        'Often one side of your hips and waist working harder than the other, from standing on one leg or a one-sided sport. Now and then it is a small difference in leg length.',
      strengthen: 'the side of your hip on the lower side',
      loosen: 'the side of your waist on the higher side',
      moves: [MOVES.sidePlank, MOVES.singleLegBridge, MOVES.standingSideStretch],
    },
  },
  forward_trunk_lean: {
    id: 'forward_trunk_lean',
    name: 'Leaning forward',
    impact: 'Shifts load onto your lower back instead of your legs.',
    area: 'lower back',
    views: ['side-left', 'side-right'],
    thresholds: { mild: 0.02, moderate: 0.045, significant: 0.08 },
    priority: 'medium',
    feedback: {
      mild: tier(
        "Your upper body sits slightly forward over your feet. It's minor, but it gives your lower back a little extra work all day.",
        'Looser ankles, practice bending from the hips, and standing tall when you lift.',
      ),
      moderate: tier(
        'You lean noticeably forward when standing. It tends to carry into your squats, putting more load on your lower back and less on your legs.',
        'Core strength, calf stretches and squat technique, so your legs do the work.',
      ),
      significant: tier(
        'You lean well forward when standing, pushing your weight onto your toes and your lower back. Lifting heavy from here strains your back.',
        "We'll work on your whole stance, from ankles to hips to core, before heavy squats and deadlifts.",
      ),
    },
    fix: {
      cause:
        'Usually stiff ankles or tight calves, so your body tips forward to keep its balance. A weak core can add to it.',
      strengthen: 'your core and glutes',
      loosen: 'your calves and ankles',
      moves: [MOVES.calfStretch, MOVES.plank, MOVES.gobletSquat],
    },
  },
  ankle_pronation_left: {
    id: 'ankle_pronation_left',
    name: 'Left arch rolls in',
    impact: 'When the arch rolls in, the knee tends to follow.',
    area: 'feet',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 7, significant: 11 },
    priority: 'low',
    feedback: archRollsIn('left'),
    fix: archRollsInFix,
  },
  ankle_pronation_right: {
    id: 'ankle_pronation_right',
    name: 'Right arch rolls in',
    impact: 'When the arch rolls in, the knee tends to follow.',
    area: 'feet',
    views: ['front', 'back'],
    thresholds: { mild: 4, moderate: 7, significant: 11 },
    priority: 'low',
    feedback: archRollsIn('right'),
    fix: archRollsInFix,
  },
} as const satisfies Record<string, PostureFeedbackDefinition>;

export type PostureFeedbackLibraryId = keyof typeof POSTURE_FEEDBACK_LIBRARY;

export function getPostureFeedbackDefinition(id: string): PostureFeedbackDefinition | undefined {
  return POSTURE_FEEDBACK_LIBRARY[id as PostureFeedbackLibraryId];
}
