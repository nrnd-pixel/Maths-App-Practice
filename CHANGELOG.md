# Maths Practice App — Running Changelog

## V5.9.1 — Demo routes (unreleased)

- Added , ,  — self-contained Netlify viewer routes reflecting V5.9 UI
- All three: isolated, no Supabase, no writes, CSP-blocked network


This changelog consolidates the version-specific deployment notes, migration records, release checkpoints, upgrade notes and smoke-test records that previously lived as separate files under `site/`, `site/tests/` and `docs/`.

The consolidation was prepared from the exact source files present at pre-cleanup `main` commit `a30cb2144e01874fdae3b478b9a3bc6a717ac0fe`. The original files remain recoverable from Git history at that commit. The V3.2G.1 full-package snapshot is separately preserved on branch `archive/v3.2G.1-snapshot` at commit `32d1e96c74cf75405bc6554a709431c87e00068b`.

The entries below preserve the release scope, migration state, migration identifiers, accepted/frozen commit baselines, security boundaries, release gates, rollback guidance and classroom smoke-test history from the consolidated files. Repetitive per-release checkbox wording is normalized into a running history rather than duplicated across dozens of files.

---

## Early migration manifest — V3.1 through V3.2G.2

Consolidated from `site/MIGRATION-MANIFEST.md`.

For an existing V3.2G.1 installation, the required new security migration was:

1. `migrate-v3.2G.1-to-v3.2G.2-security.sql`

The V3.2G.2 web files were to be deployed only after that migration because the client calls the new Practice feedback RPCs and expects sanitized question payloads. Installations that had run an earlier copy also needed `fix-v3.2G.2-internal-helper-permissions.sql`; fresh copies incorporated that correction into the main migration.

The fresh-database chain recorded at the time was:

1. `database/01-fresh-schema-v3.1.sql`
2. `database/02-migrate-v3.1.1-to-v3.1.2-storage.sql`
3. `database/03-migrate-v3.1.2-to-v3.2A-response-types.sql`
4. `database/04-migrate-v3.2A-to-v3.2B-multipart.sql`
5. `database/05-migrate-v3.2B.1-to-v3.2B.2-topic-normalization.sql`
6. `database/06-migrate-v3.2B.2-to-v3.2C-manual-review.sql`
7. `database/07-migrate-v3.2C-to-v3.2C.1-student-review.sql`
8. `database/08-migrate-v3.2C.1-to-v3.2D-exam-mode.sql`
9. `migrate-v3.2D.1-to-v3.2E-exam-settings.sql`
10. `migrate-v3.2E-to-v3.2F.1-exam-attempts.sql`
11. `migrate-v3.2F.1-to-v3.2F.2-classes-assignments.sql`
12. `migrate-v3.2F.2-to-v3.2F.2.1-open-access.sql`
13. `migrate-v3.2F.2.1-to-v3.2F.3-student-access.sql`
14. `database/14-migrate-v3.2G.1-to-v3.2G.2-security.sql`

V3.2D.1, V3.2G.1, V3.2G.3 and V3.3 were client-only releases. The top-level duplicate C.1/D migration files were convenience copies and were not to be run after their numbered `database/` equivalents.

---

## V3.2G.3 — Operational Stabilization

Consolidated from:

- `site/DEPLOY-AND-TEST-V3.2G.3.md`
- `site/NO-SQL-MIGRATION-V3.2G.3.txt`
- `site/README-V3.2G.3-STABILIZATION.md`
- `site/UPGRADE-FROM-V3.2G.2.txt`

V3.2G.3 preserved the V3.2G.2 server-authoritative security model while completing operational stabilization. Teacher Results, Questions, Review Queue, Exam Attempts, Classes, Students and Assignments moved to deterministic 500-row paging instead of silently stopping at 500. CSV preview validates all rows before import, including required fields, number ranges, enum values, image paths, response configuration and multipart relationships. Imports run in explicit 100-row batches and report the failed CSV row range plus already-saved row count if a later batch fails.

The packaged 2025 Paper 1 bank was standardized to **40 active logical questions and 90 marks**. Q29 became an active **2-mark drawing/manual-review** response. Q9 and Q31 carried explicit multipart metadata. CSV/XLSX templates carried the six optional response/multipart columns supported by the application.

**Database:** no SQL migration. Keep the V3.2G.2 security migration and helper-permission fix installed. Existing production question rows were not automatically changed.

**Upgrade record:** preserve production `config.js`; replace the V3.2G.3 client and updated import/template assets; do not overwrite a working production paper with the packaged bank unless deliberately reconstructing/correcting it.

**Verification record:** `node tests/verify-v3.2G.3.cjs`; Netlify Deploy Preview; teacher panels; 42 physical import rows = 40 logical questions / 90 marks; Q29 pending-review behavior; result release after teacher review.

**Rollback:** restore the prior Netlify deploy or revert the client PR. No database rollback was required.

---

## V3.3 — Learning Insights

Consolidated from:

- `site/DEPLOY-AND-TEST-V3.3.md`
- `site/NO-SQL-MIGRATION-V3.3.txt`
- `site/README-V3.3-LEARNING-INSIGHTS.md`
- `site/UPGRADE-FROM-V3.2G.3.txt`

V3.3 added teacher-facing Learning Insights without changing student Practice, Exam, feedback or Reviewed Work flows. Analytics grouped existing `session_answers` evidence by topic and skill/subtopic, and reported represented learners, scored responses, marks awarded/possible and pending review. Student learning profiles showed filtered topic evidence and recent completed Practice/Exam activity. Learning CSV exports followed the dashboard Period/Class/Year/Activity/search scope.

Recorded interpretation rules:

- completed auto-marked and teacher-reviewed responses contribute `marks_awarded / marks_possible`;
- `review_status = pending` is shown as pending and excluded from the percentage;
- fewer than 3 scored responses = **Early evidence**;
- 3+ scored responses below 60% = **Needs attention**;
- 60–79% = **Developing**;
- 80%+ = **Secure**;
- labels are screening cues, not formal grades.

**Database:** no SQL migration. Existing `practice_sessions`/`session_answers` and existing teacher authorization were reused. Keep the V3.2G.2 security migration/helper fix installed.

**Verification:** `node tests/verify-v3.3.cjs`; Netlify preview; existing teacher workflows; Learning Insights filter synchronization; pending manual responses not depressing percentages; Paper 1 2025 = 40 questions/90 marks; Q29 manual-review regression.

**Rollback:** restore V3.2G.3 `index.html`; no SQL rollback.

---

## V4.0 — Daily Learning Platform / Learning Hub

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.0.md`
- `site/NO-SQL-MIGRATION-V4.0.txt`

Stable application merge: `c95020073c66d1a87784c669ec8091a219891dbe`  
Pre-V4.0 V3.9 rollback baseline: `fa94046f9954c9d2594ec0e062bff52280d66a1c`

V4.0 introduced the signed-in Learning Hub with persistent **Home / Learn / Assignments / Progress / Reviewed** navigation. Home prioritized in-progress assignments, then active assignments, Recommended Practice and general Learn access, while retaining streak/weekly-goal/session/teacher-message information. Learn hosted the established Practice and Exam setup. Student sign-in became session-continuous without persisting the PIN.

**Database:** no SQL migration. Existing tables, RLS, teacher authorization, temporary student access tickets, grading/answer release and assignment/result/review/progress/motivation/message/recommendation RPCs were retained.

**Security boundaries:** PIN not stored; separate Practice/Exam temporary tickets; server-authoritative grading; Exam and Exam Assignments AI-free; no broad recursive MutationObserver.

**Release verification:** logged-out shell; sign-in and refresh continuity; all five navigation areas; Home priority; Practice grading and AI Help; Exam AI-free behavior and save/resume; assignments; Progress/Reviewed Work; teacher regression workflows; security checks.

**Rollback:** restore last known-good V4.0 deployment or the V3.9 baseline; preserve production `config.js`; no SQL rollback.

---

## V4.1 — Mastery & Mistake Recovery

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.1.md`
- `site/NO-SQL-MIGRATION-V4.1.txt`

Stable V4.1 merge: `c03a294c65e46693b90e55cf12216a1b643c5902`  
V4.1C tested baseline: `ab3b7df0dde6e1e2aee6e7769566cf45b1725339`  
Frozen V4.0 repository baseline: `408386a068cf10e923cd0400796be87d13486143`

Accepted scope:

- V4.1A Actionable Focus Areas;
- V4.1B Practice Mistake Recovery;
- secure multi-session Practice-ticket rotation;
- V4.1C Mastery Progress;
- PIN Enter-key sign-in guard;
- V4.1D Home learning-loop priorities/release polish.

Home priority was explicitly: in-progress assignment → active assignment → Focus Area/mastery Practice → Recommended Practice → general Learn. Focus Areas reused secure learning-dashboard evidence. Practice summaries separated first-try correct, corrected-on-second-try and still-needs-work outcomes, excluding pending manual review from incorrect counts. `Practice what I struggled with` launched a secure follow-up Practice session. Progress displayed Needs attention / Developing / Secure as current mastery states.

**Database:** no SQL migration; no new table/column/RPC/RLS/grading/answer-release/assignment/Exam/AI-provider migration.

**Rollback:** V4.1D-only to `ab3b7df0dde6e1e2aee6e7769566cf45b1725339`; full V4.1 to frozen V4.0 `408386a068cf10e923cd0400796be87d13486143`; no SQL rollback.

---

## V4.2 — Teacher Action & Practice Assignments

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.2.md`
- `site/DATABASE-MIGRATIONS-V4.2.txt`

Stable V4.2 merge: `3a9a4cb90e8b3dd0b26ed27766508e9037d3e347`.

Accepted scope:

- V4.2A Teacher Action Center;
- V4.2B Targeted Practice Assignments;
- V4.2C Roster Management & Cleanup;
- V4.2D Quick Add Student;
- V4.2E release presentation/regression.

**Additive Supabase migrations (already applied/tested before release):**

1. `supabase/v42b_practice_assignments.sql` — Practice Assignment records/attempts and secure student list/start/complete RPCs; server-validated completion.
2. `supabase/v42b_practice_assignment_target_snapshot.sql` — snapshots required question target per attempt so later bank availability cannot move the completion target.
3. `supabase/v42c_safe_roster_student_delete.sql` — guarded teacher-only unused-roster deletion; blocks deletion where learning/history exists.

Do not re-run these migrations merely because V4.2 is deployed. Routine application rollback to V4.1 must **not** drop the additive tables/functions; database removal would require a separate, explicit data-preserving migration.

Release regression covered student sign-in/Home; assignment create/complete/early-end; Action Center; safe deletion; Quick Add; bulk roster/PIN/deactivation; V4.1 mastery/recovery; Practice AI Help; AI-free Exam; mobile/narrow layout.

---

## V4.3 — Flexible Practice Assignments

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.3.md`
- `site/DATABASE-MIGRATIONS-V4.3.txt`

Stable V4.3 merge: `7c3520f16ca5faf7e0f62feee7e09f7f10a1bd46`.

Accepted scope:

- V4.3A Individual Practice Assignments;
- V4.3B Multi-Student & Multi-Class Practice Assignments;
- V4.3C Teacher Dashboard Responsive & Dark Mode Polish;
- V4.3D Combined Teacher Improvements.

**Additive migration tail:**

- `20260823125429 v43a_individual_practice_assignments` / `supabase/v43a_individual_practice_assignments.sql` — recipient table, recipient-scoped list/start/complete access and single-target teacher RPC.
- `20260823125445 v43a_individual_practice_delete_guard` / `supabase/v43a_individual_practice_delete_guard.sql` — recipient deletion RESTRICT and roster-delete history guard.
- `20260823125602 v43a_teacher_rpc_anon_revoke` / `supabase/v43a_teacher_rpc_anon_revoke.sql` — revoke anonymous/public execution; authenticated-only plus internal `is_teacher()` enforcement.
- `20260823134448 v43b_multi_recipient_practice_assignments` / `supabase/v43b_multi_recipient_practice_assignments.sql` — validated batch selected-student/multi-class creation, atomic after complete target validation.

Release regression covered individual/selected/multi-class visibility and completion, early-end safeguards, safe roster deletion, Action Center, Exam Settings dark/mobile/bulk management, V4.1 recovery, repeated secure Practice, AI Help, AI-free Exam, review workflow and mobile layouts.

Routine rollback must not drop recipient tables/functions because doing so could destroy assignment-audience data or weaken deletion safeguards.

---

## V4.4 — Guided Practice Interventions

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.4.md`
- `site/DATABASE-MIGRATIONS-V4.4.txt`

Stable V4.4 merge: `3a41e5b4634151a4a9da0684428c46c76d1e475a`.  
Final tested RC: `6cde7b1f46104d3593f49e2b8e6d5626e32cb383`.

Accepted scope:

- V4.4A Action Center → Prefilled Practice Intervention;
- V4.4B Shared Focus Group Intervention;
- V4.4C Intervention Follow-Through.

Action Center could prefill a selected learner, safely resolved strand/topic and default 5-question target, but the teacher still had to confirm the established assignment action. Shared-focus groups combined only 2+ same-class learners with the same safely resolved focus. Matching assignments displayed Not started/In progress/Completed state and outstanding matching work used Review Practice instead of encouraging an immediate duplicate.

**Database:** no new migration; reused the V4.3 recipient/assignment baseline. Do not re-run V4.3 migrations.

Rollback to tested V4.4C baseline `34a5fdcec6c604f730c2d995df958fbbdc947514` for presentation-only changes or frozen V4.3 `7c3520f16ca5faf7e0f62feee7e09f7f10a1bd46` for full feature rollback.

---

## V4.5 — Intervention Queue & Outcomes

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.5.md`
- `site/DATABASE-MIGRATIONS-V4.5.txt`

Stable V4.5 merge: `83cac64b08649b0b4d968cfe938508edbfd97eed`.  
Final tested RC: `1447200c41a01f97a8c5c9e40a6554e21b928866`.

Accepted scope:

- V4.5A Intervention Queue Filters & Show All;
- V4.5B Completed Intervention Outcomes.

Action Center added All / Needs assignment / Outstanding / Completed counts and filtering, while preserving the compact top-six view with Show all. Completed matching Practice displayed recorded mastery %, first-try %, question count, hints used and completion time. The UI deliberately did not claim improved/not-improved causality. Open Results stayed in Teacher Dashboard and targeted the relevant learner/session.

**Database:** no migration. V4.5 reused V4.3 Practice assignment/recipient/attempt/session data and did not change grading, mastery thresholds, assignment state enforcement, authentication, answer release or AI security.

---

## V4.6 — Intervention Records

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.6.md`
- `site/DATABASE-MIGRATIONS-V4.6.txt`

Stable V4.6 merge: `5260945f240fc4425d42b650e5707d0b0c1c3c6f`.  
Final tested RC: `b111bcb2fd43238ada7d4bedb74fd7353b98869b`.

V4.6A added Intervention Queue CSV export. Exports followed the current Analytics scope and selected queue filter, included all matching priority learners beyond the visible top six, and carried learner/class/focus/intervention information plus recorded completed-outcome fields. **No PIN or private result-code column** was exported.

**Database:** no migration; V4.6 was a teacher-side browser export over existing V4.4/V4.5 intervention and V4.3 assignment/session data.

---

## V4.7 — Intervention History & Follow-Up

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.7.md`
- `site/DATABASE-MIGRATIONS-V4.7.txt`

Frozen V4.6 baseline: `b1f38a842b3d1762de403673f43ea78d8d1d51fa`  
V4.7A tested merge: `1ac29709aaf0a4e29418ebf086f8f1a8b3860ecf`  
V4.7B tested merge: `f7f6723db6cea1a20fc6618a5009ad745ea66c1b`  
V4.7C tested merge/RC base: `2d13e9e6b80776fdfc9655779bb64d9a7f3da4e4`  
Final tested RC: `ebed7de47a9633ccd72aac1e0dd9988764e596fb`  
Stable merge: `d62fb0892c69fda69cb76520ad90339fbbb65df2`

Accepted scope:

- V4.7A Learner Intervention History;
- V4.7B Follow-Up From Intervention History;
- V4.7C Class Intervention Overview.

History retained prior intervention entries even when outside the current Analytics-period filter. Completed history could open the matching result; outstanding history used Review Practice. **Assign again** created only a prefilled new assignment path and still required normal teacher confirmation, leaving original history/results intact. Class overview summarized Priority / Need assignment / Outstanding / Completed counts, per-class counts and common focus topics from the same intervention scope.

**Database:** no migration; reused existing assignment/recipient/attempt and Practice result evidence. V4.7B did not auto-create assignments.

---

## V4.8 — Practice Deadlines & Follow-Up

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.8.md`
- `site/DATABASE-MIGRATIONS-V4.8.txt`

Frozen V4.7 baseline: `0b59342b828a3cbaaf23ec42744a50dc0cc0e528`  
V4.8A: `3cdc233b02c8cecf309d5226863940b66ba84007`  
V4.8B: `7a94d1778cce657e483ce4801ebdf28a9bd7f852`  
V4.8C/RC base: `09aa5e54589c7a9bf4979705465f397e29484822`  
Final RC: `5547716e0ec5daea345602741ab951e95a90fafe`  
Stable merge: `fb750cfed150cf1cc0be6eecfa6857435d651904`

Accepted scope:

- V4.8A Teacher Deadline Monitoring;
- V4.8B Student Deadline Experience;
- V4.8C Practice Deadline Follow-Up.

Teacher monitoring classified Overdue / Due today / Due within 48 hours / Without due date. Student cards used matching due-state labels and did not treat overdue as inaccessible. **Overdue target dates were guidance only and did not lock Practice.** Adjust target updated/cleared the existing assignment target; it did not create a second assignment.

**Database:** no migration. Existing `opens_at` / `closes_at` fields were reused; V4.8C updated only existing `practice_assignments.closes_at` and `updated_at` through the teacher-authorized assignment model.

---

## V4.9 — Student Progress Experience

Consolidated from:

- `site/DEPLOY-AND-TEST-V4.9.md`
- `site/DATABASE-MIGRATIONS-V4.9.txt`

Frozen V4.8 baseline: `8220fca214e27372e757088a0b0b422545da7db1`  
V4.9A tested merge: `b2000708f571c07c203463f509eff00c660812a1`  
V4.9B tested merge: `6a04d00472f737498123c83d70e2450b18054c48`  
V4.9C/RC base: `ae3f4bbf4fc3ca559b76ce1b1b0a39808f81f653`  
Final RC: `09a8cb3257667be81b6272b81c70a006384ac624`  
Stable merge: `54d2cf4853251588ed9d6d5616a98662164c482d`

Accepted scope:

- V4.9A Student Progress Snapshot;
- V4.9B Student Topic Progress;
- V4.9C Student Next Steps.

Progress Snapshot reused existing secure evidence for focus, strength, Practice count and latest activity, with safe fallback text for limited evidence. Topic Progress reused the source topic state/percentage/response count rather than introducing a new score or threshold. Next Steps initially used current Focus Area, then after secure assignment loading prioritized Overdue → Due today → Due soon → other outstanding Practice → Focus Area. It did not auto-start or create Practice.

**Database:** no migration; no tables/columns/RPC/policy/grading/mastery-threshold/assignment-access changes.

---

## V5.1 — Stable Release / content pipeline, Question Bank safety and Exam experience

Consolidated from:

- `site/DEPLOY-AND-TEST-V5.1.md`
- `site/DATABASE-MIGRATIONS-V5.1.txt`

Release-candidate base: `787c9cccf5561dc041c74a5c498631dee28e22c9`.

Accepted scope included:

- V5.1A paper import pipeline: Paper Profile QA, bulk images, package preview, one-confirmation import and post-import integrity;
- V5.1B Question Bank QA, bulk state/metadata controls, review/audit history, multipart management and guarded Exam publication;
- V5.1C1 Student Exam Paper Library;
- **V5.1C2 — Exam resume and progress clarity** over the existing secure attempt/resume/autosave engine.

**Database record:**

V5.1A — no new database migration required.  
V5.1B production migration history included:

- `20260828155458 v51b2c_question_review_workflow`
- `20260828225115 v51b2d_question_change_history`
- `20260829011834 v51b2e_multipart_question_management`
- `20260829034010 v51b3_exam_publication_safety`
- `20260829040215 v51b3_exam_publication_bulk_safety`
- `20260829052501 v51b3_exam_publication_safety_followup`
- `20260829072524 v51b3_exam_publication_bulk_safety`
- `20260829072534 v51b3_exam_publication_safety_followup`
- `20260829080359 v51b3_exam_publication_bulk_safety`
- `20260829080449 v51b3_exam_publication_safety_followup`
- `20260829181101 v51b3_exam_publication_bulk_guard`
- `20260829181613 v51b3_exam_publication_bulk_cleanup`

V5.1C1 — no new database migration required.  
**V5.1C2 — no new database migration required.**

Do not re-run historical V5.1B migrations merely because the app version changes. The target project was recorded as `SR Lumapas Math Practice` and migration history was to end at or beyond `20260829181613` before stable sign-off.

RC acceptance covered package preview/import safety, Question Bank QA/publication, the Exam paper library, resume/progress recovery, ordinary Practice/Exam regression, My Progress/Assignments, teacher reporting, responsive/dark-mode/accessibility behavior. One final gate was: **V5 Regression Safety is green on the exact candidate head**. Netlify Deploy Preview was also required on the exact candidate head.

---

## V5.2 — Topical Exercise Foundation and Student Topical Practice

Consolidated from:

- `site/DATABASE-MIGRATIONS-V5.2.txt`
- `site/tests/README-V5.2C.md`

Starting stable base: `88e435d1602b262c2d67c0b7dc6406f9dabe3046`.

### Post-V5.1 security hardening

`20260830023818 v52_preflight_is_teacher_search_path_hardening` pinned `public.is_teacher()` to an empty `search_path` while preserving behavior, ownership, authenticated EXECUTE and anon revocation.

### V5.2A — Topical Exercise Foundation

`20260830024003 v52a_topical_exercise_source_type` extended `questions_source_type_check` to allow `topical_exercise`. It inserted no topical rows and changed no existing rows. Topical rows remained inactive during staging. The existing 25-column CSV schema stayed unchanged; `source` remained the set/package identity; topical rows had no exam-year/paper metadata.

### V5.2B — Teacher Topical Exercise Library & Management

No database migration. Teacher-only grouping/management reused staged inactive topical rows, Question Bank QA/review and guarded set rename. Rename was blocked for active sets or same-year name collisions. No creation/activation/publication/student exposure occurred in V5.2B.

### V5.2C — Student Topical Practice Library

Migrations:

- `20260830094514 v52c_student_topical_practice_library`
- `20260830111213 v52c_topical_hint_guard`

They introduced the server-only publication registry, topical-bound student access ticket/session metadata, readiness/publication RPCs, safe public set metadata, and dedicated bearer-token retrieval/grading/hint/submission flows for inactive reviewed topical questions. Ordinary Practice RPCs remained unchanged.

Recorded production state after migration for `Topical Exercise Paper 2 Extra`: 292 physical rows, 261 logical questions, 292 marks, 64 image rows, 18 manual/drawing rows; 0 active topical rows; 0 metadata/image/multipart/duplicate blockers; 292 review blockers; readiness false; 0 published settings; student-visible set count 0.

Security boundary: topical rows remain inactive even when published; retrieval/grading/hints require the bound unexpired Practice ticket and currently published/live-ready set; correct answers/hints/explanations are not returned by question retrieval; publication is teacher-only; server-only objects retain restricted direct access; Exam Settings and ordinary Practice remain separate.

The V5.2C regression scope covered teacher publication gating, student library, dedicated inactive-question retrieval/grading/submission, Hint bridge, SQL security, zero-exposure defaults, migration records and loader preservation. Imported topical content remained unavailable until reviewed and explicitly published.

---

## V5.4 — Stable Release Checkpoint

Consolidated from `site/RELEASE-CHECKPOINT-V5.4.md`.

Date: 2026-09-01.  
Accepted production base: `e6bf783489f306560c4066a60dafede3e1edc4a4`.  
Accepted sequence: V5.4A through V5.4G.

Recorded Practice-bank invariants at checkpoint start: 527 Practice-eligible physical rows; 292 topical-origin Practice-eligible physical rows; 0 active topical rows; 0 partially eligible non-topical multipart groups.

Accepted scope:

- V5.4A Unified Practice Resource Bank Visibility;
- V5.4B Teacher Practice Eligibility Controls;
- V5.4C Compact Question Bank Browsing;
- V5.4D Topical Resource Library Simplification;
- V5.4E Bulk Practice Eligibility Controls;
- V5.4F Bulk Selection Scope Safety;
- V5.4G Paged Manual Bulk Selection.

Student modes remained Practice and Exam; Practice used the unified resource bank; Exam remained explicitly published, deterministic and AI-free. No Supabase migration/data mutation was required.

Stable identity: `Math Practice V5.4`, `Version 5.4 • Stable Release`, `V5.4 Release Audit`.

Release gates included Regression Safety, V5.4 checkpoint CI, Netlify preview, teacher Question Bank smoke test, student Practice/Exam smoke test, visible release identity and recheck of the four Practice-bank invariants.

---

## V5.5 — Stable Release Checkpoint

Consolidated from `site/RELEASE-CHECKPOINT-V5.5.md`.

Date: 2026-09-02.  
Accepted production base: `ab90f2b2e5d2078346794a6cd977ec542ea02fd0`.  
Accepted sequence: **V5.5A**, **V5.5B**, **V5.5C** including V5.5C.1, and **V5.5D**.

- V5.5A Past Paper Practice Library;
- V5.5B Quick Session / All Available Questions;
- V5.5C same-device resume checkpoint with 7-day expiry and no PIN/access-token/answer/hint/explanation storage;
- V5.5C.1 resume-aware Next Question bridge;
- V5.5D Past Paper result attribution via `practice_mode = past_paper`, `exam_year`, `paper` and teacher Activity labeling.

Stable identity: `Math Practice V5.5`, **Version 5.5 • Stable Release**, `V5.5 Release Audit`.

**No Supabase migration or data mutation** was required for this checkpoint. Mixed Practice, Topic Practice, Exam Mode, grading, hints, AI Learning Help, recommendations, assignments, reporting and Reviewed Work boundaries were retained.

---

## V5.6 — Stable Release Checkpoint

Consolidated from `site/RELEASE-CHECKPOINT-V5.6.md`.

Date: 2026-09-02.  
Accepted production base: `a972fd5fdda4f44e7d314f0442c066f95aa9160e`.

Accepted sequence:

- **V5.6A** Question Bank Response-Type Filter;
- **V5.6A.1** Bulk Practice Confirmation Bridge;
- **V5.6B** Teacher-Assigned Past Paper Practice;
- **V5.6C** Student Past Paper Progress;
- **V5.6D** Teacher Past Paper Analytics.

Teachers could assign current Practice-eligible papers to class/selected students/multiple same-year classes using Quick Session or All Available Questions. Students saw paper-level coverage, latest first-try/mastery, session count and assignment context. Teachers received read-only class/paper analytics with coverage, latest averages, learner status, assigned/self-selected context, weak questions and topic/skill focus.

Stable identity: `Math Practice V5.6`, **Version 5.6 • Stable Release**, `V5.6 Release Audit`.

**No new Supabase migration or data mutation** was required. Existing V5.5 Past Paper Practice, AI Learning Help and Exam boundaries remained intact.

---

## V5.7 — Stable Release Checkpoint

Consolidated from `site/RELEASE-CHECKPOINT-V5.7.md`.

Date: 2026-09-03.  
Accepted production base: `4a5759ed81a89449531ae061b1de6e4f722dc86b`.

Accepted sequence:

- **V5.7A** Cross-Device Past Paper Resume, including V5.7A.1/A.2 hardening;
- **V5.7B** Better Teacher Assignment Management;
- **V5.7C** Student Continue Learning Home;
- **V5.7D** Past Paper Analytics Actions;
- **V5.7D.1** Teaching Focus Plan Copy Fallback.

Cross-device resume stored a server-backed unfinished checkpoint while excluding PINs, access tokens, correct answers, explanations and hint text. Assignment management exposed status counts and deliberate reassign-as-new while preserving original work/results. Continue Learning prioritized saved Past Paper work, teacher assignments, recommended Practice and general Learn. Analytics could prepare cohorts/open assignment management/generate a visible Teaching Focus Plan but did not submit assignments automatically.

Stable identity: `Math Practice V5.7`, **Version 5.7 • Stable Release**, `V5.7 Release Audit`.

**No new Supabase migration or data mutation** was required. The **student entry remains Practice-first**. **Exam Mode remains preserved** in code/data/teacher controls/history while its student entry remains hidden/deferred.

---

## V5.7.5 — Gamification Stable Release Checkpoint

Consolidated from `site/RELEASE-CHECKPOINT-V5.7.5.md`.

Date: 2026-09-03.  
Accepted production base: `cada087966746a0fdbdba71912470d5705bb568e`.

Accepted sequence:

- **V5.7.1A** XP + Levels derived from saved Practice evidence;
- **V5.7.1B** Practice Streaks + Achievement Badges;
- **V5.7.2** Weekly Missions resetting Monday in Brunei time;
- **V5.7.3** Cooperative Class Challenge + Teacher Motivation without public ranking;
- **V5.7.4** Gamification Polish + Teacher Controls.

Stable identity: `Math Practice V5.7.5`, **Version 5.7.5 • Gamified Practice Release**, `V5.7.5 Release Audit`.

**No new Supabase migration or data mutation** was required. **Student entry remains Practice-first**. **Exam Mode remains preserved**. **No leaderboard**, class-v-class ranking, coin shop or answer/hint advantage was introduced.

---

## V5.8 — Stable Release Checkpoint

Consolidated from `site/RELEASE-CHECKPOINT-V5.8.md`.

Date: 2026-09-04.  
Accepted production base: `4f88bc2153c32434a130dbe54310595839148423`.

Accepted sequence:

- **V5.8A** Student First-Use Experience — one clear 5-question Mixed Practice action until the existing First Practice achievement evidence exists;
- **V5.8B** Teacher Workspace Consolidation — Monitor / Teach / Students / Content / Reports & Support launcher while retaining the full original teacher tool row;
- **V5.8C** Parent-Friendly Student Report — concise Practice progress summary, printable A4, no parent login or second reporting engine, explicitly not an official exam grade;
- **V5.8D** Content Workflow Consolidation — links existing Import / Validate / Review / Practice availability / topical publication / Audit history owners into one source-aware route.

Stable identity: `Math Practice V5.8`, **Version 5.8 • Stable Release**, `V5.8 Release Audit`.

**No new Supabase migration or data mutation** was required. The **student entry remains Practice-first**. **Exam Mode remains preserved** in code/data/teacher publication controls/history while its student entry remains deferred. The stable checkpoint is presentation/audit-only and does not change authentication, grading, Practice retrieval, assignments, results, question content, feedback, gamification or the preserved Exam engine.

---

## V5.8.1 — Past Paper assignment completion hotfix

Consolidated from `site/DATABASE-MIGRATIONS-V5.8.1.txt`.

The old `.txt` file was not merely documentation: it contained executable SQL and was directly read by `site/tests/verify-v5.8.1-past-paper-assignment-completion.cjs`. During Phase 3 it was moved byte-for-byte to the canonical migration path:

`supabase/v581_past_paper_assignment_completion.sql`

The verifier was updated to read the canonical Supabase file.

The hotfix addressed two production contract issues:

1. `submit_practice_session_v3` had coerced Past Paper Practice to `mixed` and discarded `exam_year` / `paper` attribution.
2. `complete_student_practice_assignment_v56b` depended on an exact result-code lookup and rejected legacy Past Paper sessions whose `practice_mode` had already been coerced to `mixed`.

The completion function remains server-enforced. Question-level evidence is authoritative: saved answers must belong to the assigned paper/topic and distinct logical-question count must satisfy the assignment target. Ambiguous fallback matches are refused for teacher review rather than auto-linked.

---

## V5.8 Stability & Classroom Smoke Checklist

Consolidated from `docs/V58-STABILITY-SMOKE-CHECKLIST.md`.

Baseline recorded by the source: `164bbe2c380b55f974223cb7715e2bd219ee216f` — V5.8 Stable Release.

Purpose: verify existing production workflows before V5.8.x maintenance without requiring new content, schema, grading changes or a redesign.

### A. Student session and Home

- phone sign-in with a dedicated test Student ID + PIN;
- PIN clears after sign-in;
- Home/Learn/Assignments/Progress navigation without another PIN request;
- sign out terminates the session;
- re-sign-in loads Practice-first Home without visible errors.

### B. Core Practice

- start 5-question Mixed Practice;
- verify images, units, fractions, MCQ/multi-select and multipart response types when encountered;
- Hint and second-try behavior;
- complete Practice and verify First Try / Mastery result information;
- return Home and verify progress/gamification refresh.

### C. Topic Practice and recommendations

- open an available topic;
- complete enough marked work for topic evidence;
- topic drill-down must reuse existing mastery/evidence;
- Home recommendation, when present, must use the intended topic/strand.

### D. Past Paper Practice continuity

- select a known paper, answer at least two questions, leave safely and verify saved checkpoint;
- same-device resume preserves question order/progress;
- second-device resume verifies server checkpoint when available;
- finishing removes unfinished checkpoint state.

### E. Teacher assignment workflow

- teacher selects class and creates a small Practice assignment for the test student;
- student sees it; partial work shows In progress; completion shows Completed with First Try/Mastery evidence;
- target/due-date edit remains guidance and does not destroy results.

### F. Intervention loop

- Teacher Workspace → Monitor → Action Center loads Priority learners from current Analytics evidence;
- focus topic/status agrees with Analytics;
- Assign Practice prefills learner/topic/strand but does not create until teacher confirmation;
- safe same-class shared-focus grouping works when 2+ learners share the same resolved focus;
- duplicate outstanding assignments are not encouraged;
- completed intervention outcome is shown from recorded Practice;
- learner profile retains Practice intervention history;
- Assign again only opens a prefilled new draft requiring teacher confirmation;
- Class intervention overview agrees with visible queue evidence.

### G. Deadline follow-up

- classify Overdue / Due today / Due soon / No due date correctly;
- Adjust target can change/clear target;
- passing the target due date does not block student access unless the assignment is explicitly closed.

### H. Teacher reports and support

- Student Performance Report / Parent-Friendly Summary agrees with teacher analytics evidence;
- summary remains explicitly not an official grade;
- feedback reaches the teacher Feedback Inbox without exposing PIN, access token, answers or answer keys.

### I. Exam regression boundary

- Exam Mode still opens when enabled;
- Exam grading/result presentation is unchanged by maintenance;
- AI Help remains unavailable in Exam Mode.

### J. Release gate

Before V5.8.x maintenance merge:

- no unintended `supabase/**` diff;
- no grading/correct-answer/Practice-retrieval/authentication change unless explicitly intended;
- regression/checkpoint/intervention verification green when runners are available;
- Netlify Deploy Preview green;
- phone smoke test passes;
- changed teacher-side functionality manually checked on desktop;
- production merge requires explicit approval.

---

## Consolidated source-file index

The following **41** version-specific records were consolidated into this running changelog. Their exact pre-consolidation text remains available at commit `a30cb2144e01874fdae3b478b9a3bc6a717ac0fe`.

### Database / migration records

- `site/DATABASE-MIGRATIONS-V4.2.txt`
- `site/DATABASE-MIGRATIONS-V4.3.txt`
- `site/DATABASE-MIGRATIONS-V4.4.txt`
- `site/DATABASE-MIGRATIONS-V4.5.txt`
- `site/DATABASE-MIGRATIONS-V4.6.txt`
- `site/DATABASE-MIGRATIONS-V4.7.txt`
- `site/DATABASE-MIGRATIONS-V4.8.txt`
- `site/DATABASE-MIGRATIONS-V4.9.txt`
- `site/DATABASE-MIGRATIONS-V5.1.txt`
- `site/DATABASE-MIGRATIONS-V5.2.txt`
- `site/DATABASE-MIGRATIONS-V5.8.1.txt` — executable SQL moved byte-for-byte to `supabase/v581_past_paper_assignment_completion.sql`.

### Deploy / test records

- `site/DEPLOY-AND-TEST-V3.2G.3.md`
- `site/DEPLOY-AND-TEST-V3.3.md`
- `site/DEPLOY-AND-TEST-V4.0.md`
- `site/DEPLOY-AND-TEST-V4.1.md`
- `site/DEPLOY-AND-TEST-V4.2.md`
- `site/DEPLOY-AND-TEST-V4.3.md`
- `site/DEPLOY-AND-TEST-V4.4.md`
- `site/DEPLOY-AND-TEST-V4.5.md`
- `site/DEPLOY-AND-TEST-V4.6.md`
- `site/DEPLOY-AND-TEST-V4.7.md`
- `site/DEPLOY-AND-TEST-V4.8.md`
- `site/DEPLOY-AND-TEST-V4.9.md`
- `site/DEPLOY-AND-TEST-V5.1.md`

### No-SQL / upgrade / version notes

- `site/NO-SQL-MIGRATION-V3.2G.3.txt`
- `site/NO-SQL-MIGRATION-V3.3.txt`
- `site/NO-SQL-MIGRATION-V4.0.txt`
- `site/NO-SQL-MIGRATION-V4.1.txt`
- `site/README-V3.2G.3-STABILIZATION.md`
- `site/README-V3.3-LEARNING-INSIGHTS.md`
- `site/UPGRADE-FROM-V3.2G.2.txt`
- `site/UPGRADE-FROM-V3.2G.3.txt`
- `site/MIGRATION-MANIFEST.md`

### Stable-release checkpoint records

- `site/RELEASE-CHECKPOINT-V5.4.md`
- `site/RELEASE-CHECKPOINT-V5.5.md`
- `site/RELEASE-CHECKPOINT-V5.6.md`
- `site/RELEASE-CHECKPOINT-V5.7.md`
- `site/RELEASE-CHECKPOINT-V5.7.5.md`
- `site/RELEASE-CHECKPOINT-V5.8.md`

### Regression / operational notes

- `site/tests/README-V5.2C.md`
- `docs/V58-STABILITY-SMOKE-CHECKLIST.md`

---

## Phase 3 archival note

`math-practice-v3.2G.1-full/` was a separate historical package directory, not the Netlify `site/` publish tree. Its only directory-touching commit in the repository log was `32d1e96c74cf75405bc6554a709431c87e00068b` (2026-08-18T02:27:17Z, import message `Import Math Practice V3.2G.1`). An exact repository search found no reference to `math-practice-v3.2G.1-full` from `site/` or `supabase/`.

Before removal from the Phase 3 working tree, that historical commit was preserved as branch:

`archive/v3.2G.1-snapshot`

The snapshot branch preserves the complete 55-file package, including its client, migration copies, templates, question-bank assets and diagrams.
