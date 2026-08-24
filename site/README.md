# Maths Practice V4.4

V4.4 is the **Guided Practice Interventions** release for Maths Practice. It builds on frozen V4.3 and closes the loop between teacher analytics, targeted Practice assignment and intervention follow-through.

The established student learning and security model remains intact:

- Home learning priorities;
- Focus Area Practice and mistake recovery;
- Mastery Progress;
- secure multi-session Practice;
- Practice-only AI Learning Help;
- Exam Mode and Exam Assignments remain AI-free;
- student PIN values are never stored.

## V4.4 release scope

### V4.4A — Action Center → Prefilled Practice Intervention

Priority learner rows in Teacher Action Center now include **Assign Practice**.

The workflow safely resolves the analytics learner back to the real roster record, opens the correct class, selects only that learner, prefills the resolved weak strand/topic where possible and defaults the question target to 5.

Nothing is auto-created: the teacher still reviews the form and presses the existing **Assign Practice** button.

### V4.4B — Shared Focus Group Intervention

Teacher Action Center now identifies **Shared focus groups** when two or more priority learners:

- are active registered learners;
- are in the same class;
- share the same safely resolved strand/topic; and
- have active questions available for that focus area.

The teacher can open one prefilled selected-students assignment for the group instead of repeating the individual workflow learner by learner.

Cross-class learners are never mixed into one selected-students group.

### V4.4C — Intervention Follow-Through

Priority learner rows now show whether matching active targeted Practice already exists:

- **Practice: Not started**;
- **Practice: In progress**; or
- **Practice: Completed**.

For outstanding matching work, **Review Practice** replaces the immediate repeat-assignment action. It opens the correct class and scrolls to the existing assignment section so the teacher can review current work before creating another assignment.

Completed matching work remains visible while still allowing the teacher to assign another intervention when appropriate.

The matching logic respects assignment recipient restrictions and does not create a hard duplicate rule.

## V4.4 intervention model

V4.4 deliberately remains a teacher workflow layer on top of the tested V4.3 assignment model:

- analytics identifies the learner/focus area;
- V4.4A/B prefill the existing V4.3 assignment builder;
- the teacher reviews the audience and settings;
- the established V4.3 teacher-authorized assignment RPC creates the work;
- V4.4C reads existing assignment/recipient/attempt state for follow-through.

No separate V4.4 assignment engine was introduced.

## Security and assessment boundaries

V4.4 preserves these boundaries:

- student PIN is never stored;
- Practice and Exam use separate temporary access tickets;
- Practice grading remains server-authoritative;
- assignment visibility/start/completion remains server-validated;
- answer-release authority remains server-side;
- Practice AI Help continues through the established secure route;
- AI Help remains unavailable in Exam Mode and Exam Assignments;
- teacher assignment creation still uses the tested V4.3 authenticated teacher path;
- V4.4 does not auto-create assignments;
- no V4.4 SQL or schema change is introduced;
- no page-wide recursive `MutationObserver` is introduced.

## V4.4 database changes

**V4.4 adds no database migration.**

Production remains on the tested V4.3 assignment database baseline:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for the V4.4 release.

See `DATABASE-MIGRATIONS-V4.4.txt` for the release database statement.

## Tested V4.4 baselines

- V4.4C Intervention Follow-Through tested merge / RC base: `34a5fdcec6c604f730c2d995df958fbbdc947514`
- V4.4B Shared Focus Group Intervention tested merge: `fcca45f94294ecbed4b4513d583671e5af3be650`
- V4.4A Action Center → Prefilled Practice Intervention tested merge: `9a663a2bf2c569c8d8e43e6a38f31e9617b46cc3`
- Frozen V4.3 application release merge: `7c3520f16ca5faf7e0f62feee7e09f7f10a1bd46`
- Frozen V4.3 repository/docs baseline: `79279dc6bd8b25362375e2be90b3c7860b1b5cc6`

The stable V4.4 application release SHA will be recorded after the final Release Candidate regression passes and is merged.

## Validation status

V4.4A–C were individually tested in Netlify Deploy Previews before merge.

Validated staged behaviour includes:

- Action Center **Assign Practice** opens the correct class and learner;
- resolved focus strand/topic and 5-question target are prefilled where available;
- teacher review/confirmation is still required before assignment creation;
- shared focus groups only combine same-class learners with the same safely resolved focus;
- selected-students group assignments target only the intended learners;
- intervention status shows Not started / In progress / Completed for matching work;
- outstanding matching work offers **Review Practice** instead of encouraging an immediate duplicate;
- Review Practice navigates to the correct class and scrolls to the intended existing assignment section;
- V4.3 manual assignment creation remains unchanged;
- narrow/mobile workflow checks pass.

The final V4.4 Release Candidate uses `DEPLOY-AND-TEST-V4.4.md` for the one-pass release regression.

## Key V4.4 files

- `v44-action-center-practice.js` — individual Action Center intervention handoff.
- `v44-shared-focus-groups.js` — same-class shared-focus grouping and prefill.
- `v44-intervention-follow-through.js` — matching assignment status and Review Practice workflow.
- `v44-intervention-highlight-clarity.js` — visual clarity for the reviewed matching assignment.
- `v40-release.js` — visible V4.4 release presentation and ordered module loader.
- `DEPLOY-AND-TEST-V4.4.md` — V4.4 release/regression checklist.
- `DATABASE-MIGRATIONS-V4.4.txt` — V4.4 database-change statement.

## Release discipline

After the final Release Candidate passes and the freeze documentation is complete, treat V4.4 as the production baseline. New product features should then begin from the resulting clean `main` state on the next version branch.

For a routine application rollback, leave the additive V4.3 assignment database objects in place unless a separate deliberate database migration with backup/data-preservation planning is approved.
