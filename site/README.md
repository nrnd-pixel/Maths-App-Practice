# Maths Practice V4.6

V4.6 is the **Intervention Records** release for Maths Practice. It builds on frozen V4.5 and adds a practical export of the Teacher Action Center intervention queue for teacher records and follow-up.

## V4.6 release scope

### V4.6A — Intervention Queue Export

Teacher Action Center includes **Export queue CSV**. The export respects the current Analytics scope and intervention-queue filter: All, Needs assignment, Outstanding, or Completed.

It exports all matching priority learners, including learners beyond the visible top six when the queue is collapsed. Exported fields include learner identity, class/year, resolved focus strand/topic, current focus band/percentage/evidence, intervention status, and completed Practice outcome fields where available.

PINs and private result codes are deliberately excluded.

## Intervention workflow

The tested teacher workflow is now:

1. Analytics identifies priority learners and focus areas.
2. V4.4 can prefill individual or shared-focus targeted Practice.
3. V4.4 follow-through shows outstanding/completed matching Practice.
4. V4.5 manages priority learners as an intervention queue and exposes completed outcomes.
5. V4.6 exports that current queue as a practical intervention record.

No separate intervention database or reporting engine was introduced.

## Security and assessment boundaries

V4.6 preserves the established production boundaries:

- student PIN is never stored or exported;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- assignment visibility/start/completion remains server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- V4.6 does not create, update or delete assignments;
- V4.6 does not change mastery thresholds, matching rules or grading logic;
- V4.6 adds no database migration;
- the V4.6 export is browser-side and teacher-only.

## Database status

**V4.6 adds no database migration.** Production remains on the tested V4.3 assignment database baseline. Current migration tail:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.6 deployment.

## Frozen V4.6 baselines

- V4.6A tested merge / RC base: `68d96d518466afd8bd2e2afeb494049f077a0df9`
- Final V4.6 Release Candidate tested commit: `b111bcb2fd43238ada7d4bedb74fd7353b98869b`
- Stable V4.6 application release merge: `5260945f240fc4425d42b650e5707d0b0c1c3c6f`
- Frozen V4.5 repository/docs baseline: `ec827bd717eb6c99847124cf1906d42e6ffc1db8`

## Validation status

V4.6A passed its focused Netlify Deploy Preview test. The final V4.6 Release Candidate then passed the one-pass release regression before merge.

Validated release behaviour includes:

- queue CSV export for All / Needs assignment / Outstanding / Completed;
- Analytics-scope-aware exports;
- all matching priority learners included beyond the collapsed top-six view;
- learner, class, focus, intervention status and completed outcome fields verified;
- no PIN/private result-code export;
- existing queue filters, Show all, completed outcomes and Open Results;
- Assign Practice, Shared focus groups and Review Practice;
- selected-students Practice creation, grading, early-end safeguards, completion and Practice AI Help;
- teacher Results, Classes & Assignments, Exam Settings, Review Queue and Question Bank smoke checks;
- Exam Mode and Exam Assignments remain AI-free;
- mobile/narrow-width and Dark Mode checks.

## Key V4.6 files

- `v46-intervention-export.js` — Action Center intervention queue CSV export.
- `v40-release.js` — visible V4.6 release presentation and ordered module loader.
- `DEPLOY-AND-TEST-V4.6.md` — V4.6 release/regression record.
- `DATABASE-MIGRATIONS-V4.6.txt` — V4.6 database-change statement.

## Release discipline

Treat V4.6 as the frozen production baseline. New product features should begin from the resulting clean `main` state on a new version branch. Limit V4.6 changes to documented critical fixes and release housekeeping.

For a routine application rollback, leave the additive V4.3 assignment database objects in place unless a separate deliberate database migration with backup/data-preservation planning is approved.
