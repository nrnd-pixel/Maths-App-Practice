# Maths Practice App — Project State

Last updated: 2026-09-13 (Brunei, UTC+08:00)

This file is the short operational checkpoint for humans and AI assistants. Read it together with current GitHub/Supabase state. If GitHub or production has moved, live state is authoritative.

## Repository and production

- Repository: `nrnd-pixel/Maths-App-Practice`
- Live site: `https://magical-pixie-a61111.netlify.app`
- Stack: vanilla JavaScript, Supabase/PostgreSQL, Netlify static hosting
- Production release: V5.9
- Verified `main`: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`
- Latest merged PR: #245 — V5.4H Practice eligibility / review-state hardening
- Verified repository Supabase tree SHA: `b59a55911e695465f9fceb3aa55edbd564862ecd`
- Production Supabase V5.4H migration: `20260913091929_v54h_practice_review_safety`
- Historical seal BASE_SHA: `653aec5e06e1bf1669b4c9c0cd3e91069715de45`

Active documentation/evidence branch:

`docs/question-bank-integrity-v54h-checkpoint`

This branch contains Question Bank Integrity, Metadata V2 calibration and schema-design evidence. It is not production `main`.

## Current focus

Students are actively using the live Maths app. Current development priorities remain:

1. production stability and trustworthy CI;
2. Question Bank/content integrity;
3. richer reviewed question metadata and diagnostics;
4. measured learning improvements before product breadth;
5. architecture cleanup only with behavioural equivalence coverage.

The accepted V5.9 Student Home is the production baseline. Avoid cosmetic churn without a demonstrated student usability problem.

## Recently completed repository checkpoints

- PR #239 — Phase 5C wrapper-chain Playwright coverage — merged.
- PR #240 — V5.9 Student Home Refresh — merged.
- PR #241 — Phase 5C named CI hard gate — merged.
- PR #242 — V5.9 demo/viewer/student-question routes — merged.
- PR #243 — shared project state / roadmap / handoff records — merged.
- PR #244 — V56/V57 Student Home readiness Playwright synchronisation — merged after green exact-head CI.
- PR #245 — V5.4H Practice eligibility / review-state hardening — merged after green exact-head CI.

Verified current main remains:

`8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

## V5.4H production invariant

Production enforces:

> `review_status='needs_review'` must never coexist with `practice_eligible=true`.

Preserved behaviour:

- `review_status='none'` and `reviewed` remain valid for ordinary Practice;
- `active` remains a separate exposure domain;
- conflicts are rejected rather than silently mutating another field;
- the migration changed no existing question rows.

Current review conflicts remain zero.

## Question Bank Integrity — legacy skill remediation

The original integrity audit found **123** Practice-eligible questions with blank legacy `questions.skill`, concentrated in older Paper 1 material.

Three conservative production repair batches have now completed.

### Batch 1 — completed

- 8 high-confidence 2013 Paper 1 rows repaired.
- Blank Practice skills: **123 → 115**.
- Historical attempt snapshots preserved.

Result record:

`docs/MISSING_SKILL_BATCH1_RESULT.md`

### Batch 2 — completed

- 8 high-confidence 2018/2019 Paper 1 rows repaired.
- Blank Practice skills: **115 → 107**.
- Historical attempt snapshots preserved.

Result record:

`docs/MISSING_SKILL_BATCH2_RESULT.md`

### Batch 3 — completed

Issue #251 is closed as completed.

Exactly 6 additional high-confidence 2018/2019 Paper 1 `skill` values were repaired in one guarded production transaction.

Post-write verification:

- total questions: **1003** — unchanged;
- Practice-eligible questions: **655** — unchanged;
- blank Practice skills: **107 → 101**;
- correct target skills: **6/6**;
- safe target state: **6/6**;
- exactly 6 `question_change_history` entries, all `skill`-only;
- 2018 P1 Q11 historical blank skill snapshot preserved;
- review conflicts: 0;
- inactive-but-Practice-eligible: 0;
- invalid Practice marks: 0;
- missing Practice text/topic/strand/answer: 0;
- unknown non-null Practice response types: 0.

Result record:

`docs/MISSING_SKILL_BATCH3_RESULT.md`

Across Batches 1–3, **22** high-confidence legacy skill rows have been repaired, reducing blank Practice skills from **123 to 101**.

Do not bulk-fill the remaining 101 rows. Source/visual-dependent candidates remain HOLD until authoritative evidence is available.

## Metadata V2 — architecture checkpoint

The existing curriculum registry must be reused rather than duplicated:

- `curriculum_domains`
- `curriculum_skills`
- `curriculum_subskills`
- `question_skill_map`
- `skill_relationships`
- `misconceptions`
- `scaffolds`
- related heuristic tables

Important compatibility conclusions:

- legacy `questions.strand/topic/subtopic/skill/difficulty` remain active runtime/reporting fields;
- `session_answers` snapshots legacy metadata and historical snapshots must not be rewritten;
- `question_skill_map` is the structured skill layer;
- one active PRIMARY mapping per question is already protected by `question_skill_map_one_active_primary_idx`;
- PRIMARY/SECONDARY skill lists and prerequisite relationships should be derived from the existing graph rather than duplicated into new `questions` columns;
- sparse `question_skill_map.cognitive_level`, `question_purpose` and edge-level `difficulty` are not the canonical V2 demand model;
- current production function inspection found no function reading those sparse fields.

Architecture map:

`docs/QUESTION_METADATA_V2_MAP.md`

## Metadata V2 — demand rubric calibration COMPLETE

Issue #246 — independent Reviewer-B calibration — is closed as completed.

The blind-review sequence was preserved:

1. Reviewer B read only `QUESTION_METADATA_V2_REVIEWER_B_PACKET.md`;
2. all eight questions were scored independently;
3. the result was frozen in `QUESTION_METADATA_V2_REVIEWER_B_RESULT.md` at commit `2e0739576a0035d5c9bde67daa495a91a73341cb`;
4. only afterward were Reviewer-A ratings/reconciliation opened;
5. reconciliation was committed in `QUESTION_METADATA_V2_RECONCILIATION.md`.

Calibration result across 8 questions × 5 dimensions = 40 scores:

- exact agreements: **37/40 (92.5%)**;
- adjacent one-level differences: **3/40 (7.5%)**;
- disagreements >1 level: **0**;
- unresolved HOLDs in the core eight: **0**.

The three adjacent differences were resolved using existing full-rubric boundaries. No rubric wording change was required.

Optional 2025 Paper 2 Q30 remains deliberately conservative:

- procedural: HOLD;
- conceptual: HOLD;
- reading/context: 3;
- visual/spatial: HOLD;
- response: 0;

until authoritative Table 2 evidence is available.

The Metadata V2 calibration gate therefore **passes for schema design only**.

## Metadata V2 — schema design proposal

Current open checkpoint:

**Issue #255 — Metadata V2: review additive demand-profile schema design**

Design document:

`docs/QUESTION_METADATA_V2_SCHEMA_DESIGN.md`

Proposed direction:

- additive `question_demand_profile_v2` table;
- one profile per physical `question_id`;
- five calibrated 0–3 typed demand dimensions;
- explicit per-dimension HOLD representation;
- separate `source_evidence_status` and `adaptive_use_status`;
- safe defaults: `draft`, `needs_review`, `hold`;
- database invariant preventing adaptive `eligible` unless profile is reviewed, source verified and contains no held dimensions;
- teacher-only direct RLS using existing `is_teacher()`;
- no anon/student direct table access;
- separate append-only demand-profile audit history;
- no reuse/repurposing of sparse `question_skill_map` demand-like fields;
- `assessment_stage` deferred until separately calibrated.

The design explicitly proposes **no current runtime consumer** and no automatic adaptive-readiness view in the first migration.

## Immediate next action

Remain at **Issue #255 schema technical review**.

Before any DDL:

1. review the proposed table/constraints/RLS/audit design;
2. confirm HOLD representation and adaptive-eligibility invariant;
3. confirm no current runtime/SQL consumer needs modification;
4. confirm the schema-only PR boundary and expected seal/CI impact;
5. only after a separate explicit instruction, create a fresh implementation branch from the exact then-current `main`;
6. schema-only PR must contain no profile data, curriculum-map expansion, runtime JS change or adaptive expansion;
7. full static + named hard gates + `npm test` + exact-head CI required;
8. never merge without explicit instruction.

Passing Issue #255 review would authorize preparation of a **schema-only migration/PR**, not production profile population.

The first data pilot must be a separate checkpoint after schema acceptance. Recommended first data set: the eight source-complete 2025 P1/P2 calibration questions, excluding Q30.

## Open / parked work

- PR #237 — V5.9B adaptive diagnostic pilot — DRAFT / PILOT ONLY / DO NOT MERGE without a new explicit acceptance cycle.
- PR #180 — Science V0.2 standalone pilot — PARKED; old baseline, must be re-mapped/re-created from then-current main.
- PR #204/#205 — superseded by merged PR #242; do not merge.
- Issue #255 — ACTIVE documentation/design checkpoint.

## Security boundary

A previous Supabase advisor scan reported broader pre-existing warnings such as SECURITY DEFINER exposure patterns, RLS/no-policy tables and leaked-password protection being disabled.

Do not mass-revoke or rewrite these. Several RPCs intentionally use token-based access and some RLS/no-policy tables are intentionally service/RPC-only. Any security follow-up requires its own usage/authority map and equivalence tests.

Metadata V2 schema design should reuse the existing teacher predicate:

`public.is_teacher()` → teacher exists in `teacher_profiles` for `auth.uid()`.

The new demand profile should not create a second authorization model.

## Frozen / high-risk files

Do not modify without explicit mapping, equivalence coverage, seal review and user acceptance:

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

Option 2A / 2B / 2C Playwright specs protect frozen site/Supabase boundaries.

A future Metadata V2 schema PR will add a Supabase migration and likely a static verifier, so its exact successor bytes/tree changes must be authorised in the maintained hard gates. Never weaken seal logic merely to pass CI.

## CI and merge rules

For production-facing changes:

- maintained static verifiers under `site/tests/*.cjs`;
- named Playwright hard gates;
- full `npm test` browser suite;
- exact PR-head CI inspection;
- no test weakening;
- merge only after explicit user instruction.

Always branch from exact verified current `main`; never commit production work directly to `main`.

## Shared AI startup order

At a fresh session read:

1. `docs/AI_HANDOFF.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ROADMAP.md`
4. `docs/DECISIONS.md`
5. `docs/KNOWN_ISSUES.md`
6. `docs/QUESTION_BANK_INTEGRITY_AUDIT.md`
7. `docs/MISSING_SKILL_REMEDIATION_MAP.md`
8. `docs/PRACTICE_ELIGIBILITY_REVIEW_SAFETY_MAP.md`
9. `docs/QUESTION_METADATA_V2_MAP.md`
10. `docs/QUESTION_METADATA_V2_RUBRIC.md`
11. `docs/QUESTION_METADATA_V2_REVIEWER_B_RESULT.md`
12. `docs/QUESTION_METADATA_V2_RECONCILIATION.md`
13. `docs/QUESTION_METADATA_V2_SCHEMA_DESIGN.md`

Then verify current GitHub `main`, open PRs/issues and production Supabase state directly before acting.
