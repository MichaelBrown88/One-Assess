/**
 * Copy for the coach-held in-studio posture capture panel (silent flow:
 * coach frames the client against guide lines and judges each shot).
 */

export const COACH_POSTURE_CAPTURE_COPY = {
  VIEW_HEADER: (n: number, total: number, label: string) => `View ${n} of ${total} — ${label}`,
  VIEW_LABELS: {
    front: 'Front',
    'side-left': 'Left side',
    back: 'Back',
    'side-right': 'Right side',
  } as Record<string, string>,
  VIEW_HINTS: {
    front: 'Client faces the camera. Head under the top line, toes on the bottom line, centred on the midline.',
    'side-left': 'Client makes a quarter turn to their right — left side to the camera, full profile.',
    back: 'Client faces away from the camera, arms relaxed at their sides.',
    'side-right': 'One more quarter turn — right side to the camera, full profile.',
  } as Record<string, string>,
  SHUTTER_ARIA: 'Take photo',
  USE_PHOTO: 'Use photo',
  SAVING: 'Saving…',
  RETAKE: 'Retake',
  ALL_DONE_TITLE: 'All four views captured',
  ALL_DONE_BODY: 'Analysis is running — results appear on the posture screen in a few seconds.',
  DONE_CLOSE: 'Done',
  CLOSE_ARIA: 'Close posture capture',
  CAMERA_STARTING: 'Starting camera…',
  CAMERA_ERROR_TITLE: "Camera couldn't start",
  CAMERA_ERROR_BODY:
    'Allow camera access for this site in the browser settings, then tap Try again.',
  CAMERA_RETRY: 'Try again',
  UPLOAD_FAILED_TITLE: "Couldn't save that view",
  UPLOAD_FAILED_BODY: 'Check the connection and retake the view from the posture screen.',
} as const;

/** Copy for the studio posture options modal (coach capture primary, upload secondary). */
export const POSTURE_STUDIO_MODAL_COPY = {
  TITLE: 'Posture photos',
  SUBTITLE: 'Capture four views — front, left side, back, right side.',
  OPTION_CAPTURE: 'Capture with this device',
  OPTION_CAPTURE_HINT: 'You hold the camera, line the client up with the guides, and confirm each shot.',
  OPTION_UPLOAD: 'Upload photos',
  UPLOAD_HEIC_NOTE:
    'iPhone HEIC photos are converted automatically. If upload fails, export as JPEG from Photos (Share → Save Image) and try again.',
  GRID_HINT: 'Photos appear here as each view is captured.',
  APPLY: 'Apply Analysis',
  APPLY_FAILED_TITLE: "Photos aren't ready yet",
  APPLY_FAILED_BODY: 'Wait for each view to finish saving, then apply again.',
  PHOTO_CTA: 'Take posture photos',
  PHOTO_BODY:
    'Capture the four views with this device, or upload photos. Analysis runs automatically.',
  PHOTO_BODY_DONE: 'Photos captured — retake if needed or continue to the next step.',
  SWITCH_MANUAL: 'Switch to manual observation',
} as const;
