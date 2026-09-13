# Batch 1 Trigger / Audit Note

Read-only production inspection on 2026-09-13 confirmed the expected side effects of a future skill-only metadata repair for the eight Batch 1 target questions.

- `questions_set_updated_at` will advance `updated_at` on each changed question.
- `questions_change_history_v51b2d` will create one new audit-history row per changed question, with `skill` in `changed_fields` and the old/new values recorded.
- `questions_practice_review_safety_v54h` watches only `practice_eligible` and `review_status`, so it is not invoked by a skill-only update.
- `questions_published_exam_integrity_v51b3` applies to Past Paper updates, but 2013 Paper 1 has no `exam_paper_settings` row, so its readiness check returns without blocking this repair.
- No trigger inspected writes to `session_answers` or other historical student-answer tables.
- Each of the eight targets currently has one existing `question_change_history` row, timestamped `2026-09-01 23:25:59.580904+00`; after a successful Batch 1 repair each should have exactly two.
- Existing system-level history entries for these target questions use `changed_by = NULL`. The `changed_by` column is nullable, so an admin-level repair executed outside a signed-in teacher session is consistent with the existing audit convention.

This note does not authorize the production write.