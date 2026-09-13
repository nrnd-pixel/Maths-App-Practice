# Missing Skill Metadata — Batch 3 Guarded Write Plan

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **prepared plan only / NOT executed / no production write authorised by this file**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Companion record: `docs/MISSING_SKILL_BATCH3_PROPOSAL.md`

Issue: #251

## 1. Scope

Exactly six `questions.skill` values may be changed:

| Question | Immutable ID | New skill |
|---|---|---|
| 2018 P1 Q11 | `94ec85ee-5d9e-463e-9308-f84318810543` | `Evaluate a power and square root expression` |
| 2019 P1 Q5 | `346aab8e-1a40-486b-bb9f-d97a214e126e` | `Convert a mixed number to an improper fraction` |
| 2019 P1 Q6 | `1f47f30b-fdf7-46b5-a893-37594ba23bbf` | `Evaluate a power and square root expression` |
| 2019 P1 Q10 | `59b8726a-992d-4cfe-945d-1357430813a5` | `Simplify an algebraic expression` |
| 2019 P1 Q12 | `ffc6d2fe-5be4-422e-b1b4-874ae9de88af` | `Divide a 4-digit number by a 1-digit number` |
| 2019 P1 Q15 | `cc3af513-392e-4f14-889a-2f1a159f6979` | `Express a number as prime factors` |

No other column, question, table or historical student record is in scope.

## 2. Frozen state

At preparation time all six targets have:

- blank `skill`;
- `active=true`;
- `practice_eligible=true`;
- `review_status='none'`;
- `updated_at='2026-09-01 23:25:59.580904+00'`;
- blank `image_url`;
- zero pre-existing `skill` audit-history rows.

Deterministic target-state fingerprint:

`f45ad156d10e1a0388836a6cde57a2691d16ecad6be600f803d7a295c50c4ff1`

Any mismatch before execution is a stop condition.

## 3. Historical-attempt preservation

Five targets have no `session_answers` rows.

2018 P1 Q11 has one historical attempt whose saved skill snapshot is blank. That row must remain unchanged. The production change must update only `public.questions.skill`.

## 4. Trigger expectations

A `skill` update is expected to:

- refresh `questions.updated_at` through `questions_set_updated_at`;
- create exactly one `question_change_history` row per target, recording only `skill` from blank to the intended value.

The V5.4H review-safety trigger is not expected to fire because `practice_eligible` and `review_status` are not being changed.

At preparation time neither 2018 nor 2019 Paper 1 is available in `exam_paper_settings`, so the deferred published-exam integrity trigger is not expected to block the repair. Recheck this immediately before execution.

## 5. Guarded transaction contract

If separately authorised, execute in one transaction with assertions:

1. create an exact UUID → new-skill target set;
2. lock all six question rows;
3. assert all six UUIDs exist;
4. assert all six still have blank `skill`;
5. assert all six remain active and Practice-eligible;
6. assert none is `needs_review`;
7. assert all six still match the frozen `updated_at`;
8. assert neither 2018 nor 2019 Paper 1 has become published/available in a state that would invalidate the plan;
9. update only `questions.skill`;
10. assert exactly six rows changed;
11. commit only if every assertion passes, otherwise roll back.

Representative target mapping:

```sql
values
  ('94ec85ee-5d9e-463e-9308-f84318810543'::uuid, 'Evaluate a power and square root expression'),
  ('346aab8e-1a40-486b-bb9f-d97a214e126e'::uuid, 'Convert a mixed number to an improper fraction'),
  ('1f47f30b-fdf7-46b5-a893-37594ba23bbf'::uuid, 'Evaluate a power and square root expression'),
  ('59b8726a-992d-4cfe-945d-1357430813a5'::uuid, 'Simplify an algebraic expression'),
  ('ffc6d2fe-5be4-422e-b1b4-874ae9de88af'::uuid, 'Divide a 4-digit number by a 1-digit number'),
  ('cc3af513-392e-4f14-889a-2f1a159f6979'::uuid, 'Express a number as prime factors')
```

The execution must use assertion-capable SQL rather than a blind update.

## 6. Mandatory post-write verification

After an approved write, verify:

- exactly 6 targets contain the intended skill values;
- all 6 remain active, Practice-eligible and outside `needs_review`;
- total questions remain `1003` unless a separately legitimate concurrent change occurred;
- Practice-eligible questions remain `655` unless a separately legitimate concurrent change occurred;
- blank Practice skills decrease by exactly 6, expected `107 → 101` absent concurrent legitimate changes;
- exactly 6 new audit-history entries exist, each with `changed_fields=['skill']` and correct blank→new values;
- 2018 Q11 historical `session_answers.skill` remains blank;
- answers, marks, response configuration, topic, source identity and question text remain unchanged;
- Practice integrity counters remain clean;
- response-type verification distinguishes legacy `NULL` response types from genuinely unknown non-null values.

## 7. Decision boundary

This is an execution plan only. It does **not** authorise a production mutation.

A separate explicit instruction such as `please proceed with Batch 3 metadata repair` is required immediately before the live write.