# V3.2F.3 deployment and testing

## Deploy

1. Back up the current Netlify site and Supabase database.
2. Confirm V3.2F.2.1 is working.
3. Run `migrate-v3.2F.2.1-to-v3.2F.3-student-access.sql` in Supabase SQL Editor.
4. Confirm the final query returns `open`.
5. Immediately upload the V3.2F.3 upgrade package to Netlify, preserving the working `config.js`.
6. Hard-refresh the site.

The migration changes student question delivery and submissions to access-ticket RPCs, so deploy the SQL and webpage together during a short maintenance window.

## Access checks

1. Confirm the home page initially shows **Open access** and both modes start normally.
2. In **Student Access**, choose **Registered Student ID required**.
3. Confirm a missing, unknown or inactive ID cannot start Practice or Exam Mode.
4. Confirm an active roster ID starts both modes and uses the official roster name, class and year.
5. Set a PIN for the test student and select **Student ID + PIN required**.
6. Confirm an incorrect PIN fails with a generic message and the correct PIN starts both modes.
7. Reset the PIN and confirm the old PIN stops working.
8. Switch back to **Open to everyone** and confirm independent learners can start again.

## Regression checks

- Practice Mode question types, hints, second attempts, completion, result code and manual review.
- Exam Mode paper list, navigation, flags, autosave, resume, timer warnings and safe expiry submission.
- V3.2D.1 score presentation, reviewed work and Q29 teacher feedback.
- Exam Settings availability, timers and answer-release rules.
- Classes, open-access assignments, participation summaries and CSV export.
- Teacher authentication and password reset.
