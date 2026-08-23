# Deploy and Test — Maths Practice V4.2

## Release scope

V4.2 is the **Teacher Action & Practice Assignments** release. It builds on frozen V4.1 and includes:

- V4.2A Teacher Action Center;
- V4.2B Targeted Practice Assignments;
- V4.2C Roster Management & Cleanup;
- V4.2D Quick Add Student;
- V4.2E visible release presentation and final regression.

V4.2 preserves the V4.1 student mastery/mistake-recovery loop and the established Practice/Exam security boundaries.

## Database state

V4.2 uses three additive SQL files that were already applied and tested during staged development:

- `supabase/v42b_practice_assignments.sql`
- `supabase/v42b_practice_assignment_target_snapshot.sql`
- `supabase/v42c_safe_roster_student_delete.sql`

**Do not re-run these migrations solely for the V4.2 release.**

The V4.2E release slice itself added no SQL.

## Baselines

- Stable V4.2 application release merge: `3a9a4cb90e8b3dd0b26ed27766508e9037d3e347`
- V4.2D tested pre-release baseline: `3503441acc995b864942319372d2c65055d004ab`
- V4.2C tested baseline: `be79c3e08673a9c3ec8b6f03716a11516b741afd`
- V4.2B tested baseline: `1729becde3bc0d79eee34826fcf328310fad24ec`
- V4.2A tested baseline: `1ecb3f6c49461317765336b92059f4e1caee5730`
- Frozen V4.1 application baseline: `c03a294c65e46693b90e55cf12216a1b643c5902`
- Frozen V4.1 repository/docs baseline before V4.2: `2b2cbd6613f16a64c6e69905047e4b13338aa819`

## Before deployment

- [ ] Work from the V4.2 release candidate / current stable source only.
- [ ] Confirm `config.js` remains unchanged and contains the existing production Supabase URL/browser-safe key.
- [ ] Do not regenerate production `config.js`.
- [ ] Confirm the three V4.2 SQL files above are already present in production; do not re-run them unnecessarily.
- [ ] Confirm student PIN values are not stored in browser storage.
- [ ] Confirm Practice and Exam still use separate temporary access tickets.
- [ ] Confirm Exam Mode and Exam Assignments remain AI-free.
- [ ] Confirm no page-wide recursive `MutationObserver` has been introduced.

## Deploy Preview regression

### 1. Version and start shell

- [ ] Browser title shows `Math Practice V4.2` after load.
- [ ] Visible badge shows `Version 4.2 • Teacher Action & Practice Assignments`.
- [ ] Release note mentions Teacher Action Center, targeted Practice Assignments and safer roster tools.
- [ ] Logged-out student shell remains clean.
- [ ] No Practice or Exam starts automatically while logged out.

### 2. Student sign-in and Home

Test both sign-in paths:

- [ ] Student ID + PIN → press Enter in PIN field → lands on **Home** only.
- [ ] Log out → Student ID + PIN → click **Sign in to Learning Hub** → lands on **Home** only.
- [ ] PIN field is cleared after successful sign-in.
- [ ] Refresh restores the signed-in browser session within the session lifetime.
- [ ] Home still honours assignment priority before optional Focus/Recommended Practice.

### 3. Targeted Practice Assignment — teacher create

Teacher → **Classes & Assignments**:

- [ ] Select a class.
- [ ] Create a 5-question targeted Practice Assignment for a topic with enough questions.
- [ ] Optional opening/closing fields accept valid dates when used.
- [ ] Teacher card shows the expected class and topic.
- [ ] Student status initially shows **Not started**.

### 4. Targeted Practice Assignment — student complete

- [ ] Sign in as a student in the assigned class.
- [ ] Home promotes the active teacher Practice Assignment ahead of optional Focus/Recommended Practice when no in-progress Exam has higher priority.
- [ ] Assignments shows **Practice Assignments** above existing Exam assignments.
- [ ] Start the Practice Assignment.
- [ ] Questions match the assigned strand/topic.
- [ ] Practice grading works normally.
- [ ] AI Learning Help remains available in Practice.
- [ ] Complete the required set.
- [ ] Result screen confirms the teacher Practice Assignment completed.
- [ ] Student Assignments now shows **Completed**.
- [ ] Refresh teacher dashboard and confirm the same student shows **Completed**.

### 5. Targeted Practice Assignment — early end safeguard

Create or use another assignment:

- [ ] Start the targeted Practice Assignment.
- [ ] Answer fewer than the required question target.
- [ ] End Practice early.
- [ ] Confirm the assignment is **not** marked Completed.
- [ ] Student Assignments shows **In progress**.
- [ ] Teacher status also remains **In progress**.
- [ ] Resume/restart according to the existing V4.2B flow and confirm the fixed per-attempt target does not change unexpectedly.

### 6. Teacher Action Center

Teacher → **Analytics**:

- [ ] Teacher Action Center appears below Analytics Overview.
- [ ] Counts load for topic support, no activity, awaiting review and incomplete exams.
- [ ] Priority learner topic/status agrees with the existing Student Learning Profile.
- [ ] **View profile** opens the correct student.
- [ ] **Open Review Queue** works.
- [ ] **Open Exam Attempts** works.
- [ ] **Class tools** opens Classes & Assignments.
- [ ] Analytics Period/Class/Year/Activity filter changes update the Action Center.

### 7. Roster management and safe Delete

Teacher → **Classes & Assignments**:

- [ ] Existing student rows show Deactivate/Reactivate, Set/Reset PIN and Delete.
- [ ] For a student with learning history, Delete is refused and instructs the teacher to Deactivate instead.
- [ ] For an unused temporary student, Delete asks for permanent confirmation.
- [ ] Cancel leaves the student unchanged.
- [ ] Confirmed Delete removes only that unused record.
- [ ] Deactivate/Reactivate still works.
- [ ] Set/Reset PIN still works.

### 8. Quick Add Student

- [ ] **+ Add one student** appears above bulk Roster import.
- [ ] Add a temporary student without a PIN; roster shows **No PIN**.
- [ ] Set PIN afterward successfully.
- [ ] Delete the unused test record.
- [ ] Add another temporary student with a valid 4–8 digit PIN directly; roster shows **PIN set**.
- [ ] Delete the unused test record.
- [ ] Try an existing Student ID in the selected class; Quick Add refuses rather than updating/duplicating.
- [ ] If an inactive matching record exists, Quick Add tells the teacher to Reactivate it.
- [ ] An active Student ID already used by another class is blocked.
- [ ] Existing bulk Roster import still works for additions/updates.
- [ ] Quick Add layout stays inside its card on desktop and collapses cleanly on narrow/mobile widths.

### 9. V4.1 learning-loop regression

- [ ] Progress shows Mastery states: Needs attention / Developing / Secure.
- [ ] **Practice this topic** works.
- [ ] Home Focus Area action works when no assignment has higher priority.
- [ ] Complete Practice with first-try correct / second-try correct / unresolved incorrect responses.
- [ ] Learning summary counts remain correct.
- [ ] **Practice what I struggled with** starts a secure follow-up set without another PIN request.
- [ ] A second/third Practice session still grades correctly using secure ticket rotation.

### 10. Exam, Reviewed Work and AI boundaries

- [ ] Exam Mode opens and saves/resumes normally.
- [ ] Exam Assignment flow remains unchanged.
- [ ] Exam Mode contains no AI Learning Help.
- [ ] Exam Assignments remain AI-free.
- [ ] Reviewed Work loads normally.
- [ ] Answer-release behaviour remains unchanged.
- [ ] Practice AI Help Nudge / Guide / eligible mistake explanation still work.

### 11. Teacher regression

- [ ] Teacher Results loads.
- [ ] Exam Attempts loads.
- [ ] Classes & Assignments loads.
- [ ] Student Access loads.
- [ ] AI Help settings load.
- [ ] Review Queue loads.
- [ ] Existing exports still work where applicable.

### 12. Mobile / narrow viewport

- [ ] Student persistent navigation remains usable.
- [ ] Practice response controls remain usable.
- [ ] Assignment cards wrap cleanly.
- [ ] Teacher Action Center cards remain readable.
- [ ] Quick Add Student stays within its card and button does not overflow.
- [ ] Roster controls remain usable without destructive buttons overlapping other controls.

## V4.2 release result

The V4.2E Deploy Preview and full regression checklist passed before merge.

Stable V4.2 application release merge:

`3a9a4cb90e8b3dd0b26ed27766508e9037d3e347`

Validated release areas included student sign-in/Home, targeted Practice Assignment completion and early-end safeguards, Teacher Action Center, safe roster deletion, Quick Add Student, bulk roster/PIN/deactivation regression, V4.1 mastery/mistake-recovery flows, Practice AI Help, AI-free Exam boundaries, and mobile/narrow layouts.

Treat V4.2 as frozen after the documentation-only release housekeeping is merged.

## Rollback

### Release-presentation rollback

If only V4.2E presentation/docs need rollback, restore the tested V4.2D application baseline:

`3503441acc995b864942319372d2c65055d004ab`

### Full application rollback

If the V4.2 application must be rolled back to V4.1, restore the frozen V4.1 application baseline:

`c03a294c65e46693b90e55cf12216a1b643c5902`

The V4.2 database changes are additive. **Do not drop the V4.2 tables/functions as part of a routine application rollback**, because doing so could destroy targeted Practice Assignment data. An older V4.1 client can leave the additive V4.2 schema dormant. Any database removal must be a separate, deliberate migration with data preservation/backup.

Preserve the existing production `config.js` during rollback.
