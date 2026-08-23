# Deploy and Test — Maths Practice V4.3

## Release scope

V4.3 is the **Flexible Practice Assignments** release. It builds on frozen V4.2 and includes:

- V4.3A Individual Practice Assignments;
- V4.3B Multi-Student & Multi-Class Practice Assignments;
- V4.3C Teacher Dashboard Responsive & Dark Mode Polish;
- V4.3D Combined Teacher Improvements;
- final V4.3 release presentation and regression.

The established Practice/Exam security model, V4.1 mastery/mistake-recovery loop and V4.2 Teacher Action / roster tools remain in place.

## Database state

V4.3 production already contains these additive migrations:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Repository SQL files:

- `supabase/v43a_individual_practice_assignments.sql`
- `supabase/v43a_individual_practice_delete_guard.sql`
- `supabase/v43a_teacher_rpc_anon_revoke.sql`
- `supabase/v43b_multi_recipient_practice_assignments.sql`

**Do not re-run these migrations solely for the V4.3 release.**

V4.3C, V4.3D and the final Release Candidate add no SQL.

## Baselines

- V4.3D tested merge / RC base: `966851f119c440ece3bdac54a60697e662e28198`
- V4.3C tested merge: `e09dfe8fa2547ef58e3c18a247f5cecdf304fad4`
- V4.3B tested merge: `48e9f7b89b78efac6ccddf6590a398c9250c8227`
- V4.3A tested merge: `224fe11886c399de954072694c58b6d04ef66263`
- Frozen V4.2 application release: `3a9a4cb90e8b3dd0b26ed27766508e9037d3e347`
- Frozen V4.2 repository/docs baseline: `ee2cb5544744eb6ce589f3546bdb115e576b77e9`

## Before testing

- [ ] Use only the V4.3 Release Candidate Deploy Preview.
- [ ] Confirm `config.js` remains unchanged and retains the production Supabase URL/browser-safe key.
- [ ] Do not regenerate `config.js`.
- [ ] Do not re-run V4.3 migrations.
- [ ] Confirm no student PIN is stored in browser storage.
- [ ] Confirm Practice and Exam still use separate temporary access tickets.
- [ ] Confirm Exam Mode / Exam Assignments remain AI-free.

## Full V4.3 Release Candidate regression

### 1. Version / start shell

- [ ] Browser title shows `Math Practice V4.3`.
- [ ] Start badge shows `Version 4.3 • Flexible Practice Assignments`.
- [ ] Release note mentions one/selected students, multiple classes and faster teacher administration.
- [ ] Logged-out student shell remains clean.
- [ ] No Practice or Exam starts automatically while logged out.

### 2. Student sign-in / Home

Test both existing sign-in paths:

- [ ] Student ID + PIN + Enter lands on **Home** only.
- [ ] Student ID + PIN + button click lands on **Home** only.
- [ ] PIN field clears after successful sign-in.
- [ ] Refresh restores the signed-in session within its lifetime.
- [ ] Home still prioritizes in-progress/teacher assignments above optional Focus/Recommended Practice.

### 3. Individual Practice assignment

Teacher → **Classes & Assignments**:

- [ ] Select 6A (or another test class).
- [ ] Assign targeted Practice to **one student**.
- [ ] Teacher card identifies the assignment as individual and shows the correct student.
- [ ] Assigned student sees it on Home/Assignments.
- [ ] Another student in the same class does **not** see it.
- [ ] Start/complete it and confirm both student and teacher show **Completed**.

### 4. Selected-student Practice assignment

- [ ] Choose **Selected students** and select at least two active students.
- [ ] Create a short assignment.
- [ ] Teacher participation denominator matches the selected audience only.
- [ ] Every selected student sees the assignment.
- [ ] An unselected student in the same class does not see it.
- [ ] Complete as one selected student and confirm only that learner changes to Completed.

### 5. Whole-class and multi-class Practice assignments

- [ ] **Whole selected class** applies only to the currently selected class.
- [ ] Choose **Multiple classes** and select two active classes from the same year level (for example 6A + 6B).
- [ ] Creation succeeds as one teacher action.
- [ ] One class-owned assignment appears in each selected class.
- [ ] Students in each class see their own class assignment.
- [ ] Other year levels/classes are not included.
- [ ] Participation remains separate by class.

### 6. Practice completion / early-end safeguards

- [ ] Start a V4.3 targeted Practice assignment.
- [ ] Practice grading works normally.
- [ ] Practice AI Learning Help remains available.
- [ ] Complete the required target and confirm assignment completion.
- [ ] Start another assignment, answer fewer than required and **End Practice early**.
- [ ] Student and teacher both remain **In progress**, not Completed.
- [ ] Secure second/third Practice sessions still grade after ticket rotation.

### 7. Safe roster management / Quick Add

- [ ] Existing Deactivate/Reactivate and Set/Reset PIN work.
- [ ] Quick Add Student works with and without an optional valid PIN.
- [ ] Duplicate Student ID protection still works.
- [ ] Bulk Roster import still works.
- [ ] Delete is blocked for a student with learning history.
- [ ] Delete is also blocked for a student who is a current individual/selected Practice recipient even before starting.
- [ ] A truly unused temporary roster record can still be permanently deleted after confirmation.

### 8. Teacher Action Center / analytics

- [ ] Teacher Action Center loads below Analytics Overview.
- [ ] Topic support, no activity, awaiting review and incomplete-exam counts load.
- [ ] View profile / Review Queue / Exam Attempts / Class tools navigation works.
- [ ] Analytics filters continue to update the Action Center.

### 9. Exam Settings — V4.3 teacher workflow

Teacher → **Exam Settings**:

- [ ] Dark Mode cards are theme-consistent and labels readable.
- [ ] Narrow/mobile cards compact correctly and expand via **Edit settings**.
- [ ] Changed single-paper settings show **Unsaved**.
- [ ] Original per-card **Save Settings** persists correctly.
- [ ] **Manage papers faster** appears.
- [ ] Exam year / Paper / Availability filters combine correctly.
- [ ] **Select visible** and **Clear selection** work.
- [ ] Bulk Apply changes selected cards only and shows Unsaved state before save.
- [ ] **Save selected** persists the selected paper settings with one success confirmation.
- [ ] Invalid custom duration outside 1–600 is refused.
- [ ] Teacher tab strip remains usable/scrollable on narrow screens.
- [ ] Light Mode remains visually correct.

### 10. V4.1 mastery / mistake-recovery regression

- [ ] Progress shows Needs attention / Developing / Secure mastery states.
- [ ] **Practice this topic** works.
- [ ] Home Focus Area action works when no higher-priority assignment exists.
- [ ] First-try / second-try / unresolved outcomes still summarize correctly.
- [ ] **Practice what I struggled with** starts the secure follow-up set.
- [ ] Mastery Progress updates as expected.

### 11. Exam / review / AI boundaries

- [ ] Exam Mode opens and saves/resumes normally.
- [ ] Exam Assignment flow remains functional.
- [ ] Exam Mode contains no AI Learning Help.
- [ ] Exam Assignments remain AI-free.
- [ ] Existing answer-release behavior remains unchanged.
- [ ] Review Queue loads and manual review workflow works.
- [ ] Reviewed Work loads for students.
- [ ] Practice AI Help Nudge / Guide / eligible mistake explanation still work.

### 12. Teacher / question-bank smoke test

- [ ] Teacher Results loads.
- [ ] Exam Attempts loads.
- [ ] Classes & Assignments loads.
- [ ] Student Access loads.
- [ ] AI Help settings load.
- [ ] Review Queue loads.
- [ ] Question Bank loads and existing question editing remains available.
- [ ] Bulk Import area opens.
- [ ] Existing exports remain available where applicable.

### 13. Mobile / narrow viewport

- [ ] Student persistent navigation remains usable.
- [ ] Practice response controls remain usable.
- [ ] Assignment cards wrap cleanly.
- [ ] Teacher assignment recipient pickers remain usable.
- [ ] Teacher Action Center remains readable.
- [ ] Quick Add Student stays within its card.
- [ ] Exam Settings filters/bulk tools do not overflow.
- [ ] Roster destructive controls do not overlap other actions.

## Release decision

Merge/freeze V4.3 only after all critical checks above pass. Minor cosmetic observations may be recorded for a future release if they do not affect correctness, security, accessibility or task completion.

## Rollback

### V4.3 presentation/release-candidate rollback

Restore the tested V4.3D application baseline:

`966851f119c440ece3bdac54a60697e662e28198`

This removes only the final V4.3 release presentation/docs while retaining tested V4.3A–D functionality.

### Full V4.3 application rollback

If V4.3 must be rolled back to the frozen V4.2 application, restore:

`3a9a4cb90e8b3dd0b26ed27766508e9037d3e347`

V4.3 database changes are additive. **Do not drop recipient tables/functions as part of a routine application rollback.** Removing them could destroy assignment audience data or alter deletion safeguards. Any database removal must be a separate deliberate migration with backup/data-preservation planning.

Preserve the existing production `config.js` during rollback.
