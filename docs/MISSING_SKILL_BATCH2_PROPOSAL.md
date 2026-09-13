# Missing Skill Metadata — Batch 2 Proposal

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **proposal only / no production metadata write authorised**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Production context after Batch 1:

- total questions: `1003`;
- Practice-eligible questions: `655`;
- blank Practice `skill` rows: `115`;
- Batch 1 successfully repaired 8 rows and preserved historical answer snapshots.

## 1. Selection rule

Batch 2 deliberately keeps the same conservative standard used for Batch 1. Every row below satisfies all of these conditions:

1. candidate confidence is High;
2. the mathematical action is fully supported by stored text/answer/response configuration;
3. no image, table or diagram is required;
4. the exact proposed skill phrase already exists elsewhere in the live Question Bank under the same legacy `topic`;
5. the current `skill` remains blank;
6. the row is active, Practice-eligible and not `needs_review`;
7. the row is identified by immutable UUID.

Twelve remaining candidates currently satisfy that standard. Batch 2 intentionally selects only eight so the production change remains small and auditable.

## 2. Proposed Batch 2 — eight rows

| Year / Paper / Q | Immutable question ID | Topic | Proposed skill | Stored question evidence |
|---|---|---|---|---|
| 2018 P1 Q1 | `068748e8-c865-4b4a-bdac-c225466343c3` | Addition & Subtraction | `Subtract whole numbers` | `Evaluate: 483 075 − 21 597` |
| 2018 P1 Q10 | `81e098c5-6d44-491a-9617-e71e70a10567` | Fractions | `Find the number of unit fractions in a mixed number` | `How many one-thirds are there in 2 2/3?` |
| 2018 P1 Q15 | `c0f283d8-7776-40f0-99b6-dc17c1c41741` | Factors & Multiples | `Find the HCF of three numbers` | HCF of 12, 30 and 36 |
| 2018 P1 Q16 | `e3832e71-1b56-4156-8e5f-32d6ff56b7fc` | Algebra | `Simplify an algebraic expression` | `8m + 3 + 7g − 8m − 1` |
| 2018 P1 Q20 | `c810cf9b-51a9-4db4-a895-f099167f9883` | Factors & Multiples | `Express a number as prime factors` | `Express 45 as a product of prime factors.` |
| 2019 P1 Q1 | `47b30fd8-23ee-4437-934a-8ef59d01a968` | Addition & Subtraction | `Add whole numbers` | `Evaluate: 294 087 + 58 794` |
| 2019 P1 Q2 | `d8bd2c10-028e-4ca6-a742-f67685d4c867` | Addition & Subtraction | `Subtract whole numbers` | `Subtract 126 from 1302.` |
| 2019 P1 Q3(b) | `7e889aec-bd55-4aea-b98d-013f259f9c90` | Decimals | `Multiply a decimal by 100` | `1.68 × 100` |

## 3. Source-dependency check

Read-only production verification confirmed all eight rows currently have a blank `image_url`. Their mathematical action is fully contained in `question_text`, answer and response configuration. No source-image interpretation is needed for this tranche.

## 4. Existing-vocabulary check

Each proposed phrase already exists under the same legacy topic in the live Question Bank. This avoids introducing any new terminology in Batch 2.

Examples of current same-topic usage include:

- `Subtract whole numbers` — Addition & Subtraction;
- `Find the number of unit fractions in a mixed number` — Fractions;
- `Find the HCF of three numbers` — Factors & Multiples;
- `Simplify an algebraic expression` — Algebra;
- `Express a number as prime factors` — Factors & Multiples;
- `Add whole numbers` — Addition & Subtraction;
- `Multiply a decimal by 100` — Decimals.

## 5. Historical-attempt impact

Six of the eight proposed rows currently have no `session_answers` records.

Two rows have one historical attempt each:

- 2018 P1 Q10 — 1 attempt, saved `skill` snapshot blank;
- 2018 P1 Q16 — 1 attempt, saved `skill` snapshot blank.

Those historical snapshots must remain unchanged in any future repair. The question-level metadata repair would affect future attempts only.

None of the eight targets currently has a prior `skill` change-history row.

## 6. Frozen target state at proposal time

All eight rows currently have:

- `skill=''`;
- `active=true`;
- `practice_eligible=true`;
- `review_status='none'`;
- `updated_at='2026-09-01 23:25:59.580904+00'`.

Any future write must re-run a fresh drift check immediately beforehand. If any row differs, stop and review rather than forcing the update.

## 7. Deferred same-standard candidates

Four additional candidates currently meet the same strict text/vocabulary criteria but are deliberately deferred so Batch 2 remains only eight rows:

- 2019 P1 Q5 — `Convert a mixed number to an improper fraction`;
- 2019 P1 Q10 — `Simplify an algebraic expression`;
- 2019 P1 Q12 — `Divide a 4-digit number by a 1-digit number`;
- 2019 P1 Q15 — `Express a number as prime factors`.

They are natural candidates for a later Batch 3 if Batch 2 completes cleanly.

## 8. Future write contract — if separately approved

A future Batch 2 repair should follow the same guarded pattern proven by Batch 1:

1. re-verify repository and production state;
2. lock the exact eight immutable UUIDs;
3. require blank `skill`, active, Practice-eligible, non-`needs_review`, and the expected `updated_at`;
4. update only `questions.skill`;
5. assert exactly eight rows changed;
6. preserve all historical answer/event snapshots;
7. expect exactly eight new `question_change_history` entries containing only `skill` changes;
8. verify global Question Bank counts and Practice eligibility remain unchanged;
9. verify blank Practice skills decrease by exactly eight, from 115 to 107, assuming no concurrent legitimate changes;
10. re-run the Practice integrity smoke-check.

## 9. Relationship to Metadata V2

Batch 2 repairs only the legacy first-level `questions.skill` field. It does not create PRIMARY/SECONDARY curriculum mappings, demand scores, prerequisite relationships, or adaptive-readiness metadata.

Metadata V2 remains separately blocked on independent Reviewer-B calibration in Issue #246.

## 10. Decision boundary

This document is ready for review as a proposed second metadata remediation tranche.

It is **not** authorisation to mutate production Supabase. Any production Batch 2 repair requires a separate explicit user instruction and a fresh pre-write verification.