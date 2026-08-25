# Deploy and Test — Maths Practice V4.9

## Release scope

V4.9 is the **Student Progress Experience** release. It builds on frozen V4.8 and includes:

- V4.9A Student Progress Snapshot;
- V4.9B Student Topic Progress;
- V4.9C Student Next Steps;
- final V4.9 release presentation.

## Database state

**V4.9 adds no SQL migration.** Production migration history was re-checked before the RC and still ends at:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

V4.9 reuses the existing secure student progress/dashboard data and existing Practice assignment/deadline data. Do not run SQL solely for V4.9 deployment.

## Baselines

- Frozen V4.8 repository/docs baseline: `8220fca214e27372e757088a0b0b422545da7db1`
- V4.9A tested preview head: `d459206fa91b46e4dec6d452769695fe15bed925`
- V4.9A tested merge: `b2000708f571c07c203463f509eff00c660812a1`
- V4.9B tested preview head: `c2a287a45fbaa19d2cd161eb833625c3116435bb`
- V4.9B tested merge: `6a04d00472f737498123c83d70e2450b18054c48`
- V4.9C tested preview head: `a7ff89ed5cb26aa18d1273214ba87c988d08b16c`
- V4.9C tested merge / RC base: `ae3f4bbf4fc3ca559b76ce1b1b0a39808f81f653`
- Final tested V4.9 RC: `09a8cb3257667be81b6272b81c70a006384ac624`
- Stable V4.9 application release merge: `54d2cf4853251588ed9d6d5616a98662164c482d`

## Focused slice validation already passed

- [x] V4.9A Progress snapshot matches existing secure My Progress evidence.
- [x] V4.9B Topic Progress matches source topic state/evidence and the sticky-navigation title offset was corrected.
- [x] V4.9C What to work on next passed Focus-Area fallback, securely loaded assignment urgency and navigation checks.

## Final V4.9 regression — PASSED

### Release identity

- [x] Browser title shows `Math Practice V4.9`.
- [x] Start badge shows `Version 4.9 • Student Progress Experience`.
- [x] Start release note describes student progress while preserving secure Practice/Exam boundaries.

### Student baseline

- [x] Normal registered-student sign-in lands on Home.
- [x] Home / Learn / Assignments / Progress / Reviewed navigation works normally.
- [x] Practice and Exam entry points remain available as expected.

### V4.9A — Progress Snapshot

- [x] Progress snapshot appears directly under the existing My Progress counters.
- [x] Current focus matches the first existing Focus Area.
- [x] Strongest now matches the first existing Strength.
- [x] Practice completed matches the existing Practice-session count.
- [x] Latest activity matches the first existing Recent Activity item.
- [x] Limited/no-evidence students receive safe fallback text rather than fabricated percentages.

### V4.9B — Topic Progress

- [x] View topic progress appears on Strength and Focus cards.
- [x] Selected topic title remains visible below sticky navigation.
- [x] Topic state, mastery percentage and scored-response count match the source topic card.
- [x] What this means does not introduce a new score or threshold.
- [x] Topic-specific improvement appears only when the existing milestone names that topic.
- [x] Recent Practice shows only matching visible Practice activity and safe fallback otherwise.
- [x] Close topic and opening another topic work without duplicate panels/actions.

### V4.9C — Student Next Steps

- [x] What to work on next appears below Progress snapshot.
- [x] Before assignment urgency is loaded, current Focus Area is used safely and the panel prompts the student to open Assignments.
- [x] Open Assignments routes to the existing Assignments screen and does not auto-start Practice.
- [x] After Assignments is securely loaded, priority order is Overdue → Due today → Due soon → other outstanding Practice → Focus Area.
- [x] Learning focus matches the first Focus Area.
- [x] Keep strong matches the first Strength.
- [x] View topic progress actions open the intended existing V4.9B topic detail.
- [x] Reopening My Progress does not duplicate the Next Steps panel/actions.

### V4.8 deadline regression

- [x] Student Practice deadline summary/chips still appear correctly.
- [x] Overdue Practice remains startable/completable.
- [x] Teacher Assignment deadline monitoring still follows the selected class.
- [x] Adjust target / Clear due date still work normally.

### Existing intervention workflow

- [x] Teacher Analytics → Action Center loads normally.
- [x] Queue filters and Show all/top 6 work.
- [x] History opens the intended learner intervention record.
- [x] Assign again still prefills the intended follow-up Practice setup.
- [x] Class intervention overview remains sensible.
- [x] Export queue CSV still works.

### Practice assignment and learning flow

- [x] A normal targeted Practice assignment creates successfully.
- [x] Selected-student / multi-recipient targeting remains intact.
- [x] Practice assignment starts normally.
- [x] Practice grading works normally.
- [x] Ending assigned Practice early remains In progress.
- [x] Completing the target marks the assignment Completed.
- [x] Practice AI Learning Help remains available.

### Teacher/admin smoke checks

- [x] Results loads normally.
- [x] Classes & Assignments loads normally.
- [x] Exam Settings loads normally.
- [x] Review Queue loads normally.
- [x] Question Bank loads normally.
- [x] Exam Mode / Exam Assignments remain AI-free.

### Presentation

- [x] Narrow/mobile-width smoke check passes.
- [x] Dark Mode smoke check passes.

## Release result

**PASSED — V4.9 released.**

Final tested V4.9 RC: `09a8cb3257667be81b6272b81c70a006384ac624`

Stable V4.9 application release merge: `54d2cf4853251588ed9d6d5616a98662164c482d`

The final frozen repository/docs commit is the `main` head after the documentation-only freeze commit that records this result.

## Rollback

For presentation-only rollback, restore the tested V4.9C application baseline:

`ae3f4bbf4fc3ca559b76ce1b1b0a39808f81f653`

For full V4.9 feature rollback, restore the frozen V4.8 repository/docs baseline:

`8220fca214e27372e757088a0b0b422545da7db1`

V4.9 adds no database migration. Existing V4.3 assignment database objects should remain in place during routine application rollback. Preserve production `config.js`.
