# Maths Practice V4.8

V4.8 is the **Practice Deadlines & Follow-Up** release for Maths Practice. It builds on frozen V4.7 and makes the existing Practice assignment target dates operationally useful for both teachers and students without changing Practice access rules, grading, authentication or Exam behaviour.

## V4.8 release scope

### V4.8A — Teacher Deadline Monitoring

Classes & Assignments now includes **Assignment deadline monitoring** for the currently selected class.

It summarizes active Practice assignments that still have incomplete learners using the existing `closes_at` target date:

- Overdue assignments and outstanding learners;
- Due today;
- Due within 48 hours;
- assignments without a due date;
- compact rows showing strand/topic, start and target dates, completion/outstanding counts and question target;
- **Review assignment** navigation to the existing assignment card.

Target dates remain guidance only. An overdue Practice assignment stays available to start or complete.

### V4.8B — Student Deadline Experience

The student Practice Assignments view includes **Your Practice deadlines** above the existing Practice cards.

Outstanding Practice cards can show:

- Overdue;
- Due today;
- Due soon;
- Due later;
- No due date.

The summary and deadline chips are derived from the Practice cards already loaded through the established secure assignment flow. V4.8B does not introduce a second student assignment-loading or access path.

Completed Practice does not remain in the outstanding deadline counts, while the normal completed result remains available.

### V4.8C — Practice Deadline Follow-Up

Teachers can use **Adjust target** directly from Assignment deadline monitoring.

The standalone editor can:

- set a revised Practice target due date/time;
- clear an existing due date;
- cancel without changing the assignment;
- reject a target due date that is not after an existing suggested start.

The update reuses the existing `practice_assignments.closes_at` and `updated_at` fields. It does not create a new assignment or change student access. The dialog intentionally lives outside the auto-refreshing deadline-monitor panel so the existing monitoring refresh cannot disrupt the editor.

## Deadline workflow

The tested V4.8 workflow is:

1. Teacher creates targeted Practice using the existing assignment builder and optional target date.
2. V4.8A identifies overdue, due-soon and no-due-date follow-up needs by class.
3. V4.8B shows the same deadline priority clearly to the assigned student.
4. V4.8C lets the teacher revise or clear the target date when follow-up is needed.
5. The student receives the revised target on the normal secure Practice assignment refresh/sign-in path.
6. Practice remains completable even after a target date passes.

No second scheduling engine or deadline database model was introduced.

## Security and assessment boundaries

V4.8 preserves the established production boundaries:

- student PIN is never stored or exposed by V4.8;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- assignment visibility/start/completion remains server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- V4.8 does not change grading logic, mastery thresholds or intervention matching thresholds;
- overdue target dates do not lock students out of Practice;
- V4.8A is a teacher monitoring layer;
- V4.8B is a student presentation layer around existing secure Practice cards;
- V4.8C updates only the existing target due date and timestamp fields;
- V4.8 adds no database migration.

## Database status

**V4.8 adds no database migration.** The production migration history was re-checked before the V4.8 Release Candidate and still ends at the tested V4.3 assignment baseline:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

The required target date fields already existed before V4.8. Do not run SQL solely for V4.8 deployment.

## V4.8 baselines

- Frozen V4.7 repository/docs baseline: `0b59342b828a3cbaaf23ec42744a50dc0cc0e528`
- V4.8A tested merge: `3cdc233b02c8cecf309d5226863940b66ba84007`
- V4.8B tested merge: `7a94d1778cce657e483ce4801ebdf28a9bd7f852`
- V4.8C tested merge / RC base: `09aa5e54589c7a9bf4979705465f397e29484822`
- Final tested V4.8 RC: `5547716e0ec5daea345602741ab951e95a90fafe`
- Stable V4.8 application release merge: `fb750cfed150cf1cc0be6eecfa6857435d651904`

## Validation status

V4.8A, V4.8B and V4.8C each passed focused Netlify Deploy Preview testing before merge. The final V4.8 Release Candidate then passed the one-pass release regression before merge.

Validated release behaviour includes:

- teacher deadline counts and assignment rows follow the selected class;
- overdue Practice remains startable/completable;
- student deadline summary and card urgency labels appear on the established Practice Assignments screen;
- completed Practice leaves outstanding deadline counts while normal results remain available;
- teacher Adjust target opens as a stable standalone dialog;
- revised target dates refresh teacher monitoring and existing assignment cards;
- revised dates flow to the student through the normal Practice assignment data;
- Clear due date returns the assignment to No due date;
- target-before-suggested-start validation remains enforced;
- Action Center queue filters, History, Assign again, Class intervention overview and Export queue CSV remain intact;
- normal Practice creation, grading, early-exit status, completion and AI Help remain intact;
- Results, Classes & Assignments, Exam Settings, Review Queue and Question Bank smoke checks passed;
- Exam Mode and Exam Assignments remain AI-free;
- narrow/mobile and Dark Mode checks passed.

## Key V4.8 files

- `v48-teacher-deadline-monitoring.js` — teacher deadline summary and follow-up list.
- `v48-student-deadline-experience.js` — student deadline summary and urgency labels.
- `v48-deadline-follow-up.js` — teacher target-date adjustment dialog.
- `v40-release.js` — visible V4.8 release presentation and ordered module loader.
- `DEPLOY-AND-TEST-V4.8.md` — V4.8 release/regression record.
- `DATABASE-MIGRATIONS-V4.8.txt` — V4.8 database-change statement.

## Release discipline

Treat V4.8 as the frozen production baseline. New product features should begin from the resulting clean `main` state on a new version branch. Limit V4.8 changes to documented critical fixes and release housekeeping.

For routine application rollback, leave the additive V4.3 assignment database objects in place unless a separate deliberate database migration with backup/data-preservation planning is approved. Preserve the production `config.js`.
