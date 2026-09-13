# Missing Skill Metadata — Batch 1 Proposal

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **proposal only / no production metadata write authorised**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Companion records:

- `docs/MISSING_SKILL_REMEDIATION_MAP.md`
- `docs/MISSING_SKILL_PRECHANGE_SNAPSHOT.md`
- `docs/MISSING_SKILL_SOURCE_IMAGE_REVIEW.md`

## 1. Purpose

Define the smallest defensible first remediation tranche for the 123 Practice-eligible questions whose legacy `questions.skill` value is blank.

Batch 1 deliberately includes only questions that satisfy **all** of these conditions:

1. candidate confidence is High;
2. the mathematical action is fully supported by stored text/answer/configuration and does not depend on a diagram/table/image;
3. the exact proposed skill phrase already exists elsewhere in the live Question Bank;
4. that phrase is already used under the same legacy `topic`;
5. the target row is still active, Practice-eligible, not `needs_review`, and has a blank current `skill`;
6. the target row is identified by immutable question UUID, not by year/question number alone.

This is intentionally much smaller than the full 123-row candidate map.

## 2. Proposed Batch 1 — eight rows

| Year / Paper / Q | Immutable question ID | Topic | Proposed skill | Evidence from stored question |
|---|---|---|---|---|
| 2013 P1 Q1 | `0ee26461-5ccc-4e31-b135-0e541e2a43dd` | Addition & Subtraction | `Add whole numbers` | `Evaluate: 1 872 + 141` |
| 2013 P1 Q2 | `db00d1bd-b82e-4060-abe4-0c29de17672a` | Addition & Subtraction | `Subtract whole numbers` | `Evaluate: 8 304 − 4 281` |
| 2013 P1 Q4(a) | `b8636d58-a3c5-4d95-af0e-35b355619c61` | Factors & Multiples | `Identify prime numbers from a set` | choose the primes from 21, 23, 24, 25, 27, 29 |
| 2013 P1 Q7 | `42262b8a-16fa-4a1b-8e0b-f64a1657312b` | Multiplication & Division | `Divide a 4-digit number by a 1-digit number` | `7 104 ÷ 4` |
| 2013 P1 Q9 | `2a912e7b-8b75-4d4e-88d0-b4dcb6eb5cc5` | Fractions | `Convert an improper fraction to a mixed number` | `Express 17/4 as a mixed number.` |
| 2013 P1 Q13 | `b01a157f-dcd2-40a9-8120-df4e29afa449` | Factors & Multiples | `Express a number as prime factors` | `Express 54 as a product of its prime factors.` |
| 2013 P1 Q17 | `0796662a-9481-4520-91e7-8d9f5ecc6224` | Powers & Roots | `Evaluate powers and cube roots` | `6² − ∛125` |
| 2013 P1 Q18 | `ea9ed6eb-61f8-4ba3-9271-839d041b3eea` | Algebra | `Simplify an algebraic expression` | `7d − 3e + 8 − 2d + 5e` |

## 3. Existing-vocabulary check

Read-only production checks confirmed each proposed phrase already exists elsewhere in the Question Bank under the same topic:

- `Add whole numbers` — existing under Addition & Subtraction;
- `Subtract whole numbers` — existing under Addition & Subtraction;
- `Identify prime numbers from a set` — existing under Factors & Multiples;
- `Divide a 4-digit number by a 1-digit number` — existing under Multiplication & Division;
- `Convert an improper fraction to a mixed number` — existing under Fractions;
- `Express a number as prime factors` — existing under Factors & Multiples;
- `Evaluate powers and cube roots` — existing under Powers & Roots;
- `Simplify an algebraic expression` — existing under Algebra.

This avoids introducing new vocabulary in the first remediation tranche.

## 4. Frozen target-state snapshot

At the read-only preparation checkpoint, all eight rows had:

- `skill=''`;
- `active=true`;
- `practice_eligible=true`;
- `review_status='none'`;
- `updated_at='2026-09-01 23:25:59.580904+00'`.

The complete 123-row snapshot fingerprint is recorded in `MISSING_SKILL_PRECHANGE_SNAPSHOT.md` as:

`74d32f47e7c9ef1f9d57b5fe5a54a158772bcaa011c204bfac2c70cf6e448ed2`

Any future write must re-run the snapshot/drift check first. If any target row has changed, stop and review rather than forcing the update.

## 5. Future write contract — if separately approved

A future Batch 1 metadata change should:

1. re-verify exact production state immediately before writing;
2. address rows by the immutable UUIDs above;
3. require current `skill` to remain blank;
4. require no unresolved `needs_review` state;
5. update **only** the `skill` column;
6. never change `active`, `practice_eligible`, answers, marks, response configuration, source attribution, hints/explanations or review state;
7. fail rather than silently broadening to additional rows;
8. verify exactly eight rows changed;
9. re-run Question Bank integrity checks after the change;
10. confirm student Practice availability and total question counts are unchanged.

## 6. Deliberately excluded from Batch 1

The following categories stay out even when their candidate is currently High:

- labels that would introduce a new phrase not already used in the bank;
- labels reused only under a different topic until terminology policy is reviewed;
- any image/table/diagram-dependent question;
- any Medium-confidence candidate;
- any row whose state drifts from the frozen snapshot.

Examples deliberately deferred include 2013 Q3(a), Q6(a), Q6(b) and Q15 because their proposed phrases are established but not under the exact same current topic, and all source-dependent questions remain in the separate visual review queue.

## 7. Relationship to Metadata V2

Batch 1 repairs only the legacy human-readable `questions.skill` field. It does not add curriculum PRIMARY/SECONDARY mappings, demand scores, prerequisite relationships or adaptive eligibility.

Metadata V2 remains blocked on independent Reviewer-B calibration in Issue #246.

## 8. Current decision boundary

This document is ready for review as a proposed first metadata remediation tranche.

It is **not** approval to write the eight values to production. Production metadata mutation should occur only after an explicit user instruction and a fresh pre-write verification.