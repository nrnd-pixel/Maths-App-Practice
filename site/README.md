# Maths Practice V4.2

V4.2 is the **Teacher Action & Practice Assignments** release for Maths Practice. It builds on the frozen V4.1 Mastery & Mistake Recovery platform and adds a clearer teacher intervention workflow, targeted Practice Assignments, and safer day-to-day roster management.

The V4.1 student learning loop remains intact:

- Home priorities;
- Focus Area Practice;
- mistake recovery;
- Mastery Progress;
- secure multi-session Practice;
- Practice-only AI Learning Help;
- Exam Mode and Exam Assignments remain AI-free.

## V4.2 teacher workflow

### V4.2A — Teacher Action Center

Teacher Analytics now includes a **Teacher Action Center** that turns existing secure analytics into a practical intervention queue.

It surfaces:

- learners needing topic support;
- students with no activity in the selected analytics period;
- responses awaiting review;
- incomplete exams.

Existing teacher destinations are reused for action:

- Student Learning Profile;
- Review Queue;
- Exam Attempts;
- Classes & Assignments.

V4.2A introduced no new SQL or RPC.

### V4.2B — Targeted Practice Assignments

Teachers can create focused Practice Assignments for a class using the existing question bank.

An assignment can specify:

- class;
- strand / topic;
- requested question count;
- optional opening and closing times.

Students see active Practice Assignments in Home and Assignments and complete them through the existing secure Practice engine.

Teacher status tracking includes:

- Not started;
- In progress;
- Completed.

Completion is server-validated. The assignment attempt snapshots its actual question target when the student starts, so later changes to question-bank availability do not move the requirement mid-session.

V4.2B added the dedicated `practice_assignments` / `practice_assignment_attempts` model rather than overloading Exam Assignments.

### V4.2C — Roster Management & Cleanup

Teacher roster rows retain:

- Deactivate / Reactivate;
- Set PIN / Reset PIN;
- Delete.

Permanent Delete is intentionally restricted to unused mistaken roster records. The server blocks deletion when learning/history records exist and tells the teacher to Deactivate instead.

The deletion preflight and final delete use the same guarded RPC and recheck immediately before removal.

### V4.2D — Quick Add Student

Classes & Assignments now provides **+ Add one student** above the existing bulk Roster import.

The quick form supports:

- Student ID;
- Student name;
- optional 4–8 digit PIN.

Quick Add refuses an existing Student ID rather than silently updating it. Bulk Roster import remains the correct tool for multi-student additions or updates.

## Student experience preserved

Student navigation remains:

- `Home`
- `Learn`
- `Assignments`
- `Progress`
- `Reviewed`

Student sign-in remains a sign-in-once browser session. The student PIN is never stored, and Practice and Exam continue to use separate temporary access tickets.

The V4.2 Home priority order is:

1. in-progress Exam/Practice assignment;
2. active teacher assignment ready to start;
3. Focus Area / mastery practice;
4. Recommended Practice;
5. general Learn entry.

## Security and assessment boundaries

V4.2 preserves these boundaries:

- student PIN is never stored;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- assignment completion is server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- teacher-only roster deletion is guarded server-side;
- no page-wide recursive `MutationObserver` is introduced.

## Database changes

Unlike V4.1, V4.2 includes **three additive SQL files**, all already applied and tested during the staged V4.2 rollout:

1. `supabase/v42b_practice_assignments.sql`
2. `supabase/v42b_practice_assignment_target_snapshot.sql`
3. `supabase/v42c_safe_roster_student_delete.sql`

Do **not** re-run these solely because V4.2 is deployed. The frozen V4.2 release assumes the current production database already contains the tested V4.2B/V4.2C schema and RPC changes.

See `DATABASE-MIGRATIONS-V4.2.txt` for the release database statement.

## Production and tested baselines

- Stable V4.2 application release merge: `3a9a4cb90e8b3dd0b26ed27766508e9037d3e347`
- V4.2D tested pre-release baseline: `3503441acc995b864942319372d2c65055d004ab`
- V4.2C Roster Management & Cleanup merge: `be79c3e08673a9c3ec8b6f03716a11516b741afd`
- V4.2B Targeted Practice Assignments merge: `1729becde3bc0d79eee34826fcf328310fad24ec`
- V4.2A Teacher Action Center merge: `1ecb3f6c49461317765336b92059f4e1caee5730`
- Frozen V4.1 application release baseline: `c03a294c65e46693b90e55cf12216a1b643c5902`
- Frozen V4.1 repository/docs baseline before V4.2 work: `2b2cbd6613f16a64c6e69905047e4b13338aa819`

## Validation status

V4.2A–D were individually tested in Netlify Deploy Previews before merge. The final V4.2E release candidate then passed the full recorded regression before the stable application merge.

Validated V4.2 release behaviour includes:

- V4.2 title, badge and release presentation;
- both student sign-in paths landing on Home only;
- Teacher Action Center counts and navigation;
- targeted Practice Assignment teacher → student → completion flow;
- early-ended targeted Practice remaining In progress rather than Completed;
- safe individual roster deletion;
- protected refusal for students with learning history;
- Quick Add Student with and without PIN;
- duplicate Student ID protection;
- existing Deactivate/Reactivate and Set/Reset PIN flows;
- bulk Roster import regression;
- V4.1 Mastery Progress, Focus Practice and mistake-recovery regression;
- secure multi-session Practice grading;
- Practice AI Help regression;
- Exam Mode and Exam Assignments remaining AI-free;
- Reviewed Work and teacher workflow regression;
- mobile/narrow viewport checks, including the Quick Add Student layout.

For future production verification, follow `DEPLOY-AND-TEST-V4.2.md`.

## Key V4.2 files

- `v42-teacher-action-center.js` — Teacher Action Center.
- `v42-practice-assignments.js` — teacher/student targeted Practice Assignment UI and flow.
- `v42-roster-cleanup.js` — guarded individual roster Delete UI.
- `v42-quick-add-student.js` — single-student roster form.
- `v40-release.js` — visible V4.2 release presentation and additive module loader.
- `supabase/v42b_practice_assignments.sql` — targeted Practice Assignment tables/RPCs.
- `supabase/v42b_practice_assignment_target_snapshot.sql` — fixed per-attempt question target.
- `supabase/v42c_safe_roster_student_delete.sql` — guarded unused-roster deletion RPC.
- `DEPLOY-AND-TEST-V4.2.md` — final V4.2 release/regression checklist.
- `DATABASE-MIGRATIONS-V4.2.txt` — V4.2 database-change statement.

## Release discipline

Treat V4.2 as the frozen production baseline. New product features should begin from the current clean `main` state on a new V4.3 branch. Limit V4.2 changes to documented critical fixes and release housekeeping.

For a routine application rollback, leave the additive V4.2 database objects in place unless a separate, deliberate database migration with backup/data-preservation planning is approved.
