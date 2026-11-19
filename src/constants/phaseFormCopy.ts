/**
 * User-visible strings for the multi-phase assessment form shell.
 */

export const PHASE_FORM_COPY = {
  SAVE_AND_EXIT: 'Save and exit',
  SAVE_AND_EXIT_TOAST_DESCRIPTION: 'Your progress is saved. You can pick up where you left off from the dashboard.',
  SAVE_AND_EXIT_LOCAL_ONLY_DESCRIPTION:
    'Saved on this device. Cloud backup will retry when you resume the assessment.',
  PARTIAL_BADGE_PREFIX: 'Quick Update:',
  /** Single end-of-session loading state (covers scoring + report chunk load; save runs in the background) */
  RESULTS_SUSPENSE_TITLE: "Building your client's report\u2026",
  /** Shown on the results tab while the assessment is uploading to the dashboard */
  RESULTS_SAVING_STATUS: 'Saving to your dashboard…',
  FOOTER_PROFESSIONAL_SUFFIX: 'Professional v2.1 • Confidential Client Data',
  FOOTER_DEFAULT_ORG_NAME: 'One Assess',
  NO_PHASES_CONFIGURED: 'This assessment has no sections set up yet. Go to Settings to configure your assessment phases.',
  SKIP_QUESTION: 'Skip',
} as const;

/** Copy for the P3 fitness capture sheet (three HR readings + coach protocol note). */
export const CARDIO_RUN_SHEET_COPY = {
  KICKER: 'Fitness test',
  INTRO: 'Record three heart rates. Time the test yourself on the treadmill or a watch.',
  PROTOCOL_HEADING: 'How to run the test',
  PROTOCOL_INSTRUCTION:
    'Client seated and calm for resting heart rate first. Then a 4-minute incline walk at 5 km/h, incline 10. Note peak heart rate at the end of the walk, sit them down, and take recovery heart rate after 1 minute.',
  RESTING_LABEL: 'Resting heart rate',
  RESTING_HINT: 'Seated and calm for at least 5 minutes before you record it.',
  PEAK_LABEL: 'Peak heart rate',
  PEAK_HINT: 'Heart rate at the end of the 4-minute walk, just before stopping.',
  RECOVERY_LABEL: 'Recovery heart rate',
  RECOVERY_HINT: 'One minute after the walk ends, still seated.',
  BPM_UNIT: 'bpm',
  COMPLETE: 'Section complete',
  BACK: 'Back',
} as const;
