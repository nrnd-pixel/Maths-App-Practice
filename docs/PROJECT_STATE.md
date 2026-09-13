# Maths Practice App — Project State

Last updated: 2026-09-13 (Brunei, UTC+08:00)

This file is the short operational checkpoint for humans and AI assistants. It must be read together with current GitHub state. If GitHub has moved since this file was updated, current repository/PR/CI state is authoritative and this file should be refreshed after the next accepted checkpoint.

## Repository and production

- Repository: `nrnd-pixel/Maths-App-Practice`
- Live site: `https://magical-pixie-a61111.netlify.app`
- Stack: vanilla JavaScript, Supabase/PostgreSQL, Netlify static hosting
- Production release: V5.9
- Verified `main`: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`
- Verified repository Supabase tree SHA: `b59a55911e695465f9fceb3aa55edbd564862ecd`
- Production Supabase V5.4H migration: `20260913091929_v54h_practice_review_safety`
- Historical seal BASE_SHA: `653aec5e06e1bf1669b4c9c0cd3e91069715de45`

## Current focus

Students are actively using the live Maths app for practice. Current development priorities are:

1. production stability and trustworthy CI;
2. question-bank/content integrity;
3. richer question metadata and diagnostics;
4. measured learning improvements before new product breadth;
5. architecture cleanup only after behavioural equivalence is protected.

The accepted V5.9 Student Home is the production baseline. Avoid further cosmetic redesign unless a real student usability problem is demonstrated.

## Recently completed checkpoints

- PR #239 — Phase 5C wrapper-chain Playwright coverage — merged.
- PR #240 — accepted V5.9 Student Home Refresh production promotion — merged.
- PR #242 — V5.9 demo/viewer/student-question routes — merged.
- PR #243 — shared project state, roadmap and AI handoff records — merged.
- PR #244 — V56/V57 Student Home readiness Playwright synchronisation — merged after exact-head Consolidated CI run #285 passed all maintained verifiers, hard gates and core browser tests.
- PR #245 — V5.4H Practice eligibility / review-state hardening — merged after exact-head Consolidated CI run #288 passed all maintained verifiers, named hard gates and the full `npm test` browser suite.

Verified current main after PR #245: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`.

## V5.4H production status

V5.4H is active in the production Maths Supabase project.

Invariant enforced at the database boundary:

> `review_status='needs_review'` must never coexist with `practice_eligible=true`.

Important preserved behaviour:

- `review_status='none'` remains valid for ordinary Practice;
- `review_status='reviewed'` remains valid for ordinary Practice;
- legacy `active` remains an independent exposure domain;
- the guard rejects conflicting transitions rather than silently changing another field;
- no existing question row was changed by the migration.

Production preflight immediately before application found:

- 655 Practice-eligible rows;
- 0 `needs_review` rows;
- 0 conflicting `needs_review + practice_eligible=true` rows;
- the V5.4H guard function/trigger not previously installed.

Post-application verification found the same 655 Practice-eligible rows and 0 conflicts. Trigger `questions_practice_review_safety_v54h` is installed/enabled, and `anon` / `authenticated` cannot directly execute the guard function.

## Current Question Bank Integrity checkpoint

A read-only source + production-data audit has been completed and preserved in:

- `docs/QUESTION_BANK_INTEGRITY_AUDIT.md`
- `docs/MISSING_SKILL_REMEDIATION_MAP.md`
- `docs/PRACTICE_ELIGIBILITY_REVIEW_SAFETY_MAP.md`
- `docs/QUESTION_METADATA_V2_MAP.md`

Key conclusions:

- the current Practice-eligible pool is structurally healthy for marking;
- the V5.4H database invariant now protects unresolved-review content from entering/remaining in ordinary Practice;
- response-type/configuration checks on the live Practice pool found no structural blockers;
- the main live metadata debt is 123 Practice-eligible rows with a missing `skill` field, concentrated in 2013, 2018 and 2019 Paper 1;
- all 123 rows have candidate skill labels in the remediation map; candidates are review evidence only, not production-approved changes;
- diagram/table/context-dependent candidates are Medium confidence and require authoritative source verification before any database write;
- known excluded/problematic Past Paper rows are inactive and ineligible, but their exclusion rationale is not consistently captured in durable review/audit fields;
- Practice eligibility and legacy `active` are intentionally separate exposure domains and must not be collapsed by future QA.

## Question Metadata V2 mapping checkpoint

Metadata V2 source/consumer mapping is complete at the no-write architecture stage.

Important findings:

- legacy `questions.strand/topic/subtopic/skill/difficulty` are active compatibility fields used by current Practice retrieval, mixed-practice selection and historical/teacher analytics;
- `session_answers` snapshots `strand/topic/subtopic/skill`, so historical attempt metadata must not be silently rewritten during Question Bank cleanup;
- production already has a curriculum registry (`curriculum_domains`, `curriculum_skills`, `curriculum_subskills`, `question_skill_map`, `skill_relationships`, `misconceptions`, `scaffolds`);
- the registry contains 297 skills and 752 subskills across Years 1–6, but is still `1.0-draft` and question mapping coverage is small;
- only 21 of 655 Practice questions currently have an active PRIMARY curriculum mapping;
- none of the 123 missing-legacy-skill questions currently have PRIMARY/SECONDARY curriculum mappings;
- the graph already models embedded/secondary skills and prerequisite relationships and should be expanded rather than duplicated in a second skill system;
- a separate per-question demand/evidence profile is the preferred future additive surface for procedural/conceptual/reading/visual/response-demand metadata, subject to explicit schema acceptance;
- authored demand metadata must remain separate from later empirical performance calibration.

See `docs/QUESTION_METADATA_V2_MAP.md` for the proposed staged architecture and non-goals.

## Open / parked work

- PR #237 — V5.9B adaptive diagnostic pilot — DRAFT / PILOT ONLY / DO NOT MERGE without a new explicit acceptance cycle.
- PR #180 — Science V0.2 standalone pilot — PARKED. It was built from an old baseline and must be re-mapped/re-created from then-current main before any renewed work.
- PR #204 and PR #205 — old V5.8.1 demo drafts — superseded by PR #242; do not merge.

## Immediate next engineering action

Remain within Question Metadata V2 evidence preparation. Do **not** create a schema migration yet.

Safest next substantive sequence:

1. define the exact 0–3 Metadata V2 demand rubric with concrete Year 6 examples and clear boundaries between levels;
2. test inter-reviewer consistency on a small already-mapped 2025 Paper 1/2 sample before scaling the rubric;
3. continue authoritative source verification of Medium-confidence 2013/2018/2019 Paper 1 missing-skill candidates;
4. map verified legacy skill candidates to exactly one PRIMARY curriculum skill plus genuine SECONDARY embedded skills;
5. prepare immutable-question-ID change sets, but make no production metadata write without a separate accepted data-change plan;
6. only after rubric/mapping evidence is stable should an additive demand-profile schema PR be proposed;
7. keep V5.9B adaptive expansion isolated until reusable metadata/adaptive-readiness rules are accepted.

Do not bulk-fill the 123 missing skills from topic labels alone.

## Security advisor watchlist

A post-V5.4H Supabase security-advisor scan did not flag the new guard function. It did report broader pre-existing warnings, including SECURITY DEFINER RPC exposure, RLS-enabled tables without policies, and leaked-password protection being disabled.

Do not mass-revoke or rewrite these items. Several student RPCs intentionally use token-based access and some RLS/no-policy tables may intentionally be service/RPC-only. Any security follow-up must start with a separate architecture/usage map and equivalence tests.

## Frozen / high-risk files

Do not modify without an explicit map, equivalence coverage, seal review and user acceptance:

- `site/v40-student-session.js`
- `site/v40-platform-polish.js`
- `site/v40-release.js`
- `site/v40-start-shell.js`
- `site/v41-signin-guard.js`
- `site/v51-exam-publication-safety.js`
- `site/v50-security-hardening.js`
- `site/v52b1-question-bank-observer-gate.js`
- `site/v581a-practice-cloud-result-reconciliation.js`
- all Supabase SQL files

## Seal architecture

Option 2A / 2B / 2C Playwright specs protect the frozen site boundary and authorised Supabase successors.

Never alter seal logic merely to make CI pass. First establish why bytes/tree hashes changed and whether the successor is authorised.

## CI expectations

A production-facing change is not accepted on local/static evidence alone.

Required standard:

- maintained static verifiers under `site/tests/*.cjs`;
- named Playwright hard gates;
- full `npm test` browser suite;
- exact PR-head CI inspection;
- no test weakening to achieve green;
- merge only after explicit user instruction.

## Branching / merge rules

- Always branch from the exact verified current `main` SHA.
- Never commit directly to `main`.
- Map actual source and ownership before coding.
- Keep changes small and reversible.
- Flag usage-heavy actions before running them.
- Never merge without the user's explicit merge instruction.

## Shared AI workflow

At the start of a new session, read:

1. `docs/AI_HANDOFF.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ROADMAP.md`
4. `docs/DECISIONS.md`
5. `docs/KNOWN_ISSUES.md`
6. `docs/QUESTION_BANK_INTEGRITY_AUDIT.md` while Question Bank Integrity / Metadata V2 work is active
7. `docs/MISSING_SKILL_REMEDIATION_MAP.md` while missing-skill remediation is active
8. `docs/PRACTICE_ELIGIBILITY_REVIEW_SAFETY_MAP.md` for the V5.4H rationale and implementation checkpoint
9. `docs/QUESTION_METADATA_V2_MAP.md` while Metadata V2 work is active

Then verify current GitHub `main`, open PRs and relevant CI directly before acting.
