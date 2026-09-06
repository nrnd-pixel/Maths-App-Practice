# V5.8 Stability & Classroom Smoke Checklist

Baseline: `164bbe2c380b55f974223cb7715e2bd219ee216f` — V5.8 Stable Release.

Purpose: verify the existing production workflows before any V5.8.x maintenance release. This checklist does not require new content, schema changes, grading changes, or a UI redesign.

## A. Student session and Home

- [ ] Open the production/preview app on a phone.
- [ ] Sign in with a dedicated test student using Student ID + PIN.
- [ ] Confirm the PIN field clears after successful sign-in.
- [ ] Move between Home, Learn, Assignments and Progress without being asked for the PIN again.
- [ ] Confirm Sign out ends the student session.
- [ ] Sign in again and confirm the Practice-first Home loads without console-visible or user-visible errors.

## B. Core Practice

- [ ] Start a 5-question Mixed Practice session.
- [ ] Confirm question images, units, fractions, multiple-choice/multi-select and multipart response types still render when encountered.
- [ ] Use a Hint and confirm the existing feedback/second-try behaviour remains intact.
- [ ] Complete Practice and confirm the result screen records First Try / Mastery information as expected.
- [ ] Return Home and confirm recent Practice/progress/gamification information refreshes.

## C. Topic Practice and recommendations

- [ ] Open Topic Practice and choose a known available topic.
- [ ] Complete enough marked work for the topic to appear in My Progress.
- [ ] Open the topic progress drill-down and confirm it reuses the existing mastery/evidence rather than showing a conflicting value.
- [ ] If a recommendation is present on Home, open it and confirm it uses the intended topic/strand.

## D. Past Paper Practice continuity

- [ ] Select a known Past Paper Practice paper.
- [ ] Answer at least two questions.
- [ ] Leave/end the session using the existing safe flow.
- [ ] Confirm a saved checkpoint appears.
- [ ] Resume on the same device and verify question order/progress is preserved.
- [ ] If a second test device is available, sign in there and verify the server-backed checkpoint can be resumed.
- [ ] Finish the paper/session and confirm completed progress no longer appears as an unfinished checkpoint.

## E. Teacher assignment workflow

- [ ] Teacher signs in and chooses the test class.
- [ ] Create a small Practice assignment for the test student.
- [ ] Confirm the assignment appears to the student.
- [ ] Start but do not finish the assignment; confirm teacher status shows In progress.
- [ ] Complete it; confirm teacher status changes to Completed and preserves First Try/Mastery evidence.
- [ ] Edit the target/due date and confirm it is guidance only and does not destroy existing results.

## F. Intervention loop

- [ ] In Teacher Workspace → Monitor → Action Center, confirm Priority learners load for the current Analytics scope when evidence supports it.
- [ ] Confirm each priority learner shows the existing focus topic/status from Analytics.
- [ ] Use Assign Practice for one priority learner; verify learner + topic/strand are prefilled, but no assignment is created until the teacher confirms.
- [ ] If 2+ learners in the same class share the same safely resolved focus topic, verify Shared focus groups offers a group assignment option.
- [ ] After assignment creation, return to Action Center and confirm the learner is shown as Not started/In progress rather than being offered a duplicate assignment.
- [ ] Complete the intervention as the student.
- [ ] Return to Action Center and confirm Completed Practice outcome is shown from the recorded Practice session.
- [ ] Open the learner profile and verify Practice intervention history contains the completed assignment/result.
- [ ] Verify Assign again creates only a prefilled new assignment draft and still requires teacher confirmation.
- [ ] Confirm Class intervention overview counts agree with the currently visible intervention queue.

## G. Deadline follow-up

- [ ] Create or use an assignment with a near/overdue target date.
- [ ] Confirm Deadline monitoring classifies it correctly (Overdue / Due today / Due soon / No due date).
- [ ] Use Adjust target and verify the target date can be changed or cleared.
- [ ] Confirm student access remains available after a target due date passes unless the assignment itself is explicitly closed.

## H. Teacher reports and support

- [ ] Open a Student Performance Report / Parent-Friendly Summary for the test learner.
- [ ] Confirm Practice sessions, scored responses, topic evidence, strengths/focus areas and recent Practice agree with the teacher analytics snapshot.
- [ ] Confirm the summary continues to state that it is not an official grade.
- [ ] Submit a student feedback item and confirm it appears in the teacher Feedback Inbox without exposing PIN, access token, answers or answer keys.

## I. Exam regression boundary

- [ ] Confirm Exam Mode still opens if enabled for the test account.
- [ ] Confirm Exam grading/result presentation has not been changed by any V5.8.x maintenance work.
- [ ] Confirm AI Help is not available in Exam Mode.

## J. Release gate

Before merging any V5.8.x maintenance PR:

- [ ] Diff does not contain unintended `supabase/**` changes.
- [ ] Diff does not alter grading, correct-answer authority, Practice retrieval or authentication unless that is the explicit maintenance objective.
- [ ] V5 regression safety workflow is green when GitHub Actions runners are available.
- [ ] V5.8 stable checkpoint workflow is green when GitHub Actions runners are available.
- [ ] V5.8 intervention-workflow verification is green when GitHub Actions runners are available.
- [ ] Netlify Deploy Preview is green.
- [ ] Phone smoke test sections A–F pass.
- [ ] Any teacher-side feature changed by the PR is manually checked on desktop.
- [ ] Production merge requires explicit approval after the above checks.
