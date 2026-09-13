# Practice Eligibility / Review Safety — Architecture Map

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **map-only / no runtime or database change**.

Repository baseline: `6f230b33700199a081d65c8465de4a0bd559d218`

## Purpose

This document maps a latent Question Bank integrity gap found during the production Question Bank audit. It defines the smallest safety invariant that would prevent explicitly unresolved content from entering or remaining in ordinary Practice without changing the accepted separation between `active` and `practice_eligible`.

No Supabase function, table constraint, trigger, question row or browser runtime was changed as part of this map.

## Current production state

At this checkpoint the production Question Bank is internally consistent:

- 1,003 total question rows;
- 655 rows are `practice_eligible=true`;
- all 655 Practice-eligible rows are also `active=true`;
- all 655 Practice-eligible rows currently have `review_status='none'`;
- zero rows have `review_status='needs_review'`;
- zero rows have `needs_review + practice_eligible=true`.

Therefore this is a **preventive governance hardening**, not a current student incident.

## Important conclusion: `reviewed` must NOT be required for ordinary Practice

The established review states are `none`, `needs_review` and `reviewed`. V5.1B2C treats only `needs_review` as unresolved; it does not require every historical question to be explicitly `reviewed` before legacy activation.

Production confirms why this matters: every one of the 655 currently Practice-eligible rows has `review_status='none'`.

A policy such as `practice_eligible=true requires review_status='reviewed'` would reject the entire current Practice pool and would be incompatible with the accepted historical-content workflow.

The appropriate review-state safety invariant is narrower:

> A question row must never be both `practice_eligible=true` and `review_status='needs_review'`.

Both `review_status='none'` and `review_status='reviewed'` may coexist with Practice eligibility.

## Current authority paths

### V5.4B — per-question / logical-group Practice eligibility

Browser owner: `site/resource-bank-ui.js`

Server writer: `public.save_question_practice_eligibility_v54b(uuid, boolean)` from `supabase/v54b_teacher_practice_eligibility_controls.sql`.

Existing protections:

- teacher-only;
- rejects topical per-question management;
- resolves the accepted V5.3D1 logical key;
- updates every physical row of a multipart logical question together;
- changes only `practice_eligible` / `updated_at`;
- leaves `active` unchanged;
- question change history captures successful eligibility changes.

Missing protection: when enabling, it does not inspect `review_status` before setting the resolved logical group `practice_eligible=true`.

### V5.4E — bulk Practice eligibility

Browser owner: `site/resource-bank-bulk.js`

Server writer: `public.save_questions_practice_eligibility_v54e(uuid[], boolean)` from `supabase/v54e_bulk_practice_eligibility_controls.sql`.

Existing protections:

- teacher-only;
- deduplicates requested IDs;
- maximum 500 requested rows;
- rejects topical selections;
- expands selected logical groups atomically;
- changes only `practice_eligible` / `updated_at`;
- leaves `active` unchanged.

Missing protection: when enabling, it does not inspect unresolved review state in any selected or expanded logical row.

### V5.1B2C — review-state writer

Browser owner: `site/question-bank-metadata-review.js`.

Current browser rule:

- marking `needs_review` requires `active=false`;
- a review note is required;
- unresolved `needs_review` blocks legacy activation.

Important gap: the review workflow does not use `practice_eligible` as a blocker.

Because `active` and `practice_eligible` are deliberately independent, protecting only the V54B/V54E enabling RPCs would not cover every transition. A row could theoretically already be Practice-eligible and later move to `needs_review` through another write path if it first became inactive while eligibility remained unchanged.

## Existing database protections do not enforce the invariant

Current `questions` constraints cover field domains including difficulty, exam year, marks, response type, review-status enum, source type, strand and year level.

Current non-internal `questions` triggers are:

- `questions_change_history_v51b2d`;
- `questions_published_exam_integrity_v51b3`;
- `questions_set_updated_at`.

There is currently no table constraint or trigger preventing `review_status='needs_review'` from coexisting with `practice_eligible=true`.

## Accepted precedent: Exam publication safety

V5.1B3 Exam publication safety uses server-authoritative readiness and a database integrity trigger. At the review layer it counts only `review_status='needs_review'` as unresolved. `review_status='none'` is not rejected merely because it lacks an explicit `reviewed` label.

Exam readiness also validates complete-paper requirements such as 40/30 logical questions, 90 marks, metadata, images and multipart completeness. Those full-paper requirements should **not** be copied wholesale into ordinary Practice because Practice intentionally supports partial paper subsets and other sources.

## Accepted precedent: Topical Practice eligibility

V5.3A's topical set writer calls `topical_exercise_readiness_v52c` before enabling a whole topical set. That is a useful server-authority pattern, but its exact metadata requirements should not be reused as an ordinary-Practice hard gate.

In particular, 123 current Practice-eligible historical Paper 1 rows have blank `skill` but passed the structural marking audit. Missing skill is a diagnostics/metadata-remediation issue, not evidence that those questions are unmarkable.

## Recommended minimal invariant

The first hardening should enforce exactly this cross-field relationship at the database boundary:

- `review_status='needs_review'` => `practice_eligible=false`;
- enabling Practice must fail if any affected physical row of the logical question is `needs_review`;
- marking an already Practice-eligible row `needs_review` must fail until that logical question is removed from Practice;
- setting/removing Practice eligibility to `false` must always remain allowed;
- `review_status='none'` remains eligible;
- `review_status='reviewed'` remains eligible;
- no existing row is automatically deactivated or de-eligible as part of the migration;
- `active` remains independent and unchanged;
- topical set semantics remain unchanged.

A database-level invariant is preferable to patching only individual RPCs because it covers all current and future write paths.

## Preferred implementation shape — subject to explicit approval

Because Supabase SQL and its seals are high-risk, implementation must be a separate checkpoint.

1. Add a new **additive migration** rather than editing historical V54 migrations.
2. Preflight production and prove zero existing violations before applying it.
3. Add a database-enforced invariant with a clear actionable failure message such as removing the logical question from Practice before marking it Needs Review.
4. Preserve disabling/removal paths unconditionally.
5. Avoid changing browser owners unless usability evidence requires a preflight message; server/database remains authority.
6. Reuse the existing V54 integrity/protected-SHA verifier surfaces rather than creating a new `site/tests` file unless a separate verifier becomes necessary.
7. Run all maintained static verifiers, named Playwright hard gates and the full browser suite.
8. Inspect exact PR-head CI and never merge without explicit user approval.

## Why not silently auto-remove from Practice?

A trigger that silently changes `practice_eligible` when a teacher marks `needs_review` would mutate a second exposure domain as a side effect. That weakens auditability and conflicts with the app's deliberate separation of active, review state and Practice eligibility.

The safer behavior is to reject the conflicting transition and tell the teacher which explicit action is required.

## Required adversarial tests before acceptance

A future implementation should prove at least:

1. A non-topical single question with `review_status='needs_review'` cannot transition `practice_eligible false -> true`.
2. A multipart logical group cannot be enabled when **any** physical row is `needs_review`.
3. V54E bulk enable remains atomic: one unresolved logical question blocks the entire requested enable operation before any write.
4. Removing Practice eligibility (`true -> false`) succeeds even for an unresolved-review row.
5. A Practice-eligible row cannot transition to `needs_review` while it remains eligible.
6. `review_status='none'` remains valid for Practice eligibility.
7. `review_status='reviewed'` remains valid for Practice eligibility.
8. `active` remains independent and unchanged.
9. Topical whole-set eligibility remains unchanged.
10. Question change history still captures successful explicit state changes.
11. Existing 655 Practice-eligible production rows remain valid under the invariant.
12. No existing question row is changed by applying the migration itself.

## Exact seal / CI impact mapped at this checkpoint

An additive Supabase migration changes the complete `supabase/` Git tree. The current tree is pinned by all of these maintained hard gates:

- `site/tests/verify-phase4-v50-operations-reporting-protected-sha.cjs`;
- `site/tests/verify-phase4-v51-question-bank-management-protected-sha.cjs` plus `site/tests/v51-phase4-protected-shas.json`;
- `site/tests/verify-phase4-v52c-legacy-student-route-protected-sha.cjs`;
- `site/tests/verify-phase4-v53-practice-selection-protected-sha.cjs`;
- `site/tests/verify-phase4-v53-ui-resource-companion-protected-sha.cjs`;
- `site/tests/verify-phase4-v54-resource-bank-protected-sha.cjs`.

Historical V54 migration files are individually pinned and should remain byte-identical. The new migration should therefore be additive, not an edit to V54B/V54E SQL history.

The Option 2 seal also participates:

- Option 2A currently pins the current Supabase tree/hash and would need the authorised successor values updated;
- Option 2B has `AUTHORIZED_SUPABASE_SUCCESSORS` and would need the new migration explicitly authorised;
- Option 2C also has `AUTHORIZED_SUPABASE_SUCCESSORS` and would need the new migration explicitly authorised.

For semantic verification, the preferred existing target is `site/tests/verify-phase4-v54-resource-bank-integrity.cjs`, which already owns the consolidated V54 integrity contract and invokes the V54 protected-SHA guard. Reusing this maintained surface avoids adding an unnecessary new verifier path and CI allow-list entry, though its successor SHA must still be updated where the Option 2C seal pins that test file.

The existing `e2e/tests/v54-resource-bank-phase4-checkpoint1.spec.cjs` should remain the primary browser equivalence gate. A database-only invariant should not require inventing new client behavior merely to create a Playwright assertion.

## Decision boundary

Do **not** implement this hardening merely because the latent gap exists. Current production contains no conflicting rows.

The next production-affecting step requires explicit approval for a small Practice eligibility/review-safety hardening PR. Until then, this document is the authoritative map and the live Question Bank remains unchanged.
