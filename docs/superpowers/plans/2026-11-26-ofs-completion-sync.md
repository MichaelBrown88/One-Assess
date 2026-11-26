# OFS assessment completion and live verification

## Outcome
The coach opens the correct prefilled assessment from OFS, saves the AXIS report in One Assess, and returns to OFS to see Completed and View report automatically. A failed handoff stays in OFS with an actionable retry. Report links remain authenticated coach links, with no copied health results or client email sends.

## Implementation
1. Add an optional external assessment identifier to the existing intake contract. Persist a server-owned, organisation-scoped binding to the consultation, contact and assigned coach, preserving it across duplicate requests. Bind completion to a saved full-assessment session, not a draft or a previous client's report.
2. Add an authenticated status endpoint using the existing organisation API key, exact binding and coach checks. Return only state, saved-report identity, authenticated report URL and a monotonic revision. Reconcile deletion/inactive clients so stale completion cannot retain a usable report link.
3. Build on the existing signed webhook mechanism for reliable state notifications with retry, idempotency and no scores/health payload. OFS verifies the signature and reads authoritative status; focus/visible-page refresh provides recovery for delayed notifications. Do not let old events or an open consultation form overwrite newer completion.
4. Store only the OFS integration projection needed for consultation status/report navigation. Apply it atomically and enforce appointment/contact/coach linkage. RLS/server-only access and minimal grants apply. Keep manual assessment status for unlinked consultations.
5. Improve the assessment button: save consultation first, close the temporary tab on failure, show a useful error and retry, and open only a validated assessment link. Completed assessments offer View report rather than creating another draft. Refresh state when returning from One Assess without replacing unsaved consultation notes.
6. Test authentication, cross-coach/organisation access, exact matching, duplicate handoffs/events, stale updates, save completion versus draft, inactive/deleted records, failure/retry and form-save races. Run both repositories' required checks.
7. Release the required Firebase backend/hosting changes and OFS migration/application through their normal release paths. Also deploy the One Assess Hosting preview and record its channel URL. No report scoring or layout changes are planned.
8. Create clearly named synthetic OFS test data and exercise consultation → handoff → prefilled assessment → save/exit/resume → full physical capture → generated/saved/reopened report → automatic OFS completion and working report link. Verify retry without duplicate clients and login-return handling where the available session permits it. Preserve evidence and distinguish desktop tests from camera/device checks requiring actual hardware.

## Workspace
One Assess uses develop. OFS uses the clean existing one-fitness-app-ofs-handoff checkout on a new codex branch, leaving the other checkout's ongoing calendar work untouched.
