# Missing Skill Metadata — Batch 3 Production Result

Date: 2026-09-13 (Brunei, UTC+08:00)

Status: **completed in production**.

Repository baseline at execution: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Issue: #251

## Scope

Exactly six `public.questions.skill` values were repaired in production:

| Question | Immutable ID | New skill |
|---|---|---|
| 2018 P1 Q11 | `94ec85ee-5d9e-463e-9308-f84318810543` | `Evaluate a power and square root expression` |
| 2019 P1 Q5 | `346aab8e-1a40-486b-bb9f-d97a214e126e` | `Convert a mixed number to an improper fraction` |
| 2019 P1 Q6 | `1f47f30b-fdf7-46b5-a893-37594ba23bbf` | `Evaluate a power and square root expression` |
| 2019 P1 Q10 | `59b8726a-992d-4cfe-945d-1357430813a5` | `Simplify an algebraic expression` |
| 2019 P1 Q12 | `ffc6d2fe-5be4-422e-b1b4-874ae9de88af` | `Divide a 4-digit number by a 1-digit number` |
| 2019 P1 Q15 | `cc3af513-392e-4f14-889a-2f1a159f6979` | `Express a number as prime factors` |

No other question field or historical student record was intentionally changed.

## Guarded execution

Immediately before the write:

- current GitHub `main` remained `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`;
- all six immutable UUIDs existed;
- all six still had blank `skill`;
- all six remained `active=true`, `practice_eligible=true`, and outside `needs_review`;
- all six still matched frozen `updated_at='2026-09-01 23:25:59.580904+00'`;
- all six had blank `image_url`;
- zero pre-existing `skill` history rows existed for the targets;
- neither 2018 nor 2019 Paper 1 had an `exam_paper_settings` row;
- 2018 P1 Q11 still had exactly one historical attempt with a blank saved `skill` snapshot.

The production write ran in one transaction with row locking and assertion failures configured to roll back the whole operation on any mismatch. The transaction updated only `questions.skill` for the six approved UUIDs and asserted exactly six rows changed.

## Verified result

Independent post-write verification confirmed:

- total questions: **1003** — unchanged;
- Practice-eligible questions: **655** — unchanged;
- blank Practice `skill` rows: **101** (down from 107);
- intended skill values: **6/6 correct**;
- safe state (`active=true`, `practice_eligible=true`, not `needs_review`): **6/6**;
- exactly **6** new `question_change_history` entries exist;
- every audit entry has `changed_fields=['skill']` only;
- every audit entry records old value blank and the approved Batch 3 value as new;
- `changed_by` is `NULL` on all six entries, consistent with prior system/admin metadata repair history.

All six audit entries share transaction timestamp `2026-09-13 13:02:38.382181+00`.

## Historical attempt preservation

2018 P1 Q11 still has exactly one historical `session_answers` row and its saved `skill` snapshot remains blank.

This preserves attempt-time evidence while future attempts can use the repaired question-level metadata.

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

The live non-null Practice response types remain limited to the known set: `fraction`, `multi_blank`, `multi_select`, `multiple_choice`, `number`, `number_unit`, and `text`.

## Outcome

Batch 3 successfully reduced the outstanding blank Practice `skill` debt from **107 to 101** without changing question exposure, marks, answers, response configuration, review state, publication state, or historical student evidence.

Across Batches 1–3, **22** high-confidence legacy `skill` rows have now been repaired, reducing the blank Practice-skill count from **123 to 101**.

Metadata V2 remains a separate track and is still blocked on independent Reviewer-B calibration in Issue #246.