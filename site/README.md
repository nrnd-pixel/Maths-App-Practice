# Maths Practice V4.3

V4.3 is the **Flexible Practice Assignments** release for Maths Practice. It builds on the frozen V4.2 Teacher Action & Practice Assignments platform and makes targeted Practice delivery more flexible while improving day-to-day teacher administration.

The established student learning and security model remains intact:

- Home learning priorities;
- Focus Area Practice and mistake recovery;
- Mastery Progress;
- secure multi-session Practice;
- Practice-only AI Learning Help;
- Exam Mode and Exam Assignments remain AI-free;
- student PIN values are never stored.

## V4.3 release scope

### V4.3A — Individual Practice Assignments

Teachers can assign targeted Practice to either:

- the whole selected class; or
- one specific active student in that class.

Individual assignments are enforced server-side through `practice_assignment_recipients`. A student who is not a recipient cannot list, start or complete the assignment.

Existing V4.2 whole-class assignments remain compatible: an assignment with no recipient rows continues to mean the whole class.

The safe roster-delete workflow was also extended so a student with assigned individual Practice cannot be permanently deleted before starting the work.

### V4.3B — Multi-Student & Multi-Class Practice Assignments

Teachers can now assign the same targeted Practice to:

- selected students within one class; or
- multiple active classes in the same year level.

Selected-student assignments use one assignment with multiple recipient rows. Multi-class creation creates one class-owned assignment per selected class in a single validated teacher action, preserving separate participation/completion tracking for each class.

The batch teacher RPC validates all selected classes/students before creation so an invalid target cannot leave a partially-created assignment set.

### V4.3C — Teacher Dashboard Responsive & Dark Mode Polish

Teacher Dashboard presentation was improved without changing assessment logic:

- Exam Settings cards follow the active theme;
- Dark Mode labels/controls remain readable;
- teacher tabs scroll reliably on narrow screens;
- compact mobile Exam Settings cards show a short summary;
- paper settings expand/collapse on demand;
- changed controls show an Unsaved state until successful rerender.

### V4.3D — Combined Teacher Improvements

Exam Settings now includes **Manage papers faster** for routine administration:

- filter by exam year, paper and availability;
- select visible papers;
- bulk-apply duration, answer-release and availability changes;
- review unsaved changes before committing;
- save multiple selected papers through the existing teacher-authorized `exam_paper_settings` path.

Existing per-card **Save Settings** remains available.

## Practice assignment audience model

V4.3 keeps assignment ownership class-based while adding recipient restrictions:

- **Whole selected class** — no recipient rows; all eligible students in the selected class can see the assignment.
- **One / selected students** — recipient rows restrict visibility to those students only.
- **Multiple classes** — one class-owned assignment is created for each selected class.

This design preserves V4.2 compatibility and keeps class participation reporting clear.

## Security and assessment boundaries

V4.3 preserves these boundaries:

- student PIN is never stored;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- targeted assignment visibility/start/completion is server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- teacher assignment-creation RPCs require authenticated teacher access;
- anonymous clients cannot execute the V4.3 teacher-create RPCs;
- safe roster deletion blocks students with learning history or assigned work;
- no page-wide recursive `MutationObserver` is introduced.

## V4.3 database changes

V4.3 includes **four additive production migrations**, all already applied and tested during staged V4.3A/B development:

1. `supabase/v43a_individual_practice_assignments.sql`
2. `supabase/v43a_individual_practice_delete_guard.sql`
3. `supabase/v43a_teacher_rpc_anon_revoke.sql`
4. `supabase/v43b_multi_recipient_practice_assignments.sql`

Production migration records:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

V4.3C and V4.3D added no SQL.

**Do not re-run the V4.3 migrations solely for release deployment.** The frozen V4.3 release assumes the current production database already contains these tested migrations.

See `DATABASE-MIGRATIONS-V4.3.txt` for the release database statement.

## Production and tested baselines

- Stable V4.3 application release merge: `7c3520f16ca5faf7e0f62feee7e09f7f10a1bd46`
- V4.3D Combined Teacher Improvements merge: `966851f119c440ece3bdac54a60697e662e28198`
- V4.3C Teacher Dashboard Responsive & Dark Mode Polish merge: `e09dfe8fa2547ef58e3c18a247f5cecdf304fad4`
- V4.3B Multi-Student & Multi-Class Practice Assignments merge: `48e9f7b89b78efac6ccddf6590a398c9250c8227`
- V4.3A Individual Practice Assignments merge: `224fe11886c399de954072694c58b6d04ef66263`
- Frozen V4.2 application release merge: `3a9a4cb90e8b3dd0b26ed27766508e9037d3e347`
- Frozen V4.2 repository/docs baseline: `ee2cb5544744eb6ce589f3546bdb115e576b77e9`

## Validation status

V4.3A–D were individually tested in Netlify Deploy Previews before merge. The final V4.3 Release Candidate then passed the comprehensive release regression before the stable application merge.

Validated V4.3 release behaviour includes:

- V4.3 title, badge and release presentation;
- both student sign-in paths landing on Home;
- individual assignment visible only to the selected student;
- selected-student assignment visible only to selected recipients;
- completion tracking independently reflects each selected learner;
- multi-class assignment creates separate class-owned assignments;
- whole-class remains limited to the currently selected class;
- early-ended targeted Practice remains In progress;
- assigned students are protected from unsafe roster deletion;
- Teacher Action Center and roster tools remain functional;
- teacher Dark Mode / narrow-screen Exam Settings presentation;
- compact Exam Settings expand/collapse and Unsaved state;
- Exam Settings filtering, selection, bulk apply and bulk save;
- original single-paper Save Settings remains functional;
- V4.1 mastery, Focus Practice and mistake recovery remain functional;
- secure repeated Practice sessions continue to grade correctly;
- Practice AI Help remains available while Exam Mode and Exam Assignments remain AI-free;
- Review Queue, Reviewed Work, Question Bank and teacher workflow smoke checks pass;
- mobile/narrow viewport checks pass.

For future production verification, follow `DEPLOY-AND-TEST-V4.3.md`.

## Key V4.3 files

- `v43-individual-practice-assignments.js` — individual Practice assignment teacher UI.
- `v43-multi-recipient-practice-assignments.js` — selected-student and multi-class teacher UI.
- `v43-teacher-dashboard-polish.js` — Dark Mode / responsive teacher polish.
- `v43-combined-teacher-improvements.js` — Exam Settings filtering/bulk workflow.
- `v40-release.js` — visible V4.3 release presentation and ordered additive module loader.
- `supabase/v43a_individual_practice_assignments.sql` — recipient model and secure student enforcement.
- `supabase/v43a_individual_practice_delete_guard.sql` — delete protection for assigned recipients.
- `supabase/v43a_teacher_rpc_anon_revoke.sql` — explicit anonymous execute revocation.
- `supabase/v43b_multi_recipient_practice_assignments.sql` — validated teacher batch creation RPC.
- `DEPLOY-AND-TEST-V4.3.md` — V4.3 release/regression checklist.
- `DATABASE-MIGRATIONS-V4.3.txt` — V4.3 database-change statement.

## Release discipline

Treat V4.3 as the frozen production baseline. New product features should begin from the resulting clean `main` state on a new version branch. Limit V4.3 changes to documented critical fixes and release housekeeping.

For a routine application rollback, leave the additive V4.3 recipient/functions in place unless a separate deliberate database migration with backup/data-preservation planning is approved.
