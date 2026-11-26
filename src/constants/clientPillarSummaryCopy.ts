/**
 * Client-facing pillar summary lines, keyed by scoring detail id.
 *
 * Every line says what we found and why the client should care. `nudge` is
 * for "could be better" (score 50 to 74); `focus` is for "needs work" (< 50).
 * Body-fat copy stays goal-neutral so muscle-gain clients never read cut advice.
 * Posture has no line here: the posture scan section writes its own summary
 * from the photos, and a second score-based line could contradict it.
 */

export interface PillarDetailCopy {
  strong: string;
  nudge: string;
  focus: string;
}

export const PILLAR_DETAIL_COPY: Record<string, PillarDetailCopy> = {
  bf: {
    strong: 'Your body fat is in a healthy range.',
    nudge: 'Body fat is a little higher than ideal. As you build muscle and stay active, that balance improves.',
    focus: 'Body fat is higher than is healthy. It raises your risk of heart disease and diabetes, so improving it is worth prioritising.',
  },
  smm: {
    strong: 'You carry good muscle for your frame. That is a real head start, because muscle burns calories and protects your joints.',
    nudge: 'There is room to add muscle. More muscle burns more calories at rest and makes everyday life easier.',
    focus: 'Muscle is low for your frame. Building it is the best thing you can do for your metabolism, strength and long-term health.',
  },
  visceral: {
    strong: 'The fat around your organs is in a healthy range. That is the type that matters most for long-term health.',
    nudge: "Fat around your organs is creeping up. It's the type most linked to heart disease and diabetes, and usually the first to drop once training and food are on track.",
    focus: "Fat around your organs is high. It's the type most linked to heart disease and diabetes. The good news: it's usually the first to drop once training and food are on track.",
  },
  whr: {
    strong: 'Your waist is in proportion to your hips.',
    nudge: 'Your waist is a little large compared with your hips. Fat around the middle is the kind most linked to health risk.',
    focus: 'Your waist is large compared with your hips. Fat around the middle is the kind most linked to heart disease and diabetes.',
  },
  pushups: {
    strong: 'Good upper-body strength in the push-up test.',
    nudge: 'Push-ups were your weakest test. More upper-body strength makes pushing, lifting and carrying easier, and protects your shoulders.',
    focus: 'Upper-body strength is low. Building it makes everyday pushing, lifting and carrying easier, and protects your shoulders.',
  },
  squats: {
    strong: 'Strong legs in the squat test.',
    nudge: "Squats were your weakest test. Stronger legs make stairs and getting up easier, and they're your biggest calorie-burning muscles.",
    focus: 'Leg strength is low. Your legs are your biggest calorie-burning muscles, and stronger legs keep you moving well for life.',
  },
  singleLeg: {
    strong: 'Strong legs in the single-leg test.',
    nudge: "The single-leg test was your weakest. Stronger legs make stairs and getting up easier, and they're your biggest calorie-burning muscles.",
    focus: 'Leg strength is low. Your legs are your biggest calorie-burning muscles, and stronger legs keep you moving well for life.',
  },
  plank: {
    strong: 'A solid core in the plank hold.',
    nudge: 'Your plank was your weakest test. A stronger core protects your lower back and lets you lift heavier safely.',
    focus: 'Core strength is low. A stronger core protects your lower back and lets you lift heavier safely.',
  },
  grip: {
    strong: 'Strong grip, one of the best signs of long-term health.',
    nudge: "Grip strength has room to grow. It's one of the best signs of long-term health, and it often limits how much you can lift.",
    focus: "Grip strength is low. It's one of the best signs of long-term health, and it limits how much you can lift.",
  },
  cardioClass: {
    strong: 'Your fitness level is good for your age.',
    nudge: 'Your fitness level is about average for your age. Fitness is one of the strongest predictors of a long, healthy life.',
    focus: "Your fitness level is below average for your age. It's one of the strongest predictors of long-term health, and one of the quickest things to improve.",
  },
  rhr: {
    strong: 'Your resting heart rate is low, a sign your heart works efficiently.',
    nudge: 'Your resting heart rate is a little high. Bringing it down means your heart does less work every minute of the day.',
    focus: "Your resting heart rate is high. Bringing it down means your heart does less work all day, and you'll have more energy.",
  },
  hrr: {
    strong: 'Your heart rate came down quickly after the test, a sign of a fit heart that recovers well.',
    nudge: 'Your heart rate was a little slow to come down after the test. Faster recovery means you bounce back quicker between efforts.',
    focus: 'Your heart rate was slow to come down after the test. Improving that means you recover faster and handle hard efforts better.',
  },
  hr60: {
    strong: 'Your heart rate came down quickly after the test, a sign of a fit heart that recovers well.',
    nudge: 'Your heart rate was a little slow to come down after the test. Faster recovery means you bounce back quicker between efforts.',
    focus: 'Your heart rate was slow to come down after the test. Improving that means you recover faster and handle hard efforts better.',
  },
  movement: {
    strong: 'You move well, with good control.',
    nudge: 'Some of your movement needs tidying up. That keeps your knees, hips and back safe as the weights go up.',
    focus: 'Your movement needs work. Fixing it first keeps your knees, hips and back safe as the weights go up.',
  },
  mobility: {
    strong: 'Your joints move freely.',
    nudge: 'Your joints are a little stiff. Freeing them up lets you train in better positions and keeps aches away.',
    focus: 'Your joints are stiff. Freeing them up lets you train safely and keeps everyday aches away.',
  },
  sleep: {
    strong: 'You sleep well.',
    nudge: 'Sleep could be better. It is when your body recovers from training, and poor sleep makes hunger and cravings harder to control.',
    focus: 'Sleep is the biggest thing to fix. It is when your body recovers from training, and poor sleep makes hunger and cravings harder to control.',
  },
  stress: {
    strong: 'You manage stress well.',
    nudge: 'Stress is running a little high. It feeds cravings, poor sleep and slower recovery.',
    focus: 'Stress is high. It feeds cravings, poor sleep and slower recovery from training.',
  },
  nutrition: {
    strong: 'Your eating habits are solid.',
    nudge: "Your eating has room to improve. It's where most results are won or lost, and the plan below keeps it simple.",
    focus: "Your eating needs work. It's where most results are won or lost, and the plan below keeps it simple.",
  },
  hydration: {
    strong: 'You drink enough through the day.',
    nudge: 'You could drink a bit more. Even mild dehydration saps energy and makes training feel harder.',
    focus: "You're not drinking enough. Even mild dehydration saps energy and makes training feel harder.",
  },
  activity: {
    strong: "You're active day to day.",
    nudge: 'Daily steps are a bit low. Moving more outside the gym burns more calories than most people expect.',
    focus: 'Daily steps are low. Moving more outside the gym burns more calories than most people expect, and it helps your heart.',
  },
};

export const PILLAR_SUMMARY_COPY = {
  notAssessed: (label: string) => `${label} wasn't part of this assessment. Your coach can add it in a follow-up session.`,
  keepGoing: "Keep doing what you're doing.",
  improved: 'You improved since your last assessment.',
  declined: 'This dipped slightly since your last assessment.',
  bandStrong: (label: string) => `${label} is a strength. Keep doing what you're doing.`,
  bandMid: (label: string) => `${label} is a good base, with room to improve.`,
  bandLow: (label: string) => `${label} needs attention. It's where you'll see the quickest gains.`,
} as const;
