# Deploy and Test — Maths Practice V4.6

## Release scope

V4.6 is the **Intervention Records** release. It builds on frozen V4.5 and includes V4.6A Intervention Queue Export plus the final V4.6 release presentation.

## Database state

**V4.6 adds no SQL migration.** Production migration history was re-checked before the RC and still ends at:

- `20260823125429 v43a_individual_practice_assignments`
- `20260823125445 v43a_individual_practice_delete_guard`
- `20260823125602 v43a_teacher_rpc_anon_revoke`
- `20260823134448 v43b_multi_recipient_practice_assignments`

Do not run SQL solely for V4.6 deployment.

## Frozen baselines

- V4.6A tested merge / RC base: `68d96d518466afd8bd2e2afeb494049f077a0df9`
- Final tested V4.6 RC: `b111bcb2fd43238ada7d4bedb74fd7353b98869b`
- Stable V4.6 application release merge: `5260945f240fc4425d42b650e5707d0b0c1c3c6f`
- Frozen V4.5 repository/docs baseline: `ec827bd717eb6c99847124cf1906d42e6ffc1db8`

## Final V4.6 regression — PASSED

The final Netlify Deploy Preview regression passed on the exact RC commit above.

Validated checks:

- [x] Browser title shows `Math Practice V4.6`.
- [x] Start badge shows `Version 4.6 • Intervention Records`.
- [x] One normal student sign-in lands on Home.
- [x] Export queue CSV works for All / Needs assignment / Outstanding / Completed.
- [x] Analytics filter changes are reflected in new exports.
- [x] All matching priority learners are exported, including beyond the visible top six.
- [x] Learner/class/focus/intervention fields match Action Center.
- [x] Completed rows include recorded mastery %, first-try %, question count, hints and completion time.
- [x] No PIN or private result-code column is exported.
- [x] Queue filters, Show all, completed outcome details and Open Results still work.
- [x] Individual Assign Practice, Shared focus groups and Review Practice still work.
- [x] Manual selected-students Practice assignment still creates normally.
- [x] Targeted Practice starts and grades normally.
- [x] Ending assigned Practice early remains In progress.
- [x] Completing the target marks the assignment Completed.
- [x] Practice AI Learning Help remains available.
- [x] Results, Classes & Assignments, Exam Settings, Review Queue and Question Bank load normally.
- [x] Exam Mode / Exam Assignments remain AI-free.
- [x] Mobile/narrow-width and Dark Mode smoke checks pass.

## Release result

**PASSED — V4.6 released.**

Final tested RC commit: `b111bcb2fd43238ada7d4bedb74fd7353b98869b`

Stable V4.6 application release merge: `5260945f240fc4425d42b650e5707d0b0c1c3c6f`

The final frozen repository/docs commit is the `main` head after V4.6 release housekeeping is complete.

## Rollback

For presentation-only rollback, restore the tested V4.6A baseline:

`68d96d518466afd8bd2e2afeb494049f077a0df9`

For full V4.6 feature rollback to frozen V4.5, restore:

`83cac64b08649b0b4d968cfe938508edbfd97eed`

V4.6 adds no database migration. Existing V4.3 assignment database objects should remain in place during routine application rollback. Preserve production `config.js`.
