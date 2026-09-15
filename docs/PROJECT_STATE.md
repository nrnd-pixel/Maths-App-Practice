# Maths Practice App — Project State

Last updated: 2026-09-16 (Brunei, UTC+08:00)

This file is the short operational checkpoint for humans and AI assistants. Read it together with current GitHub state. If this file and GitHub disagree, current repository/PR/CI state is authoritative.

## Repository and production

- Repository: `nrnd-pixel/Maths-App-Practice`
- Live site: `https://magical-pixie-a61111.netlify.app`
- Stack: vanilla JavaScript, Supabase/PostgreSQL, Netlify static hosting
- Production baseline: V5.9 Student Home / Practice
- Controlled adaptive layer: V5.9B pilot code is now on `main`, but remains dormant without `?adaptivePilot=2` and the server-side pilot allow-list
- Verified `main`: `4e533d96b95ad44386ff132bee16001b1eb54785`
- Verified Supabase tree SHA: `dffaaa1d6991d54e25ab26d6267739f4525327bf`
- Historical seal BASE_SHA: `653aec5e06e1bf1669b4c9c0cd3e91069715de45`

## Current focus

Students are actively using the live Maths app. Priorities remain:

1. production stability and trustworthy CI;
2. question-bank/content integrity;
3. measured adaptive-pilot evidence before any expansion;
4. richer question metadata and learning insight;
5. architecture cleanup only after behavioural equivalence is protected.

The accepted V5.9 Student Home remains the production UX baseline. Avoid cosmetic redesign unless a real student usability problem is demonstrated.

## Adaptive / Metadata V2 checkpoint

Issue #266 Stages 0–3 have now been completed through separate guarded checkpoints.

Repository / server work:
- PR #267 — reconciled the three already-deployed adaptive SQL migrations into repository source — merged.
- PR #268 — added `student_adaptive_question_readiness_v2` as a fail-closed server readiness contract — merged; reviewed SQL was subsequently applied to production.
- PR #272 — hardened `student_adaptive_diagnostic_plan_v1` and `student_adaptive_diagnostic_grade_v1` so both independently enforce readiness V2 — merged; reviewed migration was subsequently applied to production.
- PR #271 — rebuilt the browser adaptive pilot from current main, including real multipart Q9(b) handling — merged.

Production state verified read-only on 2026-09-16:
- Metadata V2 profiles: 41;
- `adaptive_use_status='eligible'`: 2;
- eligible targets: 2025 P1 Q9(b) and 2025 P2 Q4;
- 2025 P2 Q30 remains unprofiled/ineligible and must fail closed;
- adaptive pilot enabled = true;
- `allow_all_students=false`;
- allowed students = 1;
- allowed targets = 3.

Manual deploy-preview smoke testing before PR #271 merge confirmed:
- Q9(b): adaptive offer after authoritative multipart grading; 3-step diagnostic + unscored retry; original Practice result unchanged;
- Q4: adaptive offer after final wrong attempt;
- Q30: ordinary Practice completes with no adaptive offer.

Final exact-head PR #271 checks were green on head `b24c39d6097ed573b28466ba8095c76169d95407`, including Adaptive Browser Pilot V2 Integrity, production-source reconciliation, Consolidated CI #320, all named hard gates and the full core browser suite.

## Open / parked work

- Issue #266 — remains open for controlled pilot evidence and any later design decision. Do not jump directly to Stage 4 demand-aware Mixed Practice.
- PR #237 and PR #209 — stale adaptive pilot drafts superseded by merged PR #271; do not merge. Close as superseded during housekeeping.
- PR #204 and PR #205 — old V5.8.1 demo drafts superseded by merged PR #242; do not merge.
- PR #180 — Science V0.2 standalone pilot — PARKED. Do not resume while the current Maths-first scope is active.

## Immediate next engineering action

Collect controlled V5.9B pilot evidence before broadening access or adding new adaptive selection logic.

Minimum evidence to capture for the existing pilot student and the two eligible targets:
- whether the adaptive offer triggers at the intended point;
- diagnostic step completion/correctness;
- target retry correctness;
- confirmation that ordinary Practice score, XP, mastery and answer history remain unchanged;
- any usability friction or confusing wording;
- network/error recovery if encountered.

Do not infer learning effectiveness from a successful smoke test alone. Stage 4 demand-aware Mixed Practice remains deferred until there is enough pilot evidence and an explicit learning objective/coverage threshold.

In parallel, continue Question Bank Integrity work from `ROADMAP.md`; Q30 remains source-blocked until an authoritative original source page/Table 2 is directly verified.

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

When new `site/` files are added or changed, review and update only as justified:

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
- Flag usage-heavy actions before running them.
- Never merge without the user's explicit merge instruction.

## Shared AI workflow

At the start of a new session, read:
1. `docs/AI_HANDOFF.md`
2. `docs/PROJECT_STATE.md`
3. `docs/ROADMAP.md`
4. `docs/DECISIONS.md`
5. `docs/KNOWN_ISSUES.md`

Then verify current GitHub `main`, open PRs and relevant CI directly before acting.
