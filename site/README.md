# Maths Practice V4.1

V4.1 is the **Mastery & Mistake Recovery** release for Maths Practice. It builds on the V4.0 Full Student Learning Platform and closes the student learning loop from identifying a weak area, through focused Practice and mistake recovery, to clearer Mastery Progress.

The existing secure assessment, assignment, review and AI Help boundaries remain in place.

## Student experience

V4.1 retains the V4.0 Learning Hub with persistent navigation:

- `Home`
- `Learn`
- `Assignments`
- `Progress`
- `Reviewed`

Student sign-in remains a sign-in-once browser session. The student PIN is never stored, and Practice and Exam continue to use separate temporary access tickets.

The V4.1 Home priority order is:

1. in-progress assignment;
2. active assignment ready to start;
3. Focus Area / mastery practice;
4. Recommended Practice;
5. general Learn entry.

## V4.1 learning loop

### V4.1A — Actionable Focus Areas

- `My Progress` identifies existing `Needs attention` and `Developing` topics.
- Weak-topic cards include **Practice this topic**.
- Focus Practice reuses the existing secure Practice engine and question-selection path.
- The requested set is five questions and safely shrinks when fewer matching questions exist.

### V4.1B — Mistake Recovery

Practice completion now separates:

- correct first try;
- corrected on a later try;
- still needs work.

Students can select **Practice what I struggled with** to start a short targeted follow-up set. Pending teacher-reviewed/manual responses are not treated as incorrect while awaiting review.

V4.1 also supports multiple secure Practice sessions within the signed-in browser session by rotating across purpose-specific temporary Practice tickets prepared during initial authentication. The PIN is not stored.

### V4.1C — Mastery Progress

Progress presents the existing secure server-classified learning states more clearly:

- 🔴 Needs attention
- 🟠 Developing
- 🟢 Secure

Topic percentages are labelled **current mastery** without changing the underlying calculation. Existing secure improvement milestones can also surface recent percentage improvement and point gain.

### V4.1D — Close the Learning Loop

Home now promotes a current Focus Area ahead of generic Recommended Practice when no assignment has higher priority. It prefers `Needs attention` before `Developing`, and within the same state prefers the lower current mastery percentage.

The Home action **Practice this Focus** routes through the same secure targeted-Practice path used elsewhere in the app.

## Sign-in behaviour

Both supported student sign-in paths land on **Home** only:

- pressing Enter in the PIN field;
- clicking **Sign in to Learning Hub**.

A V4.1 guard prevents the legacy Enter-key `Start Practice` shortcut from starting a Mixed Practice during authentication.

## Existing workflows preserved

- Practice Mode server-authoritative grading and existing question selection.
- Practice AI Learning Help through the existing V3.8.1 routing/security path.
- Exam Mode save/resume/exit safeguards.
- Exam Assignments.
- Assignments, Progress and Reviewed Work.
- Teacher Dashboard, results, analytics, classes, assignments, Student Access and Review Queue.
- Existing duplicate-protection behaviour.
- Existing secure Supabase RPC and RLS architecture.
- Existing answer-release rules.
- Exam Mode and Exam Assignments remain AI-free.

## Security and session boundaries

V4.1 does not move assessment authority into the browser.

Preserve these boundaries:

- student PIN is never stored;
- Practice and Exam use separate temporary access tickets;
- grading and answer-release authority remain server-side;
- Focus Areas use the existing secure learning-dashboard payload;
- Focus and recovery Practice sets reuse the existing Practice question-selection path;
- no page-wide recursive `MutationObserver` is introduced;
- AI Help remains Practice-only and is unavailable in Exam Mode and Exam Assignments.

## Database compatibility

V4.1 requires **no new SQL migration**.

Keep the existing production schema, RLS policies, helper functions and RPCs already installed for V4.0 / the V3.x platform. Do not run a Supabase SQL migration solely for V4.1.

See `NO-SQL-MIGRATION-V4.1.txt` for the release statement.

## Production baseline

The stable V4.1 application merge commit is:

`c03a294c65e46693b90e55cf12216a1b643c5902`

The tested V4.1C baseline immediately before the final V4.1D release slice is:

`ab3b7df0dde6e1e2aee6e7769566cf45b1725339`

The frozen V4.0 production/docs rollback baseline is:

`408386a068cf10e923cd0400796be87d13486143`

The original V4.0 application merge baseline is:

`c95020073c66d1a87784c669ec8091a219891dbe`

## Validation status

The V4.1 release passed the recorded Deploy Preview and regression checks before merge, including:

- V4.1A Focus Area targeted Practice;
- V4.1B learning summary and mistake-recovery Practice;
- multiple secure Practice sessions with ticket rotation;
- V4.1C Mastery Progress states and presentation;
- both sign-in paths landing on Home without automatically starting Practice;
- V4.1D Home Focus Area priority and `Practice this Focus` flow;
- Practice grading and AI Help regression;
- Assignments and Exam safeguards;
- Exam Mode and Exam Assignments remaining AI-free;
- Reviewed Work and teacher workflow regression;
- mobile/narrow viewport checks.

For future production verification, follow `DEPLOY-AND-TEST-V4.1.md`.

## Release discipline

Treat V4.1 as the frozen production baseline. New product features should begin from the current clean `main` state on a new V4.2 branch. Limit V4.1 changes to documented critical fixes and release housekeeping.

## Key V4.1 files

- `index.html` — retained main application client and established workflows.
- `v40-student-platform.js` — Learning Hub foundation plus V4.1 Focus Area and mistake-recovery presentation.
- `v40-student-nav.js` — persistent student navigation.
- `v40-student-session.js` — sign-in-once session continuity.
- `v40-learn-setup.js` — Learn Practice/Exam setup presentation.
- `v40-learning-priorities.js` — Home assignment, Focus Area, recommendation and Learn priority logic.
- `v40-start-shell.js` — logged-out / Home / Learn start-page shell behaviour.
- `v40-platform-polish.js` — platform polish and secure multi-session Practice ticket rotation.
- `v41-signin-guard.js` — prevents legacy PIN Enter handling from auto-starting Practice.
- `v41-mastery-progress.js` — Mastery Progress presentation and secure improvement-milestone reuse.
- `v40-release.js` — visible V4.1 release title, badge and release note.
- `DEPLOY-AND-TEST-V4.1.md` — V4.1 deployment and regression checklist.
- `NO-SQL-MIGRATION-V4.1.txt` — V4.1 database-change statement.
