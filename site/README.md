# Maths Practice V4.7

V4.7 is the **Intervention History & Follow-Up** release for Maths Practice. It builds on frozen V4.6 and extends the Teacher Action Center from a current intervention queue into a longitudinal follow-up workflow for individual learners and classes.

## V4.7 release scope

### V4.7A — Learner Intervention History

Registered learners now have a **History** action in Teacher Action Center. The learner Analytics profile includes **Practice intervention history**, showing targeted Practice assignments that applied to that learner across time.

History can show:

- strand/topic;
- assignment date;
- question target;
- audience type;
- Not started / In progress / Completed / Inactive status;
- start/completion dates where available;
- recorded mastery %, first-try %, question count and hints for completed Practice.

History is intentionally not restricted by the current Analytics period filter, so older intervention records remain visible when reviewing a learner.

### V4.7B — Follow-Up From History

Completed intervention-history entries include **Assign again**. This opens the existing Classes & Assignments builder for the same learner and prefills the historical strand/topic and question target where those options are still available.

The teacher must still review the setup and click the established **Assign Practice** button. V4.7B does not auto-create assignments and does not introduce a second assignment path.

Outstanding history entries continue to use **Review Practice**. Completed entries continue to support **Open Results**.

### V4.7C — Class Intervention Overview

Teacher Action Center includes **Class intervention overview** for the current Analytics scope. It summarizes:

- total priority learners;
- Needs assignment / Outstanding / Completed counts;
- per-class priority and intervention-state counts;
- each class's leading current focus topic;
- common priority focus topics across the current Analytics scope.

The overview reuses the already-rendered V4.5 intervention queue state. It does not create a separate intervention status model or change intervention thresholds.

## Intervention workflow

The tested teacher workflow is now:

1. Analytics identifies priority learners and focus areas.
2. V4.4 can prefill individual or shared-focus targeted Practice.
3. V4.4/V4.5 show matching Practice status and completed outcomes.
4. V4.5 manages priority learners as an intervention queue.
5. V4.6 exports the current queue as a teacher intervention record.
6. V4.7A provides longitudinal learner intervention history.
7. V4.7B allows deliberate follow-up Practice from a completed intervention.
8. V4.7C summarizes intervention need and focus at class level.

No separate intervention database or reporting engine was introduced.

## Security and assessment boundaries

V4.7 preserves the established production boundaries:

- student PIN is never stored or exposed by V4.7;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- assignment visibility/start/completion remains server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- V4.7 does not change grading logic, mastery thresholds or intervention matching thresholds;
- V4.7 adds no database migration;
- V4.7A and V4.7C are teacher-side read-only workflow layers;
- V4.7B reuses the established assignment builder and does not auto-create assignments.

## Database status

**V4.7 adds no database migration.** Production migration history was re-checked before the V4.7 Release Candidate and still ends at the tested V4.3 assignment baseline:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.7 deployment.

## Frozen V4.7 baselines

- Frozen V4.6 repository/docs baseline: `b1f38a842b3d1762de403673f43ea78d8d1d51fa`
- V4.7A tested merge: `1ac29709aaf0a4e29418ebf086f8f1a8b3860ecf`
- V4.7B tested merge: `f7f6723db6cea1a20fc6618a5009ad745ea66c1b`
- V4.7C tested merge / RC base: `2d13e9e6b80776fdfc9655779bb64d9a7f3da4e4`
- Final V4.7 Release Candidate tested commit: `ebed7de47a9633ccd72aac1e0dd9988764e596fb`
- Stable V4.7 application release merge: `d62fb0892c69fda69cb76520ad90339fbbb65df2`

## Validation status

V4.7A, V4.7B and V4.7C each passed focused Netlify Deploy Preview testing before merge. The final V4.7 Release Candidate then passed the one-pass release regression before merge.

Validated release behaviour includes:

- History opens the correct learner profile and longitudinal Practice history;
- older intervention history remains visible outside the current Analytics period filter;
- completed history outcomes match existing Practice results;
- Open Results and Review Practice reach the intended record/assignment;
- Assign again preselects the intended learner and historical Practice setup while still requiring normal teacher confirmation;
- a newly created follow-up assignment remains separate from the original completed history entry;
- class intervention counts match the existing queue state;
- leading/common focus topics follow the current Analytics scope;
- class overview is not limited by queue visibility filters or the collapsed top-six view;
- existing queue filters, Export queue CSV and guided intervention actions remain intact;
- selected-students Practice creation, grading, early-end safeguards, completion and Practice AI Help remain intact;
- Results, Classes & Assignments, Exam Settings, Review Queue and Question Bank smoke checks passed;
- Exam Mode and Exam Assignments remain AI-free;
- narrow/mobile and Dark Mode checks passed.

## Key V4.7 files

- `v47-intervention-history.js` — longitudinal learner Practice intervention history.
- `v47-follow-up-from-history.js` — deliberate Assign again workflow using the existing assignment builder.
- `v47-class-intervention-overview.js` — class-level priority/intervention summary.
- `v40-release.js` — visible V4.7 release presentation and ordered module loader.
- `DEPLOY-AND-TEST-V4.7.md` — V4.7 release/regression record.
- `DATABASE-MIGRATIONS-V4.7.txt` — V4.7 database-change statement.

## Release discipline

Treat V4.7 as the frozen production baseline. New product features should begin from the resulting clean `main` state on a new version branch. Limit V4.7 changes to documented critical fixes and release housekeeping.

For routine application rollback, leave the additive V4.3 assignment database objects in place unless a separate deliberate database migration with backup/data-preservation planning is approved. Preserve the production `config.js`.
