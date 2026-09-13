# Maths Practice App — Project State

Last updated: 2026-09-13 (Brunei, UTC+08:00)

This file is the short operational checkpoint for humans and AI assistants. It must be read together with current GitHub state. If GitHub has moved since this file was updated, current repository/PR/CI state is authoritative and this file should be refreshed after the next accepted checkpoint.

## Repository and production

- Repository: `nrnd-pixel/Maths-App-Practice`
- Live site: `https://magical-pixie-a61111.netlify.app`
- Stack: vanilla JavaScript, Supabase/PostgreSQL, Netlify static hosting
- Production release: V5.9
- Verified `main`: `6f230b33700199a081d65c8465de4a0bd559d218`
- Verified Supabase tree SHA: `4e4f573f452e6d9ab628b163329fea356bcb16e9`
- Historical seal BASE_SHA: `653aec5e06e1bf1669b4c9c0cd3e91069715de45`

## Current focus

Students are actively using the live Maths app for practice. Current development priorities are therefore:

1. production stability and trustworthy CI;
2. question-bank/content integrity;
3. richer question metadata and diagnostics;
4. measured learning improvements before new product breadth;
5. architecture cleanup only after behavioural equivalence is protected.

The accepted V5.9 Student Home is now the production baseline. Avoid further cosmetic redesign unless a real student usability problem is demonstrated.

## Recently completed checkpoints

- PR #239 — Phase 5C wrapper-chain Playwright coverage — merged.
- PR #240 — accepted V5.9 Student Home Refresh production promotion — merged.
- PR #242 — V5.9 demo/viewer/student-question routes — merged.
- PR #243 — shared project state, roadmap and AI handoff records — merged.
- PR #244 — V56/V57 Student Home readiness Playwright synchronisation — merged after exact-head Consolidated CI run #285 passed all maintained verifiers, hard gates and core browser tests.

PR #244 was test-only and did not change production runtime behavior.

## Current Question Bank Integrity checkpoint

A read-only source + production-data audit has been completed from verified `main` `6f230b33700199a081d65c8465de4a0bd559d218`.

Durable findings are recorded in:

- `docs/QUESTION_BANK_INTEGRITY_AUDIT.md`
- `docs/MISSING_SKILL_REMEDIATION_MAP.md`

Key conclusions:

- the current Practice-eligible pool is structurally healthy for marking;
- no unresolved-review or inactive rows are currently entering ordinary Practice;
- response-type/configuration checks on the live Practice pool found no structural blockers;
- the main live metadata debt is 123 Practice-eligible rows with a missing `skill` field, concentrated in 2013, 2018 and 2019 Paper 1;
- all 123 missing-skill rows now have candidate skill labels in the remediation map, derived from stored source question text/answer structure and the existing skill vocabulary; these are review candidates only, not production-approved changes;
- diagram/table/context-dependent candidates are explicitly marked Medium confidence and require original-source verification before any database write;
- known excluded/problematic Past Paper rows are inactive and ineligible, but their exclusion rationale is not consistently captured in review/audit fields;
- Practice eligibility and legacy `active` are intentionally separate exposure domains and must not be collapsed by future QA;
- the existing Question Bank QA runtime is inside the sealed/frozen site boundary, so direct enhancement requires an explicit successor/seal plan rather than an opportunistic patch.

## Open / parked work

- PR #237 — V5.9B adaptive diagnostic pilot — DRAFT / PILOT ONLY / DO NOT MERGE without a new explicit acceptance cycle.
- PR #180 — Science V0.2 standalone pilot — PARKED. It was built from an old baseline and must be re-mapped/re-based from current main before any renewed work.
- PR #204 and PR #205 — old V5.8.1 demo drafts — superseded by PR #242; do not merge.

## Immediate next engineering action

Remain within Question Bank Integrity before moving to Question Metadata V2.

Safest next substantive step:

1. verify every Medium-confidence missing-skill candidate against the original paper image/PDF/source;
2. spot-check High-confidence multipart and visually dependent rows;
3. prepare an explicit reviewed change set keyed by immutable question `id`, but make no production write until a separate data-change plan is accepted;
4. define the future integrity guard contract, including the distinction between hard blockers and warnings;
5. only then decide whether an authorised successor to the existing QA owner or a separate maintained integrity surface is justified.

Do not modify frozen Supabase SQL or `site/question-bank-selection-qa.js` during the initial remediation review.

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

Option 2A / 2B / 2C Playwright specs protect the frozen site boundary.

When new `site/` files are added, review and update only as justified:

- Option 2A: `ALLOWED_SITE_CHANGES`
- Option 2B: `AUTHORIZED_SUCCESSOR_SEAL_CHANGES`
- Option 2C: `AUTHORIZED_SITE_SUCCESSORS`
- relevant `EXPECTED_FROZEN_SITE_SHA256` values

Never alter seal logic merely to make CI pass. First establish why the bytes changed and whether the successor is authorised.

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
- Flag usage-heavy actions (for example full CI reruns) before running them.
- Never merge without the user's explicit merge instruction.

## Shared AI workflow

This repository is the cross-assistant memory shared between ChatGPT, Claude and future tools. At the start of a new session, read:

1. `docs/AI_HANDOFF.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ROADMAP.md`
4. `docs/DECISIONS.md`
5. `docs/KNOWN_ISSUES.md`
6. `docs/QUESTION_BANK_INTEGRITY_AUDIT.md` while Question Bank Integrity / Metadata V2 work is active
7. `docs/MISSING_SKILL_REMEDIATION_MAP.md` while missing-skill remediation is active

Then verify current GitHub `main`, open PRs and relevant CI directly before acting.
