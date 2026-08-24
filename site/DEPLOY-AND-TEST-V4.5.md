# Deploy and Test — Maths Practice V4.5

## Release scope

V4.5 is the **Intervention Queue & Outcomes** release. It builds on frozen V4.4 and includes:

- V4.5A Intervention Queue Filters & Show All;
- V4.5B Completed Intervention Outcomes;
- final V4.5 release presentation and regression.

The established V4.4 guided-intervention workflow, V4.3 flexible assignment engine, secure Practice grading, mastery/mistake recovery, teacher administration and AI-free Exam boundaries remain in place.

## Database state

**V4.5 adds no SQL migration.**

Production migration history was re-checked before the RC. The migration tail remains:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.5 deployment.

## Baselines

- V4.5B tested merge / RC base: `8eb300875295f4af7a9245083b5a6a9b77d605c8`
- V4.5A tested merge: `0ca7a369a5f65eb594c1125b780f777cb9742fa9`
- Frozen V4.4 stable application release: `3a41e5b4634151a4a9da0684428c46c76d1e475a`
- Frozen V4.4 repository/docs baseline: `beb7bec2f9a57c627593e64e3c190e6f6452c2be`

## Before testing

- [ ] Use the V4.5 Release Candidate Deploy Preview.
- [ ] Confirm `config.js` is unchanged.
- [ ] Do not run SQL.
- [ ] Confirm Exam Mode / Exam Assignments remain AI-free.

## Final V4.5 regression

### 1. Release presentation

- [ ] Browser title shows `Math Practice V4.5`.
- [ ] Start badge shows `Version 4.5 • Intervention Queue & Outcomes`.
- [ ] Release note mentions intervention queue management and recorded completed outcomes.
- [ ] Logged-out shell remains clean.

### 2. Student sign-in / Home smoke

One normal student sign-in is sufficient because V4.5 does not modify sign-in/auth.

- [ ] Student signs in normally and lands on Home.
- [ ] PIN clears after successful sign-in.
- [ ] Existing assignments continue to appear correctly.

### 3. V4.5A intervention queue

Teacher → Analytics → Teacher Action Center:

- [ ] Queue toolbar appears above Priority learners.
- [ ] All / Needs assignment / Outstanding / Completed counts are present.
- [ ] Default view remains compact.
- [ ] Show all exposes the remaining priority learners when more than six exist.
- [ ] Needs assignment shows learners without matching Practice.
- [ ] Outstanding shows Not started / In progress matching Practice.
- [ ] Completed shows learners with completed matching Practice.
- [ ] Returning to All / Show top 6 works.
- [ ] Analytics filter changes refresh counts and rows.

### 4. V4.5B completed outcomes

- [ ] Completed matching Practice shows recorded mastery %.
- [ ] First-try %, question count, hints used and completion time are shown.
- [ ] No “improved/not improved” judgement is displayed.
- [ ] Open Results stays within Teacher Dashboard.
- [ ] Results filters to the intended learner/session and scrolls/highlights the matching result.

### 5. V4.4 intervention regression

- [ ] Individual Assign Practice still opens the correct class/learner and prefilled focus.
- [ ] Shared focus groups still combine only appropriate same-class learners.
- [ ] Review Practice still navigates to the existing matching assignment.
- [ ] Outstanding matching work does not encourage an immediate duplicate.

### 6. V4.3 assignment / Practice regression

- [ ] Manual selected-students assignment still creates normally.
- [ ] Targeted Practice starts and grades normally.
- [ ] Ending assigned Practice early remains In progress.
- [ ] Completing the target marks the assignment Completed.
- [ ] Practice AI Learning Help remains available.
- [ ] Secure repeated Practice remains functional.

### 7. Teacher / Exam smoke

- [ ] Teacher Action Center and Analytics load normally.
- [ ] Results loads normally.
- [ ] Classes & Assignments controls remain usable.
- [ ] Exam Settings including Manage papers faster remains usable.
- [ ] Review Queue and Question Bank load.
- [ ] Exam Mode / Exam Assignments remain AI-free.
- [ ] Existing answer-release behavior is unchanged.

### 8. Mobile / theme

- [ ] Intervention queue controls remain usable on narrow screens.
- [ ] Outcome details/buttons wrap cleanly.
- [ ] Teacher dashboard remains readable in Dark Mode.
- [ ] Student Home/Practice navigation remains usable.

## Release result

Status before final RC test: **PENDING**.

After the Release Candidate passes, record:

- final tested RC commit;
- stable V4.5 application release merge;
- final frozen repository/docs commit.

## Rollback

### V4.5 presentation rollback

Restore the tested V4.5B application baseline:

`8eb300875295f4af7a9245083b5a6a9b77d605c8`

This removes only the final V4.5 release presentation/docs while retaining tested V4.5A/B functionality.

### Full V4.5 feature rollback

If V4.5 must be rolled back to frozen V4.4, restore the stable V4.4 application release:

`3a41e5b4634151a4a9da0684428c46c76d1e475a`

V4.5 adds no database migration. The existing V4.3 assignment database objects should remain in place during a routine application rollback.

Preserve the production `config.js` during rollback.
