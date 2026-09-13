# Missing Skill Metadata — Batch 1 Guarded Write Plan

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **prepared plan only / NOT executed / no production write authorised by this file**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Companion records:

- `docs/MISSING_SKILL_BATCH1_PROPOSAL.md`
- `docs/MISSING_SKILL_PRECHANGE_SNAPSHOT.md`
- Issue #247

## 1. Scope

Exactly eight 2013 Paper 1 `questions.skill` values may be changed. No other column, row, table or historical answer record is in scope.

| Question | Immutable ID | New skill |
|---|---|---|
| 2013 P1 Q1 | `0ee26461-5ccc-4e31-b135-0e541e2a43dd` | `Add whole numbers` |
| 2013 P1 Q2 | `db00d1bd-b82e-4060-abe4-0c29de17672a` | `Subtract whole numbers` |
| 2013 P1 Q4(a) | `b8636d58-a3c5-4d95-af0e-35b355619c61` | `Identify prime numbers from a set` |
| 2013 P1 Q7 | `42262b8a-16fa-4a1b-8e0b-f64a1657312b` | `Divide a 4-digit number by a 1-digit number` |
| 2013 P1 Q9 | `2a912e7b-8b75-4d4e-88d0-b4dcb6eb5cc5` | `Convert an improper fraction to a mixed number` |
| 2013 P1 Q13 | `b01a157f-dcd2-40a9-8120-df4e29afa449` | `Express a number as prime factors` |
| 2013 P1 Q17 | `0796662a-9481-4520-91e7-8d9f5ecc6224` | `Evaluate powers and cube roots` |
| 2013 P1 Q18 | `ea9ed6eb-61f8-4ba3-9271-839d041b3eea` | `Simplify an algebraic expression` |

## 2. Fresh pre-write result

Read-only production verification immediately before preparing this plan found all **8/8** targets still satisfy:

- `skill=''`;
- `active=true`;
- `practice_eligible=true`;
- `review_status='none'`;
- `updated_at='2026-09-01 23:25:59.580904+00'`.

If any one of these conditions changes before execution, stop and re-review instead of forcing the update.

## 3. Historical-attempt preservation

Seven of the eight questions currently have no `session_answers` rows.

2013 P1 Q2 has two historical attempts. Both stored a blank `skill` snapshot. Those records are historical evidence and must remain unchanged.

The production change must update only `public.questions.skill`; it must not backfill or rewrite `session_answers.skill` or any other answer/event table.

## 4. Trigger and audit side effects

A read-only trigger audit confirmed the effects expected from updating `public.questions.skill`:

- `questions_set_updated_at` is a `BEFORE UPDATE` trigger and will set each changed question's `updated_at` to the current time;
- `questions_change_history_v51b2d` is an `AFTER UPDATE` trigger and will insert one Question Bank history entry for each changed row, recording `skill` in `changed_fields` with the old and new value;
- `questions_practice_review_safety_v54h` only fires on updates of `practice_eligible` or `review_status`, so a skill-only Batch 1 update does not invoke that guard;
- `questions_published_exam_integrity_v51b3` is a deferred constraint trigger on Past Paper updates, but there is no `exam_paper_settings` row for 2013 Paper 1, so its readiness assertion returns without blocking this change;
- none of these triggers writes to `session_answers` or other historical student-answer tables.

Audit baseline for the eight target UUIDs immediately before execution planning:

- each target currently has exactly **1** existing `question_change_history` row;
- each target's latest history timestamp is `2026-09-01 23:25:59.580904+00`;
- after a successful Batch 1 repair, each target should therefore have exactly **2** history rows, with the new row recording only the `skill` change.

These audit/history writes and `updated_at` refreshes are expected side effects and must not be mistaken for unintended mutation.

## 5. Guarded transaction contract

The production write, if explicitly approved, should use the following logic in a single transaction:

1. lock the eight target question rows;
2. assert that all eight UUIDs exist;
3. assert that all eight still have blank `skill`;
4. assert `active=true`, `practice_eligible=true`, and `review_status <> 'needs_review'` for all eight;
5. assert the frozen `updated_at` value still matches for all eight;
6. update only `skill` using the UUID-to-value mapping above;
7. assert exactly eight rows were updated;
8. commit only if every assertion passes; otherwise roll back.

A representative guarded SQL shape is:

```sql
begin;

create temporary table _batch1_skill_targets (
  id uuid primary key,
  new_skill text not null
) on commit drop;

insert into _batch1_skill_targets (id, new_skill) values
  ('0ee26461-5ccc-4e31-b135-0e541e2a43dd', 'Add whole numbers'),
  ('db00d1bd-b82e-4060-abe4-0c29de17672a', 'Subtract whole numbers'),
  ('b8636d58-a3c5-4d95-af0e-35b355619c61', 'Identify prime numbers from a set'),
  ('42262b8a-16fa-4a1b-8e0b-f64a1657312b', 'Divide a 4-digit number by a 1-digit number'),
  ('2a912e7b-8b75-4d4e-88d0-b4dcb6eb5cc5', 'Convert an improper fraction to a mixed number'),
  ('b01a157f-dcd2-40a9-8120-df4e29afa449', 'Express a number as prime factors'),
  ('0796662a-9481-4520-91e7-8d9f5ecc6224', 'Evaluate powers and cube roots'),
  ('ea9ed6eb-61f8-4ba3-9271-839d041b3eea', 'Simplify an algebraic expression');

-- Recheck and lock target rows before any write.
select q.id
from public.questions q
join _batch1_skill_targets t on t.id = q.id
where coalesce(q.skill, '') = ''
  and q.active is true
  and q.practice_eligible is true
  and coalesce(q.review_status, 'none') <> 'needs_review'
  and q.updated_at = timestamptz '2026-09-01 23:25:59.580904+00'
for update;

-- Execution must additionally assert that the qualifying count is exactly 8
-- before running the UPDATE.

update public.questions q
set skill = t.new_skill
from _batch1_skill_targets t
where q.id = t.id
  and coalesce(q.skill, '') = ''
  and q.active is true
  and q.practice_eligible is true
  and coalesce(q.review_status, 'none') <> 'needs_review'
  and q.updated_at = timestamptz '2026-09-01 23:25:59.580904+00';

-- Execution must assert ROW_COUNT = 8 before COMMIT.

commit;
```

The production execution should use an assertion-capable wrapper/transaction rather than blindly running the representative SQL above without checking counts.

## 6. Mandatory post-write verification

After an approved write, verify all of the following before declaring success:

- exactly 8 rows now have the intended non-empty skill values;
- no other `questions` row changed;
- all 8 remain `active=true`;
- all 8 remain `practice_eligible=true`;
- all 8 remain outside `needs_review`;
- answers, marks, response types/configs, topic, source identity and question text are unchanged;
- total Question Bank row count is unchanged;
- Practice-eligible count is unchanged;
- `session_answers` historical snapshots are unchanged, including the two blank snapshots for 2013 P1 Q2;
- exactly 8 new `question_change_history` rows were created for the target UUIDs;
- each new history row records `changed_fields = ['skill']` only and the expected old/new skill values;
- each target's `updated_at` advanced as expected from the standard update trigger;
- Question Bank integrity queries remain clean;
- the remaining blank-skill Practice count decreases by exactly 8 (from 123 to 115, assuming no concurrent legitimate changes).

## 7. Stop conditions

Do not execute the production write if:

- `main` has moved and repository/source assumptions need re-verification;
- Issue #247 review raises a concern;
- fewer or more than eight rows match the expected preconditions;
- any target has acquired a skill value already;
- any target becomes `needs_review` or leaves Practice eligibility;
- any target `updated_at` differs from the frozen value;
- an unexpected trigger or dependency would rewrite historical answer records.

## 8. Decision boundary

This file records the exact safe execution contract only.

It does **not** authorize the production write. A separate explicit instruction to proceed with Batch 1 metadata repair is still required immediately before mutation.