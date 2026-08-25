# Deploy and Test — Maths Practice V4.8

## Release scope

V4.8 is the **Practice Deadlines & Follow-Up** release. It builds on frozen V4.7 and includes:

- V4.8A Teacher Deadline Monitoring;
- V4.8B Student Deadline Experience;
- V4.8C Practice Deadline Follow-Up;
- final V4.8 release presentation.

## Database state

**V4.8 adds no SQL migration.** Production migration history was re-checked before the RC and still ends at:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

The Practice `opens_at` / `closes_at` target fields already existed before V4.8. Do not run SQL solely for V4.8 deployment.

## Baselines

- Frozen V4.7 repository/docs baseline: `0b59342b828a3cbaaf23ec42744a50dc0cc0e528`
- V4.8A tested merge: `3cdc233b02c8cecf309d5226863940b66ba84007`
- V4.8B tested merge: `7a94d1778cce657e483ce4801ebdf28a9bd7f852`
- V4.8C tested merge / RC base: `09aa5e54589c7a9bf4979705465f397e29484822`

The final tested RC and stable application release SHAs are recorded after this checklist passes.

## Focused slice validation already passed

- [x] V4.8A teacher deadline monitoring passed Deploy Preview testing.
- [x] V4.8B student deadline summary/chips passed Deploy Preview testing after the direct-card decoration fix.
- [x] V4.8C Adjust target passed Deploy Preview testing after moving the editor outside the auto-refreshing monitor panel.

## Final V4.8 regression

### Release identity

- [ ] Browser title shows `Math Practice V4.8`.
- [ ] Start badge shows `Version 4.8 • Practice Deadlines & Follow-Up`.
- [ ] Start release note describes Practice deadlines and follow-up while preserving secure Practice/Exam boundaries.

### Student baseline

- [ ] One normal registered-student sign-in lands on Home.
- [ ] Student Assignments loads normally.
- [ ] Practice and Exam entry points remain available as expected.

### V4.8A — Teacher Deadline Monitoring

- [ ] Teacher → Classes & Assignments loads normally.
- [ ] Assignment deadline monitoring appears for the selected class.
- [ ] Overdue / Due today / Due within 48 hours / Without due date counts are sensible.
- [ ] Assignment rows show the intended topic/strand, target date, optional start date, outstanding/completed counts and question target.
- [ ] Switching classes updates the monitoring panel.
- [ ] Review assignment reaches the intended existing assignment card.
- [ ] Completed-for-all or inactive assignments do not remain as active deadline follow-up items.

### V4.8B — Student Deadline Experience

- [ ] `Your Practice deadlines` appears above the existing Practice assignment cards for an assigned student.
- [ ] Outstanding / overdue / due today / due soon / without due date counts are sensible.
- [ ] Incomplete cards show the expected Overdue / Due today / Due soon / Due later / No due date labels.
- [ ] Completed Practice does not remain in outstanding deadline counts.
- [ ] Existing completed result remains available.
- [ ] Overdue Practice still has Start Assignment / Continue Assignment and remains completable.

### V4.8C — Practice Deadline Follow-Up

- [ ] Deadline-monitor rows show Review assignment and Adjust target.
- [ ] Adjust target opens a stable standalone dialog.
- [ ] Current target is displayed correctly.
- [ ] Saving a future target updates the teacher deadline status/count and the existing assignment card.
- [ ] The revised target appears on the assigned student's Practice card after refresh/sign-in.
- [ ] Clear due date changes the assignment to No due date.
- [ ] A target that is not after an existing Suggested start is rejected.
- [ ] Cancel closes the dialog without changing the target.

### Existing intervention workflow

- [ ] Teacher Analytics → Action Center loads normally.
- [ ] Queue filters and Show all/top 6 work.
- [ ] History opens the intended learner intervention record.
- [ ] Assign again still prefills the intended follow-up Practice setup.
- [ ] Class intervention overview remains sensible.
- [ ] Export queue CSV still works.

### Practice assignment and learning flow

- [ ] A normal new targeted Practice assignment creates successfully.
- [ ] Selected-student / multi-recipient targeting remains intact.
- [ ] Practice assignment starts normally.
- [ ] Practice grading works normally.
- [ ] Ending assigned Practice early remains In progress.
- [ ] Completing the target marks the assignment Completed.
- [ ] Practice AI Learning Help remains available.

### Teacher/admin smoke checks

- [ ] Results loads normally.
- [ ] Classes & Assignments loads normally after deadline edits.
- [ ] Exam Settings loads normally.
- [ ] Review Queue loads normally.
- [ ] Question Bank loads normally.
- [ ] Exam Mode / Exam Assignments remain AI-free.

### Presentation

- [ ] Narrow/mobile-width smoke check passes.
- [ ] Dark Mode smoke check passes.

## Release result

**PENDING — final V4.8 RC regression.**

When every required check above passes, merge the exact tested RC into `main`, record the stable application release SHA, then make one documentation-only freeze commit and align `feature-v4.8` to the final frozen `main`.

## Rollback

For presentation-only rollback, restore the tested V4.8C application baseline:

`09aa5e54589c7a9bf4979705465f397e29484822`

For full V4.8 feature rollback, restore the frozen V4.7 repository/docs baseline:

`0b59342b828a3cbaaf23ec42744a50dc0cc0e528`

V4.8 adds no database migration. Existing V4.3 assignment database objects should remain in place during routine application rollback. Preserve production `config.js`.
