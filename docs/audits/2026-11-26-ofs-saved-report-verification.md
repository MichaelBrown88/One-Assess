# OFS to One Assess saved-report verification

26 November 2026. Production browser walkthrough in the signed-in Chrome coach session, using synthetic data only.

## Result

PASS: OFS consultation → prefilled One Assess assessment → save and exit → reopen from OFS → complete physical capture → generate and save AXIS report → automatic OFS completion and report link → reopen that saved report → reload both apps.

- Test contact: **ZZ QA OFS Completion**, `qa-ofs-completion-20261126@example.com`.
- OFS contact: `0f451089-e9a5-47b5-b97b-7b0e748dc1d9`; `is_test`, email unsubscribe and permanent suppression enabled before testing.
- OFS appointment/consultation: `47f66984-6eb2-4bab-9686-872e1515ee09`.
- One Assess client: `zz-qa-ofs-completion` in the One Fitness organisation.
- Saved full session: `2026-11-26T17-47-31-941Z`; AXIS score 79.
- [Saved report](https://one-assess.com/dashboard/clients/zz-qa-ofs-completion/report?session=2026-11-26T17-47-31-941Z).
- [OFS consultation](https://www.onefitnessstudio.com/admin/consultations/47f66984-6eb2-4bab-9686-872e1515ee09).
- Test records retained for review. No client invitation, report email, invoice, payment or onboarding action was sent by this walkthrough.

## Observed in the browser

1. The OFS Open ONE ASSESS button opened the correct client and automatically resumed the prefilled assessment. Build muscle, Weight loss and Improve fitness were already selected from the OFS contact.
2. The coach completed remaining intake and lifestyle answers. Fitness came first in the physical sequence.
3. Fitness values 74 / 148 / 112 bpm were entered. Save and exit returned to the client directory. OFS automatically displayed Assessment in progress and Continue assessment, replacing the manual status selector.
4. Continue assessment in OFS reopened the same client, automatically resumed the Fitness phase and retained all three heart rates. It did not create another client or reset the draft.
5. Movement used explicit observations and pain answers. Looks good on hinge did not prematurely advance before pain confirmation and Section complete.
6. An intentionally invalid 2525 push-ups produced a visible 0–150 warning and disabled Next. It was corrected to 18 before proceeding or saving the full report.
7. Strength included the new single-leg sit-to-stand test, recorded separately for left and right legs in 30 seconds. Body composition used the slim analyzer form, followed by ten mandatory tape measurements.
8. Manual posture was used without images. Forward head and rounded shoulders persisted into the saved report as plain-language findings.
9. The final review showed 100% completion, then report generation and saving states, then Assessment Saved. The saved report had the correct test name, date, goals, measurements, score and 16-week plan.
10. Returning to OFS showed Assessment completed and View report without manually changing status. The link included the exact saved session identifier.
11. Saving the still-open consultation after completion did not revert its status. Its earlier training note remained unchanged.
12. Clicking View report opened the saved report. Full reloads of One Assess and OFS preserved the report, completion state and link. The saved-report tab had no captured warning or error logs.

## Server evidence

- Intake binding revision 1 was in_progress; revision 2 was completed with the correct contact, consultation, coach, client and session.
- The source session contained the server-created integration binding identifier and `assessmentType: full`.
- Signed webhook deliveries succeeded at 17:43:04 UTC (in progress) and 17:47:36 UTC (completed).
- Supabase independently showed `one_assess_links.status = completed`, revision 2, the exact saved session URL, and `consultations.physical_assessment_status = completed`.
- Consultation note remained: “Synthetic QA only. Trains three times weekly; this note must survive automatic report completion.”
- Unauthenticated requests to the production status endpoint returned 401.

## Automated validation and release

- One Assess full suite: 703 tests passed in 108 files. Final app typecheck, Functions build, hosting build, focused completion/intake tests and changed-code lint passed.
- OFS integration release: PR #123, merged as `8135eaa0913994acd9a1b351021125acfe35462b`. Full CI: 3,986 tests passed, one pre-existing skip; typecheck and Vercel preview passed.
- Coverage includes exact consultation binding, wrong coach/contact, draft versus full session, duplicate/stale events, inactive/deleted clients, report URL validation, signed webhook validation, storage failure/retry, SQL permissions and stale-form-save protection.
- The live walkthrough identified a brief Open ONE ASSESS flash while completed status loaded. Follow-up PR #125, merged as `dd23654ab0ef34cd936e5fc7272add6fd3b1fa47`, shows a quiet Checking assessment state until the response arrives. All 3,987 OFS tests and type checks passed; six focused UI tests include the pending-response case. Production was deployed and the quiet checking state was observed in Chrome.
- One Assess backend and production Hosting deployed. OFS migration applied, production webhook environment configured and signed completion subscription enabled.
- [One Assess Hosting preview](https://assessment-engine-8f633--preview-20261126-203055-ckdw8cgy.web.app).

## Coverage limits

This was a desktop synthetic-data workflow, not an exercise-protocol or clinical validation. It used an already signed-in coach. A complete signed-out login-return journey, camera permissions, analyzer OCR, coach-held/QR posture photography, image analysis/upload, mobile/tablet hardware, offline recovery, report email and PDF export were not exercised here. Authentication, identity matching and signature rejection have automated coverage; these are not substitutes for those device-specific browser checks.

Minor existing copy inconsistency observed: manual posture findings sit under “Your posture scan.” No report layout, calculation or copy change was included in this integration release.
