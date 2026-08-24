# Maths Practice V4.6

V4.6 is the **Intervention Records** release for Maths Practice. It builds on frozen V4.5 and adds a practical export of the Teacher Action Center intervention queue for teacher records and follow-up.

The established student learning and security model remains intact:

- Home learning priorities;
- Focus Area Practice and mistake recovery;
- Mastery Progress;
- secure multi-session Practice;
- Practice-only AI Learning Help;
- Exam Mode and Exam Assignments remain AI-free;
- student PIN values are never stored.

## V4.6 release scope

### V4.6A — Intervention Queue Export

Teacher Action Center now includes **Export queue CSV**.

The export respects the current Analytics scope and current intervention-queue filter:

- All;
- Needs assignment;
- Outstanding;
- Completed.

It exports all matching priority learners, including learners beyond the visible top six when the queue is collapsed.

The CSV records:

- export timestamp and Analytics scope;
- queue filter and priority rank;
- learner name and Student ID;
- class and year;
- safely resolved focus strand/topic;
- current focus band, percentage and evidence counts;
- current intervention status;
- completed Practice mastery %, first-try %, question count, hints and completion time where available.

PINs and private result codes are deliberately excluded.

## V4.6 intervention workflow

The tested teacher workflow is now:

1. Analytics identifies priority learners and focus areas.
2. V4.4 can prefill individual or shared-focus targeted Practice.
3. V4.4 follow-through shows outstanding/completed matching Practice.
4. V4.5 manages priority learners as an intervention queue and exposes completed outcomes.
5. V4.6 can export that current queue as a practical intervention record.

No separate intervention database or reporting engine was introduced.

## Security and assessment boundaries

V4.6 preserves these boundaries:

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

## V4.6 database changes

**V4.6 adds no database migration.**

Production remains on the tested V4.3 assignment database baseline. Current migration tail:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.6 deployment.

See `DATABASE-MIGRATIONS-V4.6.txt` for the release database statement.

## Tested V4.6 baselines

- V4.6A Intervention Queue Export tested merge / RC base: `68d96d518466afd8bd2e2afeb494049f077a0df9`
- Frozen V4.5 stable application release: `83cac64b08649b0b4d968cfe938508edbfd97eed`
- Frozen V4.5 repository/docs baseline: `ec827bd717eb6c99847124cf1906d42e6ffc1db8`

The final V4.6 Release Candidate and stable release SHAs are recorded after the release regression passes.

## Validation status

V4.6A was tested in a Netlify Deploy Preview before merge.

Validated slice behaviour includes:

- Export queue CSV appears in Teacher Action Center;
- All / Needs assignment / Outstanding / Completed exports respect the current queue state;
- exports include all matching priority learners, including beyond the collapsed top-six UI;
- learner/class/focus/intervention fields match Action Center;
- completed outcome fields match recorded completed Practice;
- Analytics filter changes are reflected in new exports;
- no PIN or private result-code columns are exported;
- existing Assign Practice, Review Practice, Shared focus groups and Open Results remain functional;
- narrow/mobile and Dark Mode smoke checks pass.

For final release verification, follow `DEPLOY-AND-TEST-V4.6.md`.

## Key V4.6 files

- `v46-intervention-export.js` — Action Center intervention queue CSV export.
- `v40-release.js` — visible V4.6 release presentation and ordered module loader.
- `DEPLOY-AND-TEST-V4.6.md` — V4.6 release/regression checklist.
- `DATABASE-MIGRATIONS-V4.6.txt` — V4.6 database-change statement.

## Release discipline

Treat V4.5 as the production baseline until the V4.6 Release Candidate passes final regression and is merged. After release housekeeping, V4.6 becomes the frozen production baseline.

For a routine application rollback, leave the additive V4.3 assignment database objects in place unless a separate deliberate database migration with backup/data-preservation planning is approved.
