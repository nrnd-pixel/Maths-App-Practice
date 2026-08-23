# Deploy and Test V4.0

Use this checklist for production verification, redeployment or rollback of Maths Practice V4.0.

## Stable baseline

- V4.0 production merge commit: `c95020073c66d1a87784c669ec8091a219891dbe`.
- Pre-V4.0 V3.9 regression/rollback baseline: `fa94046f9954c9d2594ec0e062bff52280d66a1c`.
- V4.0 requires no new SQL migration.
- Preserve the installed production Supabase schema, RLS policies, helper functions and RPCs.
- Preserve the production `config.js` values.

## Before deployment

1. Confirm the deployment source is the intended V4.0 commit or an approved documentation/critical-fix descendant of it.
2. Confirm `site/index.html` still identifies the client as `Math Practice V4.0`.
3. Do not run a new SQL migration for V4.0.
4. Do not replace production Supabase URL/key configuration with sample values.
5. Confirm no unintended changes were made to grading, question selection, authentication, assignment-state handling, AI provider routing or Exam Mode.
6. Use a Netlify Deploy Preview for any code change before merging to `main`.

## Production smoke test

Run the following checks against the deployed V4.0 site after release or redeployment.

### 1. Logged-out start page

- The page opens without a JavaScript/runtime error.
- The browser title shows `Math Practice V4.0`.
- The student start page focuses on Student ID and PIN sign-in.
- Teacher access remains secondary rather than dominating the student start page.

### 2. Student sign-in and session continuity

- Sign in using a valid Student ID and PIN.
- Confirm the student reaches the Learning Hub Home.
- Confirm the signed-in identity is shown and `Log out` is available.
- Refresh the page and confirm the student session restores within the same browser session.
- Confirm the PIN is not stored in browser storage.
- Log out and confirm the student returns to the logged-out sign-in view.

### 3. Persistent student navigation

After signing in, confirm the navigation contains:

- `Home`
- `Learn`
- `Assignments`
- `Progress`
- `Reviewed`

Open each tab and confirm it reaches the expected existing workflow.

### 4. Home learning priorities

- Confirm Home displays the personalised Learning Hub rather than the Practice/Exam setup form.
- If the student has an in-progress assignment, confirm it is prioritised first.
- Otherwise confirm an active assignment is prioritised before Recommended Practice.
- Confirm Recommended Practice is shown when appropriate.
- Confirm the student can still enter general Learn when no higher-priority action applies.
- Confirm available streak, weekly goal, Practice-session and teacher-message information renders without breaking Home.

### 5. Learn / Practice

- Open `Learn`.
- Confirm Practice and Exam setup are available from the dedicated Learn screen.
- Confirm `Change settings` exposes Strand, Topic, question count and Difficulty.
- Start a Practice session.
- Answer at least one automatically graded question and confirm normal feedback/grading still works.
- If AI Help is enabled for the question/session, open it and confirm the existing V3.8.1 connectivity/security behaviour still works.
- Complete or end the Practice session and confirm the result is recorded normally.

### 6. Exam Mode

- Start an Exam session using a valid Exam access flow.
- Confirm AI Help is not available in Exam Mode.
- Confirm normal question navigation and answer entry work.
- Confirm existing save/resume/exit safeguards remain active.
- Submit the Exam and confirm the result/review state renders normally.

### 7. Assignments

- Open `Assignments`.
- Confirm active assignments load.
- Resume an in-progress assignment if one exists.
- Confirm assignment state is preserved correctly after navigation or refresh.
- For an Exam Assignment, confirm AI Help remains unavailable.

### 8. Progress and Reviewed Work

- Open `Progress` and confirm student progress data loads.
- Open `Reviewed` and confirm reviewed/pending work renders as expected.
- If a teacher-reviewed drawing/manual response is available, confirm its review status and marks display correctly.

### 9. Teacher regression sample

Sign in through Teacher access and confirm the existing production workflows still open and load correctly, including:

- Results / Exam Attempts;
- Classes & Assignments;
- Student Access;
- Review Queue;
- Exam Settings;
- Question Bank / Bulk Import;
- Analytics / learning insights.

No V4.0 release verification should require a database migration.

## Security checks

- Student PIN is never stored in `localStorage` or `sessionStorage`.
- Practice and Exam use separate temporary access tickets.
- Exam Mode and Exam Assignments do not expose AI Help.
- Existing server-authoritative grading and answer-release protections remain unchanged.
- Existing deadline enforcement and assignment-state rules remain unchanged.
- No page-wide recursive `MutationObserver` has been introduced.

## Release

For a V4.0 code fix:

1. Create a dedicated branch from the current approved production baseline.
2. Make the smallest required change.
3. Open the Netlify Deploy Preview.
4. Complete the relevant smoke tests above plus any fix-specific regression test.
5. Merge only after the preview passes.

Documentation-only housekeeping may be reviewed through GitHub without redeploying the application if no deployable application file changes.

## Rollback

If a V4.0 code deployment introduces a regression:

1. Restore the last known-good V4.0 deployment when possible.
2. If a full V4.0 rollback is required, restore the pre-V4.0 V3.9 baseline at commit `fa94046f9954c9d2594ec0e062bff52280d66a1c` and redeploy.
3. Preserve production `config.js` values.
4. Do not run SQL rollback for V4.0 because V4.0 introduced no database migration.

After rollback, verify student sign-in, Practice, Exam, Assignments, results and Teacher Dashboard before reopening normal use.
