# Maths Practice V3.2F.2 — Classes, Assignments & Participation

V3.2F.2 builds on recoverable V3.2F.1 attempts. Practice Mode, result codes, manual review, timers, answer-release settings and existing unassigned exams remain backward compatible.

## Teacher workflow

1. Create a class with a name and year level.
2. Import or update its roster using `Student ID, Student name` lines.
3. Assign an existing exam year/paper combination.
4. Optionally set opening and closing times and an attempt limit.
5. Monitor each assigned student as Not started, In progress, Incomplete, Time expired, Awaiting review or Fully marked.
6. Export the participation table to CSV.

Teachers may deactivate roster members or assignments without deleting historical attempts. An abandoned attempt can still be marked incomplete from Exam Attempts.

## Student access

- Papers without active assignments retain the existing open-access behavior.
- Once a paper has an active assignment, a matching active roster Student ID is required.
- Opening/closing windows and attempt limits are checked by Supabase, not only by the browser.
- The student instructions show assignment availability, class, schedule and attempts used.
- A closing time becomes a hard attempt deadline. If the page is open, saved work is submitted safely when that deadline arrives.

Run `migrate-v3.2F.1-to-v3.2F.2-classes-assignments.sql` before deploying the V3.2F.2 `index.html`.
