# iPad camera, analyzer scan and posture verification

## Goal
Verify the actual iPad path from camera permission through body composition OCR and four-view posture capture to a saved, reopened AXIS report. Keep desktop/unit checks separate from real-device results.

## Current constraint
The connected computer exposes Mac Chrome only. The user is not with the iPad. Do not claim an iPad pass, substitute a resized desktop browser for camera testing, or enable the Mac camera as proof of iPad operation.

## Preparation
- Inspect the production code paths for rear-camera selection, usable frame capture, scan review/fallback, four-view processing and durable image URLs.
- Run existing focused camera, OCR failure, posture alignment, image persistence and report-rendering tests.
- Record results and leave actual device steps pending. No real client records, camera permission settings, emails or photos need to be changed during preparation.

## Guided device run when available
1. Confirm iPad model, iPadOS version and whether the coach uses Safari or the installed home-screen app. Open the current production version in that usual surface. Use a clearly labelled new test assessment; keep the previous successful OFS test report intact.
2. At Body composition, tap Snap a Photo. Confirm permission handling, rear-camera preview, visible shutter and Close controls in portrait and landscape. Cancel once and reopen; verify earlier assessment values remain.
3. Scan a readable analyzer printout using the actual camera. Use the coach's own or a consenting test subject's sheet. Compare each imported value with the printout, including units and decimal points. Confirm retake/correction, no automatic advance, and manual fallback after an unreadable image.
4. At Posture, use capture on this device. Capture front, back, left and right views of a consenting adult test subject. Check full-body framing, capture, retake, orientation, and the ability to take the next view while an earlier one processes. Check each view reaches uploaded/analysed state and the final view is retained.
5. Save and exit, reopen, generate/save the full report, then reload. Independently verify four Storage URLs and corresponding analysis are persisted, the report displays the correct photos/findings, and any linked OFS consultation shows Completed and its report link.
6. Check lock/unlock or background/return once for recoverable camera behaviour. If the coach uses the installed app, test there; a Safari result alone does not validate installed-app behaviour.
7. Investigate observed failures using device evidence and production diagnostics. Make a written fix plan before substantive edits, add focused regression coverage, and deploy appropriate Firebase/Hosting changes plus the required preview. Re-run the affected device step.

## Completion evidence
Capture observed device/browser/version, actual scan values versus printout, four-view upload/save/reload results, saved report/session identity, and screenshots where supplied. Explicitly list any untested paths such as QR handoff, HEIC upload or offline recovery.
