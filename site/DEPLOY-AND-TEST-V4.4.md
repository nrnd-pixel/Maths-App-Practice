# Deploy and Test — Maths Practice V4.4

## Release scope

V4.4 is the **Guided Practice Interventions** release. It builds on frozen V4.3 and includes:

- V4.4A Action Center → Prefilled Practice Intervention;
- V4.4B Shared Focus Group Intervention;
- V4.4C Intervention Follow-Through;
- final V4.4 release presentation and regression.

The established Practice/Exam security model, mastery/mistake-recovery loop, V4.3 flexible assignment engine and teacher administration remain in place.

## Database state

**V4.4 adds no SQL migration.**

Production remains on the tested V4.3 assignment database baseline:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.4 deployment.

## Baselines

- V4.4C tested merge / RC base: `34a5fdcec6c604f730c2d995df958fbbdc947514`
- V4.4B tested merge: `fcca45f94294ecbed4b4513d583671e5af3be650`
- V4.4A tested merge: `9a663a2bf2c569c8d8e43e6a38f31e9617b46cc3`
- Frozen V4.3 application release: `7c3520f16ca5faf7e0f62feee7e09f7f10a1bd46`
- Frozen V4.3 repository/docs baseline: `79279dc6bd8b25362375e2be90b3c7860b1b5cc6`

## Before testing

- [ ] Use the current V4.4 Release Candidate Deploy Preview.
- [ ] Confirm `config.js` is unchanged.
- [ ] Do not run SQL.
- [ ] Confirm Exam Mode / Exam Assignments remain AI-free.

## Final V4.4 regression

### 1. Release presentation

- [ ] Browser title shows `Math Practice V4.4`.
- [ ] Start badge shows `Version 4.4 • Guided Practice Interventions`.
- [ ] Release note mentions Action Center interventions, shared-focus groups and duplicate-awareness.
- [ ] Logged-out shell remains clean.

### 2. Student sign-in / Home smoke

- [ ] Student ID + PIN + Enter lands on Home.
- [ ] Student ID + PIN + button click lands on Home.
- [ ] PIN clears after successful sign-in.
- [ ] Existing teacher assignments continue to appear ahead of optional Practice where appropriate.

### 3. V4.4A individual intervention

Teacher → Analytics → Teacher Action Center:

- [ ] Priority learner row shows **View profile** and **Assign Practice** when no outstanding matching intervention exists.
- [ ] **Assign Practice** opens the correct class.
- [ ] Audience becomes **Selected students**.
- [ ] Only the intended learner is selected.
- [ ] Focus strand/topic is prefilled where safely resolved.
- [ ] Question target defaults to 5.
- [ ] Teacher still reviews and confirms through the existing **Assign Practice** button.

### 4. V4.4B shared-focus groups

- [ ] **Shared focus groups** section loads.
- [ ] Only 2+ same-class learners with the same safely resolved focus are grouped.
- [ ] Learners from different classes are never combined in one group.
- [ ] **Assign to N** opens the correct class.
- [ ] Only grouped learners are selected.
- [ ] Shared strand/topic and 5-question target are prefilled.
- [ ] Existing V4.3 selected-students creation completes normally.

### 5. V4.4C follow-through

- [ ] Matching targeted Practice shows **Not started / In progress / Completed** as appropriate.
- [ ] Outstanding matching work shows **Review Practice** instead of encouraging an immediate duplicate.
- [ ] **Review Practice** opens the correct class and scrolls to the intended existing assignment section.
- [ ] Completed matching work remains visible while allowing another intervention if desired.
- [ ] Learners without matching work still retain the normal **Assign Practice** action.
- [ ] Analytics filter changes refresh the current intervention rows/groups.

### 6. V4.3 assignment / Practice regression

- [ ] Manual whole-class assignment still works.
- [ ] Manual selected-students assignment still works.
- [ ] Multi-class assignment still works.
- [ ] Targeted Practice starts and grades normally.
- [ ] Ending assigned Practice early remains **In progress**.
- [ ] Completing the target marks the assignment **Completed**.
- [ ] Practice AI Learning Help remains available.
- [ ] Secure repeated Practice sessions continue to work.

### 7. Teacher / roster / Exam smoke

- [ ] Teacher Action Center loads without layout errors.
- [ ] Classes & Assignments manual controls remain usable.
- [ ] Quick Add / roster deactivate-reactivate / PIN controls still work.
- [ ] Exam Settings including **Manage papers faster** still works.
- [ ] Review Queue and Reviewed Work load.
- [ ] Question Bank loads.
- [ ] Exam Mode and Exam Assignments work and remain AI-free.
- [ ] Existing answer-release behavior is unchanged.

### 8. Mobile / theme check

- [ ] Action Center buttons/status chips remain usable on narrow screens.
- [ ] Shared focus groups wrap cleanly.
- [ ] Classes & Assignments recipient controls remain usable.
- [ ] Exam Settings remains readable in Dark Mode and narrow layout.
- [ ] Student Home/Practice navigation remains usable.

## Release decision

Merge only after the final V4.4 Release Candidate regression passes.

After merge, record the stable V4.4 application release SHA and complete documentation-only freeze housekeeping.

## Rollback

### V4.4 presentation rollback

Restore the tested V4.4C application baseline:

`34a5fdcec6c604f730c2d995df958fbbdc947514`

This removes only the final V4.4 release presentation/docs while retaining tested V4.4A–C functionality.

### Full V4.4 feature rollback

If V4.4 must be rolled back to frozen V4.3, restore:

`7c3520f16ca5faf7e0f62feee7e09f7f10a1bd46`

V4.4 adds no database migration. The existing V4.3 assignment database objects should remain in place during a routine application rollback.

Preserve the production `config.js` during rollback.
