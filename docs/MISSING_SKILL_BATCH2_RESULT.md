# Missing Skill Metadata — Batch 2 Production Result

Date: 2026-09-13 (Brunei, UTC+08:00)

Status: **completed in production**.

Repository baseline at execution: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Issue: #250

## Scope

Exactly eight `public.questions.skill` values were repaired in production:

| Question | Immutable ID | New skill |
|---|---|---|
| 2018 P1 Q1 | `068748e8-c865-4b4a-bdac-c225466343c3` | `Subtract whole numbers` |
| 2018 P1 Q10 | `81e098c5-6d44-491a-9617-e71e70a10567` | `Find the number of unit fractions in a mixed number` |
| 2018 P1 Q15 | `c0f283d8-7776-40f0-99b6-dc17c1c41741` | `Find the HCF of three numbers` |
| 2018 P1 Q16 | `e3832e71-1b56-4156-8e5f-32d6ff56b7fc` | `Simplify an algebraic expression` |
| 2018 P1 Q20 | `c810cf9b-51a9-4db4-a895-f099167f9883` | `Express a number as prime factors` |
| 2019 P1 Q1 | `47b30fd8-23ee-4437-934a-8ef59d01a968` | `Add whole numbers` |
| 2019 P1 Q2 | `d8bd2c10-028e-4ca6-a742-f67685d4c867` | `Subtract whole numbers` |
| 2019 P1 Q3(b) | `7e889aec-bd55-4aea-b98d-013f259f9c90` | `Multiply a decimal by 100` |

## Guarded execution

Immediately before the write:

- total questions: 1003;
- Practice-eligible questions: 655;
- blank Practice `skill` rows: 115;
- target rows found: 8/8;
- target rows meeting frozen preconditions: 8/8;
- pre-existing `skill` history rows for these targets: 0.

The write ran in one guarded transaction with row locking and exact-count assertions. It would have raised and rolled back if fewer or more than eight rows matched the expected state.

## Verified result

Post-write checks confirmed:

- total questions: **1003** — unchanged;
- Practice-eligible questions: **655** — unchanged;
- blank Practice `skill` rows: **107** (down from 115);
- intended skill values: **8/8 correct**;
- safe state (`active=true`, `practice_eligible=true`, not `needs_review`): **8/8**;
- exactly **8** new `question_change_history` entries record `skill` only;
- every audit entry records old value blank and new value equal to the approved Batch 2 skill;
- system-level `changed_by` remains `NULL`, consistent with prior admin/system history convention.

All eight audit entries share transaction timestamp `2026-09-13 12:06:15.750769+00`.

## Historical attempt preservation

No historical answer row was rewritten.

- 2018 P1 Q10: 1 historical attempt remains, with its original blank `skill` snapshot;
- 2018 P1 Q16: 1 historical attempt remains, with its original blank `skill` snapshot.

This preserves the attempt-time evidence while future attempts can use the repaired question metadata.

## Integrity smoke-check

Post-write Practice checks remain clean:

- review conflicts: 0;
- inactive-but-Practice-eligible rows: 0;
- invalid Practice marks: 0;
- missing Practice question text: 0;
- missing Practice topic: 0;
- missing Practice strand: 0;
- missing Practice answer: 0;
- unknown non-null Practice response types: 0.

A temporary verifier initially counted 37 rows as unknown because it incorrectly treated legacy `response_type = NULL` rows as unsupported. The corrected check distinguishes null legacy rows from genuinely unknown non-null response types; the corrected unknown count is 0. No production data was changed by that read-only verifier mistake.

## Outcome

Batch 2 successfully reduced the outstanding blank Practice `skill` debt from **115 to 107** without changing question exposure, answers, marks, response configuration, review state, publication state, or historical student evidence.

Metadata V2 remains a separate track and is still blocked on independent Reviewer-B calibration in Issue #246.