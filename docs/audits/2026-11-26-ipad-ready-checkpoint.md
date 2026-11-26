# iPad capture test ready

Prepared synthetic client **ZZ QA iPad Capture**, with sample intake, lifestyle, fitness, movement, strength and tape answers. Analyzer values and posture captures are empty. This is a camera QA fixture, not a personal assessment.

- Resume: https://one-assess.com/dashboard/clients/zz-qa-ipad-capture?resume=1
- OFS consultation: https://www.onefitnessstudio.com/admin/consultations/7875744f-c37d-469e-bde1-ce7d517b537a
- Fresh OFS integration binding: `990ba78bdf14df48ad0fc1ff481d976f84db73ef`.
- OFS fixture is marked test, unsubscribed and suppressed. No email sent.

Production desktop browser verification: direct resume opens P2 Body Composition with Snap a Photo; Assessment steps > Posture opens Take posture photos without repeating earlier phases. Returned to Analyzer results, used Save and exit, observed Draft saved, then reopened the direct resume link successfully at the scanner. Read-back confirms P2, the new integration binding and empty posture captures.

Synthetic-only restoration checkpoint is stored locally at `/Users/michael/.codex/visualizations/2026/11/26/01a216c5-223f-7eb0-be36-907975286851/ipad-camera-checkpoint.json`. Preserve actual captures before any restoration. Screenshot: adjacent `ipad-test-ready.png`.

Pending physical iPad checks: camera permission/preview, printout scan and extracted numbers, four posture photos and one retake, processing/persistence, report save/reopen and OFS completion link. Partner is needed only for posture capture; scan before and save/report checks afterward. No actual iPad camera or image processing was exercised in this preparation. No application changes or deployment were required.
