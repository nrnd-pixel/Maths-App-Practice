# Maths Practice V4.0

V4.0 is the Full Student Learning Platform release for Maths Practice. It builds on the secure V3.9 production baseline and reorganises the student experience into a persistent Learning Hub while preserving the existing server-authoritative assessment, assignment, review and AI Help security boundaries.

## Student experience

- Persistent student navigation: `Home`, `Learn`, `Assignments`, `Progress` and `Reviewed`.
- Clean logged-out Student ID/PIN sign-in page.
- Sign-in-once browser session with an 8-hour V4.0 cap.
- Student PIN is never stored in browser session storage.
- Separate temporary Practice and Exam access tickets are retained.
- Signed-in Home prioritises the student's most useful next step:
  1. in-progress assignment;
  2. active assignment;
  3. Recommended Practice;
  4. general Learn entry.
- Home surfaces streak, weekly goal, Practice sessions and teacher-message information.
- Learn provides dedicated Practice and Exam setup.
- Strand, Topic, question count and Difficulty remain available through `Change settings`.
- Explicit student Log out is available.

## Existing workflows preserved

- Practice Mode grading and question selection.
- Exam Mode save/resume/exit safeguards.
- Exam Assignments.
- Assignments, Progress and Reviewed Work.
- Teacher Dashboard, analytics, classes, assignments, Student Access and Review Queue.
- Existing secure Supabase RPC and RLS flows.
- V3.8.1 AI Help connectivity and provider-security behaviour.
- Exam Mode and Exam Assignments remain AI-free.

## Security and session boundaries

V4.0 does not move assessment authority into the browser. Existing secure server-side grading, answer-release, deadline and assignment-state behaviour remains in place.

The V4.0 student session stores only temporary session information required to restore the signed-in student within the same browser session. It does not store the student's PIN. Practice and Exam continue to use separate temporary access tickets.

## Database compatibility

V4.0 requires **no new SQL migration**.

Keep the existing production schema, RLS policies, helper functions and RPCs already installed for the V3.x platform. Do not run a new Supabase query solely for the V4.0 release.

See `NO-SQL-MIGRATION-V4.0.txt` for the release statement.

## Production baseline

The stable V4.0 production merge commit is:

`c95020073c66d1a87784c669ec8091a219891dbe`

V3.9 is the regression and rollback baseline immediately before V4.0. The pre-V4.0 `main` commit used by the V4.0 pull request was:

`fa94046f9954c9d2594ec0e062bff52280d66a1c`

## Validation status

The V4.0 release passed the recorded release checks before merge, including:

- V4.0A Learning Hub smoke test;
- V4.0B persistent navigation smoke test;
- sign-in-once, refresh restore and logout checks;
- Learn Practice/Exam setup checks;
- Home learning-priority checks;
- runtime regression across Home, Learn, Practice, Exam, Assignments, Progress, Reviewed Work, Motivation, Messages and AI Help;
- final start-page shell review;
- static V3.9 to V4.0 source-version audit;
- Netlify Deploy Preview validation.

For future production verification, follow `DEPLOY-AND-TEST-V4.0.md`.

## Release discipline

Treat V4.0 as a frozen production baseline. New product features should be developed on a new version branch (for example V4.1) rather than added directly to the V4.0 baseline. Limit V4.0 changes to documented critical fixes and release housekeeping.

## Key V4.0 files

- `index.html` — main V4.0 client and retained application workflows.
- `v40-student-platform.js` — V4.0 student Learning Hub foundation.
- `v40-student-nav.js` — persistent student navigation.
- `v40-student-session.js` — sign-in-once session continuity.
- `v40-learn-setup.js` — Learn Practice/Exam setup presentation.
- `v40-learning-priorities.js` — personalised Home priorities.
- `v40-start-shell.js` — logged-out / Home / Learn start-page shell behaviour.
- `v40-platform-polish.js` — final platform and mobile presentation polish.
- `v40-release.js` — V4.0 release presentation housekeeping.
- `DEPLOY-AND-TEST-V4.0.md` — production deployment and smoke-test checklist.
- `NO-SQL-MIGRATION-V4.0.txt` — V4.0 database-change statement.
