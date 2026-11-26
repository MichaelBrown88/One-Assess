# iPad capture preflight

26 November 2026. Actual iPad testing is pending: the user is not with the device, and only Mac browsers are connected.

## Completed

- Read the body composition camera entry, frame capture, OCR failure handling, coach-held posture capture and four-view apply/persistence code.
- Confirmed in source that Snap a Photo calls the direct camera path, OCR requests the rear camera, and coach-held posture also requests the rear camera.
- Confirmed in source that automatic posture application waits for all four persistent URLs, all four analysis results, and no uploads in flight. This is source inspection, not proof of an actual four-view upload.
- Existing focused tests passed: 29 tests across 9 files. They cover unavailable video frames, OCR error classification, posture overlay/alignment helpers, persistence sanitization and expanded report rendering.

## Not verified

Actual iPad permission prompts, rear-camera preview, shutter/cancel/retake behaviour, portrait/landscape layout, Safari versus installed app, real analyzer scan accuracy and AI service availability, four-photo processing/upload, locking/background recovery, and persistence of newly captured iPad images into a saved/reloaded report.

The camera unit test only checks that unavailable/not-ready video returns null. It does not exercise a real video frame or camera. OCR failure tests classify errors; they do not run a live OCR request. Passing these tests must not be described as a camera/OCR/iPad pass.

No application code, production records, camera permissions, uploads or emails were changed during this preflight. The device test plan is `docs/superpowers/plans/2026-11-26-ipad-capture-verification.md`. Create a clearly labelled fresh test assessment when the user has the iPad, and guide one action at a time.
