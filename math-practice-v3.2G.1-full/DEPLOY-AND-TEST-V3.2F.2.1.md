# V3.2F.2.1 deployment and testing

## Deploy

1. Back up the current Netlify site and Supabase database.
2. Confirm V3.2F.2 and its classes migration are already installed.
3. Run `migrate-v3.2F.2-to-v3.2F.2.1-open-access.sql` in Supabase SQL Editor.
4. Confirm the verification query returns `true` for `open_access_allowed` and `false` for `roster_tracking_without_id`.
5. Upload the upgrade package to Netlify, preserving the existing `config.js` values.

## Open-access checks

1. Create or activate a class assignment for a test paper.
2. Set its suggested start in the future, target due date in the past and target attempts to 1.
3. Start the paper with no Student ID. Confirm it opens normally.
4. Start with an unrecognised Student ID. Confirm it opens normally.
5. Start with a recognised roster Student ID. Confirm the instructions say participation is tracked and the attempt appears in the class summary.
6. Confirm the expired target date does not shorten the paper timer or auto-submit the exam.
7. Complete the target number of attempts and confirm another attempt is still allowed after the previous attempt is submitted or marked incomplete.
8. Pause assignment tracking. Confirm the paper stays available and new attempts are not linked to that assignment.

## Regression checks

- Practice Mode: number, fraction, number with unit, multiple choice, multi-blank and grouped questions.
- Exam Mode: navigation, flags, autosave, resume, countdown, low-time warning and safe expiry submission.
- V3.2D.1 results: `/90` total, pending manual marks, result code and Reviewed Work.
- Teacher marking: Q29 manual review, feedback and final score update.
- Exam Settings: paper availability and all answer-release rules.
- Exam Attempts: active/completed summaries and Mark Incomplete.
- Classes: roster import, participation statuses and CSV export.
