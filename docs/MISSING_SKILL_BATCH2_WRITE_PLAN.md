# Missing Skill Metadata — Batch 2 Guarded Write Plan

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **prepared plan only / NOT executed / no production write authorised by this file**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Companion records:

- `docs/MISSING_SKILL_BATCH2_PROPOSAL.md`
- Issue #250

## 1. Scope

Exactly eight `public.questions.skill` values may be changed. No other column, row, table or historical answer/event record is in scope.

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

## 2. Frozen target-state fingerprint

At the read-only planning checkpoint all eight rows had:

- blank `skill`;
- `active=true`;
- `practice_eligible=true`;
- `review_status='none'`;
- `updated_at='2026-09-01 23:25:59.580904+00'`.

The exact 8-row state fingerprint is:

`785b5d2380975b6803921ee7e192f9b38f2ac053e4abb281f4bd16611ef13ca6`

Any future write must recompute/recheck the target state immediately before mutation. If the state differs, stop and review rather than forcing an update.

## 3. Historical-attempt preservation

Six targets have no `session_answers` records.

Two targets have one historical attempt each:

- 2018 P1 Q10 — one blank `skill` snapshot;
- 2018 P1 Q16 — one blank `skill` snapshot.

Those historical snapshots must remain unchanged. The production write must update only `public.questions.skill`; it must not backfill or rewrite `session_answers.skill` or any event/history table.

## 4. Trigger and publication-risk map

The same Question Bank triggers mapped for Batch 1 apply here:

- `questions_set_updated_at` will intentionally refresh `updated_at` for each changed row;
- `questions_change_history_v51b2d` will intentionally create one audit-history row per changed question, containing only the `skill` field change;
- V5.4H practice-review safety does not fire because the update does not touch `practice_eligible` or `review_status`;
- the deferred published-exam integrity trigger runs for Past Paper updates, but current read-only checks found no available `exam_paper_settings` row for 2018 P1 or 2019 P1, so it should return without blocking this metadata-only repair.

A future post-write verification should therefore expect eight new audit rows and eight new `updated_at` timestamps, rather than treating those as unintended side effects.

## 5. Guarded transaction contract

If separately approved, execution should use a single assertion-capable transaction that:

1. locks the exact eight UUIDs;
2. asserts all eight rows exist;
3. asserts all eight still have blank `skill`;
4. asserts all eight are active, Practice-eligible and not `needs_review`;
5. asserts the expected pre-write `updated_at`/snapshot state still matches;
6. updates only `skill` using the UUID-to-value mapping above;
7. asserts exactly eight rows changed;
8. commits only if every assertion passes; otherwise rolls back.

The transaction must not broaden by year/question number alone.

## 6. Mandatory post-write verification

After an approved repair, verify all of the following before declaring success:

- exactly 8 rows now contain the intended skill values;
- total Question Bank count remains `1003` unless a separate legitimate concurrent change occurred;
- Practice-eligible count remains `655` unless a separate legitimate concurrent change occurred;
- blank Practice skills decrease by exactly 8, from `115` to `107`, assuming no concurrent legitimate changes;
- all 8 remain active, Practice-eligible and outside `needs_review`;
- answers, marks, response types/configuration, topic, source identity and question text are unchanged;
- the two historical answer snapshots remain blank;
- exactly 8 new `question_change_history` rows exist for these targets and each records only `skill`, blank → intended value;
- Practice review conflicts remain zero;
- inactive-but-Practice-eligible rows remain zero;
- structural integrity checks remain clean.

## 7. Stop conditions

Do not execute if:

- `main` has moved and repository/source assumptions need re-verification;
- Issue #250 review raises a concern;
- any target no longer matches the frozen state;
- fewer or more than eight rows satisfy the expected preconditions;
- any target already has a non-empty skill;
- any target enters `needs_review` or leaves Practice eligibility;
- 2018 P1 or 2019 P1 becomes published/available and readiness needs re-evaluation;
- an unexpected dependency would rewrite historical answer records.

## 8. Decision boundary

This file records the exact safe execution contract only.

It does **not** authorize the production write. A separate explicit instruction to proceed with Batch 2 metadata repair is required immediately before mutation.