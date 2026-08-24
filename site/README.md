# Maths Practice V4.5

V4.5 is the **Intervention Queue & Outcomes** release for Maths Practice. It builds on frozen V4.4 and improves teacher follow-through after Action Center identifies learners who need support.

The established student learning and security model remains intact:

- Home learning priorities;
- Focus Area Practice and mistake recovery;
- Mastery Progress;
- secure multi-session Practice;
- Practice-only AI Learning Help;
- Exam Mode and Exam Assignments remain AI-free;
- student PIN values are never stored.

## V4.5 release scope

### V4.5A — Intervention Queue Filters & Show All

Teacher Action Center can now be used as a practical intervention queue. Priority learners can be filtered by:

- **All**;
- **Needs assignment**;
- **Outstanding** — matching Practice is Not started or In progress;
- **Completed**.

The normal top-priority view remains compact, while **Show all** exposes the rest of the current priority learners with the existing V4.4 View profile / Assign Practice / Review Practice actions.

V4.5A reuses the intervention state already calculated by V4.4. It does not introduce a new matching rule, mastery threshold or grading rule.

### V4.5B — Completed Intervention Outcomes

Completed matching targeted Practice now shows the recorded assignment outcome directly in Teacher Action Center, including:

- mastery percentage;
- first-try percentage;
- question count;
- hints used;
- completion time.

**Open Results** stays inside Teacher Dashboard, opens the existing Results tab, filters to the intended learner and highlights the matching completed Practice session.

V4.5B deliberately shows recorded evidence only. It does not label a learner as “improved” or “not improved” and does not alter mastery calculations.

## V4.5 intervention workflow

The tested teacher workflow is now:

1. Analytics identifies current priority learners and focus areas.
2. V4.4 can prefill individual or shared-focus targeted Practice.
3. V4.4 follow-through shows whether matching Practice is outstanding or completed.
4. V4.5A lets the teacher manage those learners as a status-filtered intervention queue.
5. V4.5B surfaces the recorded result of completed assigned Practice and links back to the existing Results view.

No separate intervention database or assessment engine was introduced.

## Security and assessment boundaries

V4.5 preserves these boundaries:

- student PIN is never stored;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- assignment visibility/start/completion remains server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- V4.5 does not auto-create assignments;
- V4.5 does not change mastery thresholds or grading logic;
- V4.5 adds no database migration;
- no page-wide recursive `MutationObserver` is introduced.

## V4.5 database changes

**V4.5 adds no database migration.**

Production remains on the tested V4.3 assignment database baseline. The current migration tail is:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for the V4.5 release.

See `DATABASE-MIGRATIONS-V4.5.txt` for the release database statement.

## Tested V4.5 baselines

- Stable V4.5 application release merge: `83cac64b08649b0b4d968cfe938508edbfd97eed`
- Final V4.5 Release Candidate tested commit: `1447200c41a01f97a8c5c9e40a6554e21b928866`
- V4.5B Completed Intervention Outcomes tested merge / RC base: `8eb300875295f4af7a9245083b5a6a9b77d605c8`
- V4.5A Intervention Queue Filters & Show All tested merge: `0ca7a369a5f65eb594c1125b780f777cb9742fa9`
- Frozen V4.4 stable application release: `3a41e5b4634151a4a9da0684428c46c76d1e475a`
- Frozen V4.4 repository/docs baseline: `beb7bec2f9a57c627593e64e3c190e6f6452c2be`

## Validation status

V4.5A and V4.5B were individually tested in Netlify Deploy Previews before merge. The final V4.5 Release Candidate then passed the one-pass release regression before the stable application merge.

Validated V4.5 release behaviour includes:

- intervention queue counts and All / Needs assignment / Outstanding / Completed filters;
- Show all / Show top-priority behaviour;
- queue refresh after Analytics filter changes;
- completed intervention outcome details;
- Open Results navigation to the intended learner/session;
- existing V4.4 Assign Practice, Review Practice and Shared focus groups;
- selected-students Practice creation, grading, early-end safeguards and completion;
- Practice AI Learning Help and secure repeated Practice;
- teacher Results, Classes & Assignments, Exam Settings, Review Queue and Question Bank smoke checks;
- Exam Mode and Exam Assignments remain AI-free;
- narrow/mobile and Dark Mode checks.

For future production verification, follow `DEPLOY-AND-TEST-V4.5.md`.

## Key V4.5 files

- `v45-intervention-queue.js` — priority learner intervention queue filters and Show all workflow.
- `v45-intervention-outcomes.js` — recorded completed Practice outcomes and Open Results workflow.
- `v40-release.js` — visible V4.5 release presentation and ordered module loader.
- `DEPLOY-AND-TEST-V4.5.md` — V4.5 release/regression checklist.
- `DATABASE-MIGRATIONS-V4.5.txt` — V4.5 database-change statement.

## Release discipline

Treat V4.5 as the frozen production baseline. New product features should begin from the resulting clean `main` state on a new version branch. Limit V4.5 changes to documented critical fixes and release housekeeping.

For a routine application rollback, leave the additive V4.3 assignment database objects in place unless a separate deliberate database migration with backup/data-preservation planning is approved.
