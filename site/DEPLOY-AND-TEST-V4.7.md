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

## Tested feature baselines

- Frozen V4.6 repository/docs baseline: `b1f38a842b3d1762de403673f43ea78d8d1d51fa`
- V4.7A tested merge: `1ac29709aaf0a4e29418ebf086f8f1a8b3860ecf`
- V4.7B tested merge: `f7f6723db6cea1a20fc6618a5009ad745ea66c1b`
- V4.7C tested merge / RC base: `2d13e9e6b80776fdfc9655779bb64d9a7f3da4e4`

## Final V4.7 regression — PENDING

Run the final Netlify Deploy Preview regression on the exact RC head before merge.

### Release identity

- [ ] Browser title shows `Math Practice V4.7`.
- [ ] Start badge shows `Version 4.7 • Intervention History & Follow-Up`.
- [ ] Start release note describes history, follow-up Practice and class intervention overview.

### Student baseline

- [ ] One normal registered-student sign-in lands on Home.
- [ ] Practice and Exam entry points remain available as expected.

### Teacher Action Center / queue

- [ ] Analytics → Teacher Action Center loads normally.
- [ ] Priority learners and focus areas remain sensible.
- [ ] All / Needs assignment / Outstanding / Completed queue filters work.
- [ ] Show all / Show top 6 works.
- [ ] Export queue CSV still reflects the current Analytics scope and selected queue filter.
- [ ] Export contains no PIN/private result-code fields.

### V4.7A — learner intervention history

- [ ] Registered priority learners show **History**.
- [ ] History opens the intended learner profile and **Practice intervention history** section.
- [ ] Historical entries show expected strand/topic, assignment date, question target, audience and status.
- [ ] Completed entries show recorded outcome values matching the existing Practice result.
- [ ] **Open Results** reaches the intended completed result.
- [ ] Outstanding entries use **Review Practice** and reach the intended assignment.
- [ ] Normal **View profile** also loads the history section.
- [ ] Older intervention history remains visible when the Analytics period filter excludes the old activity.

### V4.7B — follow-up from history

Use a dedicated test learner or a genuine completed intervention.

- [ ] Completed history entry shows **Assign again**.
- [ ] Assign again opens the correct class in Classes & Assignments.
- [ ] Selected students is chosen and only the intended learner is selected.
- [ ] Historical strand/topic is prefilled when still available.
- [ ] Historical question target is reused where valid.
- [ ] Follow-up note makes clear this is a new assignment and still requires the normal **Assign Practice** action.
- [ ] Creating a follow-up assignment uses the established assignment flow.
- [ ] Original completed history remains intact; new follow-up assignment is a separate history entry.

### V4.7C — class intervention overview

- [ ] **Class intervention overview** appears under Teacher Action Center.
- [ ] Overall Priority / Need assignment / Outstanding / Completed counts match the queue.
- [ ] Per-class counts match the corresponding priority learners.
- [ ] Leading focus is sensible for each class.
- [ ] Common focus-topic chips show sensible learner/class counts.
- [ ] Analytics period/year/mode/search changes update the overview to the same scope.
- [ ] Queue filters and Show all/top 6 do not restrict the overview to only visible queue rows.

### Existing intervention and assignment workflow

- [ ] Assign Practice from Action Center still works.
- [ ] Shared focus groups still work.
- [ ] Review Practice still opens the intended existing assignment.
- [ ] Manual selected-students Practice assignment still creates normally.
- [ ] Targeted Practice starts and grades normally.
- [ ] Ending assigned Practice early remains In progress.
- [ ] Completing the target marks the assignment Completed.
- [ ] Practice AI Learning Help remains available.

### Teacher/admin smoke checks

- [ ] Results loads normally.
- [ ] Classes & Assignments loads normally.
- [ ] Exam Settings loads normally.
- [ ] Review Queue loads normally.
- [ ] Question Bank loads normally.
- [ ] Exam Mode / Exam Assignments remain AI-free.

### Presentation

- [ ] Narrow/mobile-width smoke check passes.
- [ ] Dark Mode smoke check passes.

## Release result

**PENDING — do not merge the V4.7 RC until the final regression passes.**

After validation, record:

- final tested V4.7 RC commit;
- stable V4.7 application release merge;
- final frozen repository/docs commit.

## Rollback

For presentation-only RC rollback, restore the tested V4.7C application baseline:

`2d13e9e6b80776fdfc9655779bb64d9a7f3da4e4`

For full V4.7 feature rollback, restore the frozen V4.6 repository/docs baseline:

`b1f38a842b3d1762de403673f43ea78d8d1d51fa`

V4.7 adds no database migration. Existing V4.3 assignment database objects should remain in place during routine application rollback. Preserve production `config.js`.
