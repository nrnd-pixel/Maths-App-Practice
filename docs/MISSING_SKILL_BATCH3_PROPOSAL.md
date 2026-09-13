# Missing Skill Metadata — Batch 3 Proposal

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **proposal only / no production metadata write authorised**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Production context after Batches 1 and 2:

- total questions: `1003`;
- Practice-eligible questions: `655`;
- blank Practice `skill` rows: `107`;
- Batches 1 and 2 successfully repaired 16 rows while preserving historical answer snapshots.

## 1. Selection rule

Batch 3 keeps the same conservative standard used for Batches 1 and 2. Every row below satisfies all of these conditions:

1. candidate confidence is High;
2. the mathematical action is fully supported by stored text/answer/response configuration;
3. no image, table or diagram is required and `image_url` is blank;
4. the exact proposed skill phrase already exists elsewhere in the live Question Bank under the same legacy `topic`;
5. the current `skill` remains blank;
6. the row is active, Practice-eligible and not `needs_review`;
7. the row is identified by immutable UUID.

Batch 3 contains **six rows only**. It is intentionally smaller than the earlier eight-row batches rather than weakening the selection rule to fill a quota.

## 2. Proposed Batch 3 — six rows

| Year / Paper / Q | Immutable question ID | Topic | Proposed skill | Stored question evidence |
|---|---|---|---|---|
| 2018 P1 Q11 | `94ec85ee-5d9e-463e-9308-f84318810543` | Powers & Roots | `Evaluate a power and square root expression` | `(√25 + 4²) / 3` |
| 2019 P1 Q5 | `346aab8e-1a40-486b-bb9f-d97a214e126e` | Fractions | `Convert a mixed number to an improper fraction` | `Express 2 5/6 as an improper fraction.` |
| 2019 P1 Q6 | `1f47f30b-fdf7-46b5-a893-37594ba23bbf` | Powers & Roots | `Evaluate a power and square root expression` | `3² − √36` |
| 2019 P1 Q10 | `59b8726a-992d-4cfe-945d-1357430813a5` | Algebra | `Simplify an algebraic expression` | `10k + 3 − 2k + 7` |
| 2019 P1 Q12 | `ffc6d2fe-5be4-422e-b1b4-874ae9de88af` | Multiplication & Division | `Divide a 4-digit number by a 1-digit number` | `Divide 2440 by 8.` |
| 2019 P1 Q15 | `cc3af513-392e-4f14-889a-2f1a159f6979` | Factors & Multiples | `Express a number as prime factors` | `Write 130 as a product of its prime factors.` |

## 3. Terminology normalization

The earlier candidate map used `Evaluate a power and square-root expression` for 2018 Q11 and 2019 Q6.

The live Question Bank already uses the established same-topic phrase:

`Evaluate a power and square root expression`

Batch 3 therefore proposes the existing live wording without the hyphen. This is terminology normalization only; the mathematical meaning is unchanged.

## 4. Source-dependency check

Read-only production verification confirmed all six rows have blank `image_url`. Their assessed mathematical action is fully contained in stored question text, answer and response configuration. No source-image interpretation is needed for this tranche.

## 5. Existing-vocabulary check

All six proposed phrases already exist under the same legacy topic in the live Question Bank. This avoids introducing new terminology.

## 6. Historical-attempt impact

Five of the six proposed rows currently have no `session_answers` records.

2018 P1 Q11 has one historical attempt with a blank saved `skill` snapshot. That snapshot is historical evidence and must remain unchanged in any future repair.

None of the six targets currently has a prior `skill` change-history row.

## 7. Frozen target state

At proposal time all six rows have:

- `skill=''`;
- `active=true`;
- `practice_eligible=true`;
- `review_status='none'`;
- `updated_at='2026-09-01 23:25:59.580904+00'`.

The deterministic Batch 3 snapshot fingerprint is:

`f45ad156d10e1a0388836a6cde57a2691d16ecad6be600f803d7a295c50c4ff1`

Any future write must re-run a fresh drift check immediately beforehand.

## 8. Publication-trigger check

Read-only production verification found neither 2018 Paper 1 nor 2019 Paper 1 currently available in `exam_paper_settings`.

Therefore the deferred published-exam integrity trigger is not expected to block a metadata-only Batch 3 update. This must still be rechecked immediately before any production write.

## 9. Future write contract — if separately approved

A future Batch 3 repair should:

1. re-verify repository and production state;
2. lock the exact six immutable UUIDs;
3. require blank `skill`, active, Practice-eligible, non-`needs_review`, and expected `updated_at`;
4. update only `questions.skill`;
5. assert exactly six rows changed;
6. preserve all historical answer/event snapshots;
7. expect exactly six new `question_change_history` entries containing only `skill` changes;
8. verify total Question Bank and Practice-eligible counts remain unchanged;
9. verify blank Practice skills decrease from 107 to 101, assuming no concurrent legitimate changes;
10. re-run the corrected Practice integrity smoke-check that treats legacy `response_type IS NULL` separately from genuinely unknown non-null response types.

## 10. Relationship to Metadata V2

Batch 3 repairs only the legacy `questions.skill` field. It does not create curriculum PRIMARY/SECONDARY mappings, demand scores, prerequisites or adaptive-readiness metadata.

Metadata V2 remains separately blocked on independent Reviewer-B calibration in Issue #246.

## 11. Decision boundary

This document is ready for review as a proposed third metadata remediation tranche.

It is **not** authorisation to mutate production Supabase. A production Batch 3 repair requires a separate explicit user instruction and a fresh pre-write verification.