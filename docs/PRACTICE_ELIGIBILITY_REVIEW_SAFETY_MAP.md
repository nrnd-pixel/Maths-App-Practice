# Practice Eligibility / Review Safety — V5.4H Outcome

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **implemented, merged and active in production**.

Repository checkpoint: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Production migration: `20260913091929_v54h_practice_review_safety`

## Purpose

This document preserves the architecture rationale and completed implementation checkpoint for the Question Bank Practice-eligibility / review-state safety rule introduced by V5.4H.

The original read-only audit found a latent governance gap: ordinary Practice eligibility and review state were separate authority paths, so a future write could theoretically create a question row that was both Practice-eligible and explicitly unresolved (`needs_review`). Production contained no such row at the time of discovery.

## Accepted invariant

The database now enforces exactly this rule:

> A question row must never be both `practice_eligible=true` and `review_status='needs_review'`.

The following remain valid:

- `review_status='none'` with Practice eligibility;
- `review_status='reviewed'` with Practice eligibility;
- `active=true` or `active=false` independently of the review/Practice rule, subject to the app's other existing authorities.

The guard rejects conflicting writes. It does **not** silently alter `practice_eligible`, `review_status` or `active`.

## Why a Reviewed-only rule was rejected

At the audit checkpoint all 655 Practice-eligible production rows had `review_status='none'` and zero rows had `needs_review`.

Requiring `review_status='reviewed'` before ordinary Practice would therefore have invalidated the entire current Practice pool despite no evidence of a marking defect.

The established Question Bank review workflow already treats only `needs_review` as explicitly unresolved. V5.4H preserves that model.

## Why the invariant is database-level

The relevant pre-V5.4H write paths included:

- V5.4B per-question/logical-group Practice eligibility;
- V5.4E bulk Practice eligibility;
- V5.1B2C review-state updates;
- future database or RPC writers that may touch either field.

Protecting only one browser or RPC path would not cover all transitions. A database trigger is the narrowest authority boundary that protects both directions:

- unresolved content cannot be enabled for Practice;
- a Practice-eligible row cannot later be marked `needs_review` until it is explicitly removed from Practice.

Removing a question from Practice remains allowed.

## Implementation

PR #245 added the additive migration:

`supabase/v54h_practice_review_safety.sql`

The migration:

1. performs a fail-fast preflight for existing conflicts;
2. creates `public.guard_question_practice_review_safety_v54h()`;
3. revokes direct execution from `public`, `anon` and `authenticated`;
4. installs `questions_practice_review_safety_v54h` on `public.questions` before inserts or updates of `practice_eligible` / `review_status`;
5. raises a clear error for the conflicting state;
6. does not update any existing question row.

Historical V54 migrations were not edited.

## Seal and CI treatment

Because all Supabase SQL is frozen/high-risk and the complete `supabase/` tree is byte-sealed, PR #245 advanced the authorised Supabase-tree/successor seals rather than bypassing them.

The maintained V54 integrity verifier was extended to prove the semantic contract. Relevant V50/V51/V52C/V53/V54 protected-SHA gates and Option 2A/2B/2C successor values were updated as required by the existing architecture.

Exact PR head before merge:

`de14c1e1b53dc75f51c940a42873f1924648331b`

Consolidated CI run #288 / run ID `34748477228` completed successfully on that exact head. Maintained static verifiers, Option 2C, Option 2B, V52C, V54, V50, V51, V52B1, Phase 5C and the full `npm test` Playwright suite passed.

## Production preflight

Immediately before applying the migration to the live Maths Supabase project:

- Practice-eligible rows: 655;
- `needs_review` rows: 0;
- conflicting `needs_review + practice_eligible=true` rows: 0;
- V5.4H guard function existed: no;
- V5.4H trigger existed: no.

The migration therefore entered production from a clean state and did not need any data repair.

## Production post-apply verification

After migration registration as `20260913091929_v54h_practice_review_safety`:

- Practice-eligible rows remained 655;
- `needs_review` rows remained 0;
- conflicting rows remained 0;
- trigger `questions_practice_review_safety_v54h` was installed and enabled;
- the trigger fires before insert or update of `practice_eligible` / `review_status`;
- `anon` cannot execute the guard function directly;
- `authenticated` cannot execute the guard function directly.

A post-DDL Supabase security-advisor scan did not flag the V5.4H guard function.

## Product behaviour preserved

V5.4H intentionally does not change:

- ordinary Practice question selection rules beyond blocking explicit unresolved-review conflicts;
- Past Paper Practice partial-paper semantics;
- Exam publication completeness/readiness rules;
- topical-set readiness semantics;
- legacy `active` behaviour;
- browser runtime ownership;
- current question counts or marking configuration.

## Remaining Question Bank work

V5.4H resolves the review/Practice governance gap. It does **not** resolve the broader metadata-quality work.

The next active Question Bank tasks remain:

- source-aware review of the 123 missing `skill` values;
- durable source/audit rationale for historical excluded questions;
- Question Metadata V2 design for embedded/prerequisite skills and cognitive-demand dimensions;
- later controlled reconsideration of V5.9B adaptive diagnostics after metadata quality is trustworthy.

See:

- `docs/QUESTION_BANK_INTEGRITY_AUDIT.md`
- `docs/MISSING_SKILL_REMEDIATION_MAP.md`
- `docs/PROJECT_STATE.md`
- `docs/KNOWN_ISSUES.md`
