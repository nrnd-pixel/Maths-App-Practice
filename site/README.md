# Maths Practice V4.9

V4.9 is the **Student Progress Experience** release for Maths Practice. It builds on frozen V4.8 and improves how students understand their current progress, individual topic evidence and what to work on next, while preserving the existing secure progress, Practice, Exam and teacher intervention architecture.

## V4.9 release scope

### V4.9A — Student Progress Snapshot

The existing secure **My Progress** screen gains a compact **Progress snapshot** under the established summary counters.

It mirrors already-rendered secure evidence only:

- Current focus — first existing Focus Area;
- Strongest now — first existing Strength;
- Practice completed — existing Practice-session count;
- Latest activity — first existing Recent Activity item.

V4.9A does not create a new progress score, recalculate mastery or issue a second progress request.

### V4.9B — Student Topic Progress

Existing **My Strengths** and **My Focus Areas** cards gain **View topic progress**.

The read-only topic detail shows:

- current mastery state;
- current percentage;
- scored-response count;
- the existing topic-specific improvement milestone when the milestone names that topic;
- recent matching Practice activity already visible in Recent Activity.

The topic panel intentionally does not reconstruct hidden or paper-level Exam topic history. Exam evidence may still contribute to the secure mastery state already supplied by the existing dashboard.

### V4.9C — Student Next Steps

The My Progress screen gains **What to work on next**.

It reuses already-rendered evidence and existing navigation rather than introducing a new recommendation engine. When assignment urgency has already been securely loaded, priority is:

1. overdue assigned Practice;
2. due today;
3. due soon;
4. other outstanding assigned Practice;
5. current Focus Area;
6. build more learning evidence.

If Practice assignment urgency has not yet been loaded in the current session, the panel does not guess. It tells the student to open Assignments. Actions route to the existing Topic Progress and Assignments screens; nothing auto-starts Practice or changes an assignment.

## Student progress workflow

The tested V4.9 workflow is:

1. Student signs in normally and opens My Progress.
2. Progress snapshot summarises the same secure evidence shown in the detailed sections below.
3. Student opens a Strength or Focus Area through View topic progress.
4. Topic detail shows the current secure mastery/evidence picture and only topic-specific improvement or matching recent Practice that can be safely identified.
5. What to work on next points the student toward existing Focus Areas and, after secure assignment loading, teacher-set Practice urgency.
6. Student can open Assignments or Topic Progress explicitly; V4.9 never auto-starts work.

No second progress engine, recommendation model or assignment-access path was introduced.

## Security and assessment boundaries

V4.9 preserves the established production boundaries:

- student PIN is never stored or exposed by V4.9;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- assignment visibility/start/completion remains server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- V4.9 does not change mastery thresholds, grading logic or teacher intervention thresholds;
- V4.9A, V4.9B and V4.9C reuse already-rendered secure student evidence;
- V4.9C does not automatically create, change or start Practice;
- V4.9 adds no database migration.

## Database status

**V4.9 adds no database migration.** Production migration history was re-checked before release and still ends at the tested V4.3 assignment baseline:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

The secure student progress/dashboard data and targeted Practice assignment data already existed before V4.9. Do not run SQL solely for V4.9 deployment.

## V4.9 baselines

- Frozen V4.8 repository/docs baseline: `8220fca214e27372e757088a0b0b422545da7db1`
- V4.9A tested preview head: `d459206fa91b46e4dec6d452769695fe15bed925`
- V4.9A tested merge: `b2000708f571c07c203463f509eff00c660812a1`
- V4.9B tested preview head: `c2a287a45fbaa19d2cd161eb833625c3116435bb`
- V4.9B tested merge: `6a04d00472f737498123c83d70e2450b18054c48`
- V4.9C tested preview head: `a7ff89ed5cb26aa18d1273214ba87c988d08b16c`
- V4.9C tested merge / RC base: `ae3f4bbf4fc3ca559b76ce1b1b0a39808f81f653`
- Final tested V4.9 RC: `09a8cb3257667be81b6272b81c70a006384ac624`
- Stable V4.9 application release merge: `54d2cf4853251588ed9d6d5616a98662164c482d`

## Validation status

V4.9A, V4.9B and V4.9C each passed focused Netlify Deploy Preview testing before merge. The final V4.9 Release Candidate then passed the one-pass release regression before merge.

Validated release behaviour includes:

- Progress snapshot matches the existing Focus, Strength, Practice count and Recent Activity evidence;
- Topic Progress matches the source topic card state, percentage and scored-response count;
- Topic Progress title remains visible below sticky student navigation;
- topic improvement is shown only when the existing milestone names that topic;
- recent topic Practice is limited to matching visible Practice activity;
- What to work on next falls back safely to Focus Area before assignment urgency is loaded;
- after Assignments is securely loaded, overdue / due-today / due-soon / outstanding Practice is prioritised correctly;
- Next Steps actions route to existing screens and never auto-start Practice;
- V4.8 Practice deadlines and teacher deadline follow-up remain intact;
- Practice creation, grading, early-exit status, completion and AI Learning Help remain intact;
- teacher Action Center, History, Assign again, Class intervention overview and admin smoke checks remain intact;
- Exam Mode and Exam Assignments remain AI-free;
- narrow/mobile and Dark Mode checks passed.

## Key V4.9 files

- `v49-student-progress-snapshot.js` — at-a-glance secure progress summary.
- `v49-student-topic-progress.js` — read-only topic drill-down.
- `v49-student-next-steps.js` — student learning/assignment next-step guidance.
- `v40-release.js` — visible V4.9 release presentation and ordered module loader.
- `DEPLOY-AND-TEST-V4.9.md` — V4.9 release/regression record.
- `DATABASE-MIGRATIONS-V4.9.txt` — V4.9 database-change statement.

## Release discipline

Treat V4.9 as the frozen production baseline. New product features should begin from the resulting clean `main` state on a new version branch. V5.0 should focus on production hardening and reporting rather than duplicating the student progress experience.

For routine application rollback, leave the additive V4.3 assignment database objects in place unless a separate deliberate database migration with backup/data-preservation planning is approved. Preserve the production `config.js`.
