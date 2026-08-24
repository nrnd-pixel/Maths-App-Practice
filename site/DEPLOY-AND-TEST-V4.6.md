# Deploy and Test — Maths Practice V4.6

## Release scope

V4.6 is the **Intervention Records** release. It builds on frozen V4.5 and includes:

- V4.6A Intervention Queue Export;
- final V4.6 release presentation and regression.

The established V4.5 intervention queue/outcomes workflow, V4.4 guided interventions, V4.3 flexible assignment engine, secure Practice grading, mastery/mistake recovery, teacher administration and AI-free Exam boundaries remain in place.

## Database state

**V4.6 adds no SQL migration.**

Production migration history was re-checked before the RC. Current tail remains:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.6 deployment.

## Baselines

- V4.6A tested merge / RC base: `68d96d518466afd8bd2e2afeb494049f077a0df9`
- Frozen V4.5 stable application release: `83cac64b08649b0b4d968cfe938508edbfd97eed`
- Frozen V4.5 repository/docs baseline: `ec827bd717eb6c99847124cf1906d42e6ffc1db8`

## Before testing

- [ ] Use the V4.6 Release Candidate Deploy Preview.
- [ ] Confirm `config.js` is unchanged.
- [ ] Do not run SQL.
- [ ] Confirm Exam Mode / Exam Assignments remain AI-free.

## Final V4.6 regression

### 1. Release presentation

- [ ] Browser title shows `Math Practice V4.6`.
- [ ] Start badge shows `Version 4.6 • Intervention Records`.
- [ ] Release note mentions exporting the Action Center intervention queue.
- [ ] Logged-out shell remains clean.

### 2. Student sign-in / Home smoke

One normal student sign-in is sufficient because V4.6 does not modify sign-in/auth.

- [ ] Student signs in normally and lands on Home.
- [ ] Existing assignments continue to appear correctly.

### 3. V4.6A intervention queue export

Teacher → Analytics → Teacher Action Center:

- [ ] Export queue CSV appears in the intervention queue toolbar.
- [ ] All export includes all priority learners in the current Analytics scope, including beyond the visible top six.
- [ ] Learner name/ID, class/year, focus strand/topic, band/% and intervention status match Action Center.
- [ ] Completed rows include recorded mastery %, first-try %, question count, hints and completion time.
- [ ] Needs assignment export contains only that queue state.
- [ ] Outstanding export contains only Not started / In progress matching Practice.
- [ ] Completed export contains only completed matching Practice.
- [ ] Analytics filter changes are reflected in a new export.
- [ ] No PIN or private result-code column is present.

### 4. V4.5/V4.4 intervention regression

- [ ] All / Needs assignment / Outstanding / Completed queue filters still work.
- [ ] Show all / Show top 6 still works.
- [ ] Completed outcome details and Open Results still work.
- [ ] Individual Assign Practice still opens the correct learner/class/focus.
- [ ] Shared focus groups still group only appropriate same-class learners.
- [ ] Review Practice still navigates to the existing matching assignment.

### 5. V4.3 assignment / Practice smoke

- [ ] Manual selected-students assignment still creates normally.
- [ ] Targeted Practice starts and grades normally.
- [ ] Ending assigned Practice early remains In progress.
- [ ] Completing the target marks the assignment Completed.
- [ ] Practice AI Learning Help remains available.

### 6. Teacher / Exam smoke

- [ ] Results loads normally.
- [ ] Classes & Assignments controls remain usable.
- [ ] Exam Settings remains usable.
- [ ] Review Queue and Question Bank load.
- [ ] Exam Mode / Exam Assignments remain AI-free.
- [ ] Existing answer-release behavior is unchanged.

### 7. Mobile / theme

- [ ] Export button remains usable on narrow screens.
- [ ] Intervention queue/outcome controls wrap cleanly.
- [ ] Teacher dashboard remains readable in Dark Mode.
- [ ] Student Home/Practice navigation remains usable.

## Release result

Status before final RC test: **PENDING**.

After the Release Candidate passes, record:

- final tested RC commit;
- stable V4.6 application release merge;
- final frozen repository/docs commit.

## Rollback

### V4.6 presentation rollback

Restore the tested V4.6A application baseline:

`68d96d518466afd8bd2e2afeb494049f077a0df9`

This removes only the final V4.6 presentation/docs while retaining the tested queue export.

### Full V4.6 feature rollback

If V4.6 must be rolled back to frozen V4.5, restore:

`83cac64b08649b0b4d968cfe938508edbfd97eed`

V4.6 adds no database migration. Existing V4.3 assignment database objects should remain in place during routine application rollback.

Preserve production `config.js` during rollback.
