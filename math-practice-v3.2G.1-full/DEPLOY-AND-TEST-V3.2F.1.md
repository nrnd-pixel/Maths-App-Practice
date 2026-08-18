# V3.2F.1 deployment and testing

## DEV deployment

1. Back up the current V3.2E DEV deployment folder.
2. Run `migrate-v3.2E-to-v3.2F.1-exam-attempts.sql` in Supabase SQL Editor.
3. Confirm the verification query returns `exam_attempts`.
4. Replace only the DEV site's `index.html`. Keep the existing working `config.js` and `images/`.
5. Redeploy the same DEV site and hard-refresh it.

## Focused attempt tests

1. Start an untimed exam with a Student ID. Confirm `Saved ✓` appears.
2. Answer several response types, including a grouped part and Q29 drawing. Navigate away and return; responses and flags must remain.
3. Choose Exit Exam, then start the same paper with the same details. Confirm the attempt resumes at the saved question with the saved responses.
4. Refresh during an exam and resume. For a timed paper, confirm the original deadline continues rather than restarting.
5. Start the same paper using the same Student ID on a different browser/device. Confirm a duplicate in-progress attempt is blocked.
6. Submit normally. Confirm exactly one result, one result code and the correct Teacher Dashboard submission type.
7. Test a short duration. At expiry, confirm the current response is captured and the attempt shows `Time expired`.
8. Temporarily interrupt the connection during work. Confirm `Saved on device · sync pending`, then restore the connection and verify saving resumes.
9. Simulate a submission connection failure. Confirm the attempt remains recoverable and a retry does not create a duplicate result.
10. Open Teacher Dashboard → Exam Attempts and verify progress, last-saved time, flags and filtering.
11. Mark a test attempt incomplete and confirm that the same Student ID can then start a new attempt.

## V3.2E and V3.2D.1 regression

- Practice Mode response types, hints, second attempts and explanations.
- Q9/Q31 grouping and 40-item navigator.
- Exam settings: no timer/timed, paper availability and all three answer-release rules.
- Q29 → Review Queue → result-code feedback and final `/90` score.
- Teacher question edit, preview, duplicate, filters, active/inactive and image handling.

Keep the live pilot on its current version until this checklist passes on DEV.
