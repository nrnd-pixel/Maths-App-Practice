# Maths Practice App — Known Issues and Watchlist

Last updated: 2026-09-25

This file records unresolved defects, stale branches and data-quality risks that may affect future work. Resolved timing/test issues are kept only where the lesson remains operationally useful.

## 1. Controlled V5.9B pilot effectiveness is not yet established

Status: implementation accepted; learning-effectiveness evidence still pending.

Verified technical state:
- merged browser pilot: PR #271;
- server readiness hardening: PR #272;
- pilot remains `allow_all_students=false` with exactly one allowed student and two allow-listed target IDs: 2025 P1 Q9(b) and 2025 P2 Q4;
- only 2025 P1 Q9(b) and 2025 P2 Q4 are Metadata V2 adaptive-eligible;
- 2025 P2 Q30 remains unprofiled/ineligible, is outside the current pilot target allow-list, and must fail closed.

Risk:
A green smoke test proves the flow works technically, not that the diagnostic sequence improves learning or is well understood by students.

Preferred action:
Collect controlled evidence before expanding students, targets or adaptive selection logic. Track trigger timing, diagnostic completion/correctness, target retry result, score/XP/mastery invariants and usability friction.

## 2. 2025 Paper 2 Q30 adaptive target remains source-blocked

Status: unprofiled / ineligible.

Q30 is no longer in the pilot target allow-list, and an authoritative original 2025 Paper 2 Q30 source page/Table 2 has still not been directly verified for Metadata V2 calibration.

Handling:
Keep Q30 unprofiled/ineligible and outside the pilot target allow-list. The browser and server readiness contracts must continue to fail closed if this target is queried. Do not calibrate from transformed/question-bank wording alone.

## 3. `/demo-student/` hint counter can double-count

Status: minor demo-only issue; no production Practice impact.

Failure mode:
If a viewer manually opens a hint and then submits an incorrect first attempt, the demo can increment the final `Hints shown` statistic twice for the same question.

Impact:
Only the static demo completion statistic. No Supabase, real student record, scoring or production Practice behaviour is affected.

Priority:
Low. Fix opportunistically if it stays isolated and does not create unnecessary seal/CI churn.

## 4. Superseded adaptive drafts #209 / #237 are closed

Status: resolved housekeeping; superseded by merged PR #271.

Rule:
Do not revive these older contracts as implementation baselines. PR #271 and the current server readiness contracts remain authoritative for the controlled adaptive pilot.

## 5. Old demo PRs #204 and #205 are closed

Status: resolved housekeeping; superseded by PR #242.

The maintained V5.9 demo routes are the PR #242 implementation. Do not revive the older V5.8.1 demo branches as current baselines.

## 6. PR #180 Science V0.2 is parked on an old baseline

Status: parked.

It was built from an older Maths baseline and should not be revived by simply merging/rebasing blindly.

Preferred action if resumed:
Map current architecture and re-create/re-base the isolated Science pilot from the then-current verified main. Current scope remains Maths-first, so do not resume it now.

## 7. Paper 2 source/data audit issues

### 2022 Q30
Printed prices, ratio and stated total are internally inconsistent.

Handling:
Keep inactive/manual-review and exclude from automated difficulty/adaptive calibration until source resolution.

### 2023 Q30
Printed answer line uses `cm²` although the question asks for a length; the mathematically appropriate unit is `cm`.

Handling:
Use the corrected mathematical unit while preserving a source audit flag.

## 8. Current difficulty metadata is not discriminating enough

Observed evidence from the combined Paper 2 analysis:
- 169 of 170 digitised rows are labelled `standard`;
- only one row is labelled `challenge`.

Impact:
The current field should not be treated as sufficient evidence for adaptive sequencing or cross-year difficulty analysis.

Preferred direction:
Continue Question Metadata V2 calibration from verified sources and later calibrate against real performance data.

## 9. Topic labels can hide embedded skills

Examples include percentage reasoning or unit conversion embedded inside Time, Mass, Capacity, Money or other labelled topics.

Impact:
Topic-only analytics can misdiagnose a shared underlying weakness as several unrelated topic weaknesses.

Preferred direction:
Use secondary/embedded skill and prerequisite evidence before richer automatic recommendations.

## Resolved checkpoints worth remembering

### P0.3 Question Bank semantic-integrity checkpoint

Resolved by PR #323 / Issue #322 on main `66fe4d7ba039ed26da20f39b111183e14503a156`.

Decision:
Malformed response contracts, impossible Paper 1/2 row marks, and explicit past-paper source/year/paper contradictions are now surfaced by teacher QA and block activation.

Lesson:
Keep preventive structural QA separate from source-content judgement. The checkpoint does not resolve authoritative-source uncertainties such as 2022 Q30, the 2023 Q30 source-unit correction audit, or 2025 P2 Q30 Metadata V2 calibration.

### Phase 7D frozen-loader decision

Resolved by PR #319 / Issue #315 on main `668f97d0ae36624b877a80f5091af31a821b1f83`.

Decision:
Retain the current frozen nested loader. The dormant flat-loader prototype is evidence/tooling only; no production successor is authorised.

Lesson:
Do not cross frozen loader/seal boundaries for a trivial request-count reduction. Require a concrete defect or material architectural payoff before reopening them.


### V56/V57 Student Home readiness Playwright races

Resolved by:
- PR #244 for the F/K Assignments readiness race;
- PR #269 for the corresponding Gate G Progress readiness race.

Lesson:
Synchronise tests with the existing runtime readiness contract (`data-v57c-rendered="true"`) rather than increasing timeouts or weakening assertions.

### PR #237 no longer represents the accepted adaptive implementation

PR #271 rebuilt Stage 3 from current main and passed exact-head CI plus manual smoke testing. PR #237 is now only stale history and must not be used as a source-of-truth implementation.

## Watchlist discipline

When an item is resolved:
1. link the resolving PR/commit;
2. state the verified main SHA where useful;
3. move any durable architectural lesson to `DECISIONS.md`;
4. remove or mark the warning resolved rather than leaving ambiguous stale guidance.
