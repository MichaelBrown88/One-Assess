# Foolproof One Assess: ranked plan

19 November 2026 · Status: **awaiting approval** · Branch: `claude/amazing-lamport-3d26a8`

Goal: any coach can complete an assessment without training, the maths is defensible, and a
client understands their report in 30 seconds.

Decisions already made by the owner:
- The studio-flow blockers are fixed first, in small commits on this branch. No deploy until the owner says so.
- Corrected maths applies everywhere, old reports included. Reports recalculate when opened, so some past numbers will move.
- An area that wasn't measured shows as grey "Not measured", never as 0, and the overall score says "based on N of 5 areas".

How this was gathered: a live walkthrough in the local preview (tablet size, signed-in studio account,
fictional client "ZZ Test Client"), a line-by-line read of `src/lib/scoring/**`, and the generated report
plus `/preview/sample-report`. No real client was opened or changed.

---

## Tier 0: blockers (coaches cannot finish an in-studio assessment)

Probably live in production now. Each fix is small and gets a regression test.

| # | Problem (seen live) | Root cause | Fix |
|---|---|---|---|
| 0.1 | After the first lifestyle answer the coach is thrown into Cardio. Sleep, stress, nutrition, hydration, steps, caffeine, **goals** and training frequency are never asked. | `isRemoteIntakeFormComplete` lost its `parq1` check in yesterday's merge (0890e21). It now turns true in studio once activity level is answered, so `filterPhasesForStudioBaseline` drops P0/P1 mid-flow and the phase index moves on to P3. | Only treat intake as remote when it really came from the remote link (the session flag or a `remoteIntakeSubmittedAt` marker), not because some fields are filled. Test: studio baseline keeps P0/P1 after activity level is set. |
| 0.2 | Movement "Section complete" does nothing, so Hinge and Lunge are unreachable and Strength stays locked. Typing grip snaps Strength back to step 1. The sidebar section links also fail. | `useAssessmentFlow` resets the section and field whenever `activePhase.sections` changes identity. `visiblePhases` rebuilds those arrays on **every** answer when org modules are set. `toggleSection` also merges `{...prev}`, so the first section always wins. | Reset only when the phase *id* changes. Keep section arrays stable (memo on the module config only). `toggleSection` replaces the expanded map. Tests for both. |
| 0.3 | Body Composition shows only "Posture". The analyzer and tape-measure screens never appear. | The module map says `bodycomp: ['body-comp']`, but the sections are `inbody-results` and `tape-measurements` (renamed Feb 2026). Default modules are always merged, so every org is affected. | Map `bodycomp` to both real section ids. Add a test that every phase section id is reachable from some module key. |
| 0.4 | The navigation shows Body Composition ✓ although nothing was entered. | Follows from 0.3: the phase only had an empty posture section. | Covered by 0.3. Add a test that a phase with no answers isn't marked complete. |

Note for the OFS/resume session: none of this touches resume or draft-import code (`useAssessmentDraft`,
import). The changes are in `useAssessmentFlow`, `useAssessmentNavigation` (section map, memo) and
`studioSessionSteps`. Recorded in the shared notes folder.

---

## Tier 1: scoring maths (wrong numbers in front of clients)

Ranked by how wrong and how often. Every item gets a failing test first.

**Rule for missing data, applied in every pillar:** an unmeasured item contributes nothing. It is not
averaged as 0, not averaged as 100, and never listed as a weakness or advice item. A genuinely measured
score of 0 stays in the average. Today several pillars use `filter(s => s > 0)`, which drops real zeros
and keeps the "missing = hidden" pattern.

| # | Finding | Evidence | Fix (source) | Effort |
|---|---|---|---|---|
| 1.1 | **Grip is halved when one hand is tested.** 44 kg right hand only scores as 22 kg. | Live test: report shows 44.0 kg, but the strength score used 22. | Average only the hands recorded. | S |
| 1.2 | **Grip isn't adjusted for age or sex.** `grip × 3` means 33 kg = 100, so almost every man scores 100 and a strong woman is under-scored. | `strengthScoring.ts` | Age/sex norms from Dodds et al. 2014 (UK normative grip, PLOS ONE), centiles mapped to the existing poor/average/excellent curve. Table values copied from the paper and cited in a code comment. | M |
| 1.3 | **VO₂max uses the wrong heart rate.** It uses 15.3 × HRmax / *recovery* HR; the Uth–Sørensen formula needs *resting* HR. A typical client shows about 21 instead of about 46. `cardioAnalysis.ts` already does this correctly, so the two screens disagree. | `cardioScoring.ts:47` | One shared `estimateVo2maxUth(age, restingHr)` used by both (Uth et al. 2004, Eur J Appl Physiol). | S |
| 1.4 | **Body fat is scored the same for men and women.** `100 − (BF − 12) × 3`: a woman at a healthy 28% scores 52. | `bodyCompositionScoring.ts` | Age/sex healthy ranges from Gallagher et al. 2000 (Am J Clin Nutr 72:694): top of healthy range = 75, top of overweight range = 50, obese falls to 10. Below the healthy minimum also scores lower (too lean isn't "perfect"). | M |
| 1.5 | **Muscle scores 100 for nearly everyone.** `SMM/weight × 300`: ratios of 0.34 or more all clamp to 100. In the sample report, 31% body fat still gives Body comp **75 (green)**. | Sample report: "Body fat is higher than is healthy" sitting under a 75. | Sex-specific reference (Janssen et al. 2000, J Appl Physiol: skeletal muscle ≈38% of body mass in men, ≈31% in women). Mean = 75, +1 SD = 100, −1 SD = 50. Labelled "planning reference" because analyzer SMM isn't MRI muscle. | M |
| 1.6 | **Waist-to-hip is too lenient and ignores sex.** A WHR of 1.0 in a man scores 85. | `bodyCompositionScoring.ts` | WHO 2008 cut-offs (men 0.90, women 0.85): 100 up to cut-off − 0.05, 70 at the cut-off, 40 at cut-off + 0.10, floor 10. | S |
| 1.7 | **Made-up values shown as measurements.** Without an analyzer, visceral fat is *estimated from waist* and muscle from a 0.45 factor, then both are displayed as if measured. Tape-only body fat can never work because **neck isn't collected**, yet the Navy formula needs it. | `bodyCompositionScoring.ts`, `phaseP2.ts` | Stop estimating visceral fat and muscle. Add neck as a tape site so tape-only body fat (US Navy, Hodgdon & Beckett 1984) works and is labelled "estimated from tape". | S |
| 1.8 | **Unmeasured items listed as priorities.** For example "Visceral Fat identified as a priority area" with no visceral value, "Hydration needs attention" when hydration was never asked, and "Sedentary" steps advice when steps are blank. | body comp and lifestyle weaknesses/advice | Only add weaknesses and advice for measured items. | S |
| 1.9 | **Missing posture sub-findings count as perfect.** Forward head "Moderate" with no tilt data = (50 + 100) / 2 = 75. The back averages missing kyphosis/lordosis/scoliosis as 100. The existing test encodes this. | `movementQualityScoring.ts` | Average only the findings present (Moderate FHP alone = 50). Update the test. | S |
| 1.10 | **Lunge torso shift is ignored.** The options save `shifts-left` / `shifts-right`, which aren't in the score map, so the fault is dropped and the lunge scores higher. | `movementQualityScoring.ts` scoreMap vs `lungeHipShift` options | Map both to 60. Add a test that every select option value has a score. | S |
| 1.11 | **Mobility "inferred from movement" double-counts the same squat.** Live: knees caving in still gave "Your joints move freely" and Movement 95. | live report | Only count mobility when it's measured directly; otherwise movement = patterns + posture. Drop the "joints move freely" line when mobility isn't measured. | S |
| 1.12 | **Wrong age bracket for some ages.** No matching bracket falls back to the *first* bracket, so a 70-year-old is judged against 20–29 push-up norms, and no date of birth does the same. | `scoringUtils.lookupNormativeScore` | Nearest bracket (clamp to youngest/oldest). Age 0 → don't score age-normed tests. | S |
| 1.13 | **Women's push-up norms assume knee push-ups**, but the instructions describe full push-ups for everyone. | `clinical-data.ts` comment vs tooltip | Decision needed (see the end). Recommended: add a "Push-up type: full / knees" choice and score each against its own ACSM table. | S–M |
| 1.14 | **Age is calculated from today, not the assessment date**, so an old report's scores drift as years pass. | `computeScores.ts` | Pass the assessment date. | S |
| 1.15 | Overall AXIS score = a simple average of the assessed pillars (20% each). That's a reasonable, explainable choice. `CONFIG.SCORING.WEIGHTS` exists but is unused and misleading. | `computeScores.ts`, `config` | Keep equal weighting and delete the unused weights. The report says "based on N of 5 areas". | S |
| 1.16 | The cardio instructions describe both a step test and a treadmill walk, while the recovery norms are YMCA *step test* norms. The flow now uses heart rate *drop* (HRR) whenever peak HR is entered, so those norms are effectively dead. | `assessment.ts` tooltips, `cardioScoring.ts` | Tooltips describe one protocol (the 3-min incline walk the run sheet shows). Remove the unused step-test branch. Note that HRR thresholds (Cole et al. 1999) are a health marker, not a fitness percentile. | S |

Number sanity (also a UX item): reject or confirm impossible entries before they reach a score
(2,525 push-ups and a 7,070-second plank were accepted live). See 2.5.

---

## Tier 2: assessment flow friction

Ranked by impact ÷ effort.

| # | Friction (seen live) | Fix | Impact | Effort |
|---|---|---|---|---|
| 2.1 | No sense of overall progress: the header says "Basic client info 3 of 6" or "Step 2 of 4 (this session)", never where you are in the whole visit. | One progress bar for the whole visit. See mock-up A. | High | S |
| 2.2 | Each new screen keeps the old scroll position, so the coach often lands on a blank screen with only "Generate Report" visible. | Scroll to top whenever the section or step changes. | High | S |
| 2.3 | "Generate Report" is on every screen from the first phase. The confirm dialog says "50% · Ready to generate the report" without saying what's missing. | Show it only on the last phase or in "Save and exit". The confirm dialog lists the missing areas and checks. See mock-up B. | High | S |
| 2.4 | The client list at iPad width hides "New assessment" in the hamburger menu, and the row's "Resume" button is cut off. | A visible "New assessment" button in the page header. The table stacks into cards under 900px. | High | S |
| 2.5 | No sanity ranges on numbers. | Per-field plausible ranges (e.g. resting HR 30–120, push-ups 0–150, plank 0–600 s, grip 5–90 kg, body fat 3–60%) with an inline "Check this: 2525 push-ups?" prompt. The coach can still override. See mock-up C. | High | S |
| 2.6 | The client list shows **AXIS 100** on an in-progress assessment (stored score from before the empty-posture fix). | Don't show a score for in-progress drafts. Re-save the stored `overallScore` when a draft is next opened. No bulk production write without approval. | Med | S |
| 2.7 | Client status badges flip within seconds ("On track" → "Overdue"), and a client assessed yesterday shows **Overdue**. | Find where status is computed (probably before the schedule data loads). Show a neutral placeholder until it has loaded. Test. | Med | M |
| 2.8 | Selected movement chips are barely visible, and "Looks good" stays big and orange after a fault is tapped. | A stronger selected state (filled + tick). "Looks good" dims once a fault is selected. | Med | S |
| 2.9 | Copy: P0 subtitle "…and health screening" (the PAR-Q is done outside the app). Recent activity options skip 3–6 months. Left/right labels are green/red (red reads as an error). | Fix the copy. Add "Stopped 3–6 months ago". Use neutral side labels. | Med | S |
| 2.10 | Two save buttons on every screen ("Save and exit" at the top and a big orange "Save for later"). | Keep one ("Save and exit", top right). | Low | S |
| 2.11 | The navigation drawer doesn't close with Escape, and the close × overlaps the logo. | Escape closes it; fix the overlap. | Low | S |
| 2.12 | The body comp phase comes after cardio, movement and strength. | **This is intentional** (private room last; resting HR first while seated). Keep the order, but show it in the progress bar so it isn't a surprise. | Low | S |

Not changed: one-question-per-screen in P0/P1 works well with tap-to-advance, and the cardio and
movement screens are clear and quick.

---

## Tier 3: client report clarity (the 30-second test)

Today a client sees the score, a five-area radar and per-area tables. The structure is good. What fails
the 30-second test is mostly trust:

| # | Problem | Fix |
|---|---|---|
| 3.1 | The radar plots an unmeasured area as **0** (live: "Body composition 0" in red). | Dashed grey spoke + "Not measured" label; the score says "based on 4 of 5 areas". See mock-up A2. |
| 3.2 | "Your overall score of 80 is **well above average for men aged 36–45**." The AXIS score isn't a population percentile, so the claim can't be backed. | Replace with a factual line: "80 out of 100 across the 4 areas we measured today." |
| 3.3 | "Fitness level 90" sits in a table of measurements (it's the score, not a measure), and "Peak heart rate 150 –" is meaningless to a client. | Show measures only: resting HR, heart-rate drop, estimated VO₂max (with corrected maths). |
| 3.4 | Lifestyle from one answer still gets a full section, plus steps advice when steps weren't asked. | Covered by 0.1 and 1.8. Show only the habits that were asked. |
| 3.5 | Contradictions: "Your joints move freely" next to "Knees cave in"; body comp 75 (green) under "Body fat is higher than is healthy". | Covered by 1.5 and 1.11. Add a copy guard test: a pillar ≥ 75 can't have a "focus" line about a measure scoring < 50. |
| 3.6 | No single "what to do next" at the top. | Under the hero: "Your top 2 priorities" (lowest two measured areas, one plain sentence each) and the next check-in date. Uses existing roadmap data; nothing new invented. |
| 3.7 | Tape measurements are hidden behind "Show". | Keep collapsed (owner direction 16 Nov). Show a one-line summary (waist and hips) in the header row so the key numbers are visible without opening it. |

---

## Mock-ups

**A. One progress bar for the visit (assessment header)**
```
┌──────────────────────────────────────────────────────────────┐
│ ZZ Test Client                                  Save and exit │
│ ●───●───●───◐───○───○───○                                     │
│ Details Lifestyle Fitness Movement Strength Body comp Results │
│                              ▲ you are here (2 of 3 patterns) │
└──────────────────────────────────────────────────────────────┘
```

**A2. Report hero with an unmeasured area**
```
   OVERALL SCORE                YOUR FIVE AREAS
      ╭───╮                       Body comp
     │ 78 │                    ┊  Not measured
      ╰───╯                Lifestyle ◇──── Strength 63
  Based on 4 of 5 areas        \        /
                            Movement 70 — Fitness 90

  Your top 2 priorities
  1. Core strength — plank 70 s; aim for 95 s by your next check-in.
  2. Lifestyle — sleep is often short; we'll build a wind-down routine.
  Next check-in: 17 December
```

**B. Before generating the report**
```
┌ Ready to create the report? ─────────────────────────┐
│ Still missing                                        │
│  • Body composition (analyzer or tape)     [Go there] │
│  • Movement: hinge, lunge                  [Go there] │
│ The report will say these weren't measured.          │
│        [Go back and finish]   [Create report anyway] │
└──────────────────────────────────────────────────────┘
```

**C. Number sanity prompt**
```
 Pushups in one minute
 ┌───────────┐
 │ 2525      │  ⚠ That's unusually high. Did you mean 25?
 └───────────┘     [Yes, keep 2525]  [Fix it]
```

---

## Order of work (small commits, tests passing at each)

1. Tier 0 (0.1–0.4): flow blockers, each with a regression test; re-walk the studio flow in the preview.
2. Tier 1: scoring fixes 1.1–1.16, test first. Re-check the sample report and the test client's report.
3. Tier 3 report items 3.1–3.3, 3.6 (depend on Tier 1 numbers).
4. Tier 2 items in table order.
5. Re-walk the full journey at tablet and phone sizes; run `npm run test:ci`, `npm run typecheck`, `npm run build`.

No deploy, no push to main, and no production data writes beyond the test client unless the owner says so.

## Follow-ups outside this plan
- `/try` sandbox is broken on the live site: Firebase rejects anonymous sign-in (`auth/admin-restricted-operation`). Either enable Anonymous auth in the Firebase console or remove the route and its links. This is a console setting, so the owner's decision.
- Local dev gets App Check 403s (no debug token registered for localhost). Worth a debug token so preview testing is reliable.
- Clean up the "ZZ Test Client" record in production when done.

## Decision needed
- 1.13 push-ups for women: (a) add a "full / knees" choice (recommended), or (b) everyone does full push-ups, scored against full push-up norms for both sexes.
