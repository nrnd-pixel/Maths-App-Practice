# Deploy and Test — Maths Practice V4.7

## Release scope

V4.7 is the **Intervention History & Follow-Up** release. It builds on frozen V4.6 and includes:

- V4.7A Learner Intervention History;
- V4.7B Follow-Up From Intervention History;
- V4.7C Class Intervention Overview;
- final V4.7 release presentation.

## Database state

**V4.7 adds no SQL migration.** Production migration history was re-checked before the RC and still ends at:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.7 deployment.

## Frozen baselines

- Frozen V4.6 repository/docs baseline: `b1f38a842b3d1762de403673f43ea78d8d1d51fa`
- V4.7A tested merge: `1ac29709aaf0a4e29418ebf086f8f1a8b3860ecf`
- V4.7B tested merge: `f7f6723db6cea1a20fc6618a5009ad745ea66c1b`
- V4.7C tested merge / RC base: `2d13e9e6b80776fdfc9655779bb64d9a7f3da4e4`
- Final tested V4.7 RC: `ebed7de47a9633ccd72aac1e0dd9988764e596fb`
- Stable V4.7 application release merge: `d62fb0892c69fda69cb76520ad90339fbbb65df2`

## Final V4.7 regression — PASSED

The final Netlify Deploy Preview regression passed on the exact RC commit above.

### Release identity

- [x] Browser title shows `Math Practice V4.7`.
- [x] Start badge shows `Version 4.7 • Intervention History & Follow-Up`.
- [x] Start release note describes history, follow-up Practice and class intervention overview.

### Student baseline

- [x] One normal registered-student sign-in lands on Home.
- [x] Practice and Exam entry points remain available as expected.

### Teacher Action Center / queue

- [x] Analytics → Teacher Action Center loads normally.
- [x] Priority learners and focus areas remain sensible.
- [x] All / Needs assignment / Outstanding / Completed queue filters work.
- [x] Show all / Show top 6 works.
- [x] Export queue CSV still reflects the current Analytics scope and selected queue filter.
- [x] Export contains no PIN/private result-code fields.

### V4.7A — learner intervention history

- [x] Registered priority learners show **History**.
- [x] History opens the intended learner profile and **Practice intervention history** section.
- [x] Historical entries show expected strand/topic, assignment date, question target, audience and status.
- [x] Completed entries show recorded outcome values matching the existing Practice result.
- [x] **Open Results** reaches the intended completed result.
- [x] Outstanding entries use **Review Practice** and reach the intended assignment.
- [x] Normal **View profile** also loads the history section.
- [x] Older intervention history remains visible when the Analytics period filter excludes the old activity.

### V4.7B — follow-up from history

- [x] Completed history entry shows **Assign again**.
- [x] Assign again opens the correct class in Classes & Assignments.
- [x] Selected students is chosen and only the intended learner is selected.
- [x] Historical strand/topic is prefilled when still available.
- [x] Historical question target is reused where valid.
- [x] Follow-up note makes clear this is a new assignment and still requires the normal **Assign Practice** action.
- [x] Creating a follow-up assignment uses the established assignment flow.
- [x] Original completed history remains intact; new follow-up assignment is a separate history entry.

### V4.7C — class intervention overview

- [x] **Class intervention overview** appears under Teacher Action Center.
- [x] Overall Priority / Need assignment / Outstanding / Completed counts match the queue.
- [x] Per-class counts match the corresponding priority learners.
- [x] Leading focus is sensible for each class.
- [x] Common focus-topic chips show sensible learner/class counts.
- [x] Analytics period/year/mode/search changes update the overview to the same scope.
- [x] Queue filters and Show all/top 6 do not restrict the overview to only visible queue rows.

### Existing intervention and assignment workflow

- [x] Assign Practice from Action Center still works.
- [x] Shared focus groups still work.
- [x] Review Practice still opens the intended existing assignment.
- [x] Manual selected-students Practice assignment still creates normally.
- [x] Targeted Practice starts and grades normally.
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

**PASSED — V4.7 released.**

Final tested RC commit: `ebed7de47a9633ccd72aac1e0dd9988764e596fb`

Stable V4.7 application release merge: `d62fb0892c69fda69cb76520ad90339fbbb65df2`

The final frozen repository/docs commit is the `main` head after V4.7 release housekeeping is complete.

## Rollback

For presentation-only rollback, restore the tested V4.7C application baseline:

`2d13e9e6b80776fdfc9655779bb64d9a7f3da4e4`

For full V4.7 feature rollback, restore the frozen V4.6 repository/docs baseline:

`b1f38a842b3d1762de403673f43ea78d8d1d51fa`

V4.7 adds no database migration. Existing V4.3 assignment database objects should remain in place during routine application rollback. Preserve production `config.js`.
