# V3.2F.2 deployment and testing

## DEV deployment

1. Back up the working V3.2F.1 DEV folder.
2. Run `migrate-v3.2F.1-to-v3.2F.2-classes-assignments.sql` in Supabase SQL Editor.
3. Confirm the query returns `class_students`, `exam_assignments` and `school_classes`.
4. Replace only `index.html` in the DEV deployment folder. Keep the working `config.js` and `images/`.
5. Redeploy and hard-refresh the same DEV site.

## Focused tests

1. Teacher Dashboard → Classes & Assignments: create a Year 6 test class.
2. Import at least three test roster lines using `Student ID, Student name`.
3. Assign PSR 2025 Paper 1 with an opening time in the past, closing time in the future and attempt limit 1.
4. Use a roster Student ID. Confirm the student instructions show the assigned class/window and the exam starts.
5. Use an unknown Student ID. Confirm access is refused without creating an attempt.
6. Change the opening time to the future, then the closing time to the past. Confirm the student receives clear not-open and closed messages.
7. Complete one attempt. Confirm another attempt is refused at limit 1.
8. Mark the test attempt incomplete, then confirm a new attempt is allowed.
9. Verify participation distinguishes Not started, In progress, Incomplete, Time expired, Awaiting review and Fully marked.
10. Export Participation CSV and verify one row per active roster student per assignment.
11. Deactivate the assignment. Confirm the paper returns to open-access behavior when no other active assignment exists for that year/paper.

## Regression

- V3.2F.1 autosave, exit/resume, refresh recovery, original deadline and retry-safe final submission.
- V3.2E timers, paper availability and all answer-release rules.
- V3.2D.1 Q9/Q31 grouping, 40-item navigator, Q29 review, result codes and final `/90` presentation.
- Practice Mode response types, hints, attempts and explanations remain unchanged.

Keep the live pilot unchanged until all DEV checks pass.
