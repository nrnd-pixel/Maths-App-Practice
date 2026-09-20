# Maths Practice App — Project State

Last updated: 2026-09-20 (Brunei, UTC+08:00)

This file is the short operational checkpoint for humans and AI assistants. Read it together with current GitHub state. If this file and GitHub disagree, current repository/PR/CI state is authoritative.

## Repository and production

- Repository: `nrnd-pixel/Maths-App-Practice`
- Live site: `https://magical-pixie-a61111.netlify.app`
- Stack: vanilla JavaScript, Supabase/PostgreSQL, Netlify static hosting
- Production baseline: V5.9 Student Home / Practice
- Controlled adaptive layer: V5.9B pilot code is now on `main`, but remains dormant without `?adaptivePilot=2` and the server-side pilot allow-list
- Verified `main`: `668f97d0ae36624b877a80f5091af31a821b1f83`
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

Issue #266 Stages 0–3 plus the Stage 3E telemetry and Stage 3F-A operator-validation checkpoints have now been completed through separate guarded steps. Stage 3F-B real-student usability validation remains deferred pending student availability.

Repository / server work:
- PR #267 — reconciled the three already-deployed adaptive SQL migrations into repository source — merged.
- PR #268 — added `student_adaptive_question_readiness_v2` as a fail-closed server readiness contract — merged; reviewed SQL was subsequently applied to production.
- PR #272 — hardened `student_adaptive_diagnostic_plan_v1` and `student_adaptive_diagnostic_grade_v1` so both independently enforce readiness V2 — merged; reviewed migration was subsequently applied to production.
- PR #271 — rebuilt the browser adaptive pilot from current main, including real multipart Q9(b) handling — merged.

Production resting state re-verified read-only on 2026-09-20:
- Metadata V2 profiles: 41;
- `adaptive_use_status='eligible'`: 2;
- eligible targets: 2025 P1 Q9(b) and 2025 P2 Q4;
- 2025 P2 Q30 remains unprofiled/ineligible, is outside the current pilot target allow-list, and must fail closed;
- adaptive pilot enabled = true;
- `allow_all_students=false`;
- allowed students = 1;
- allowed targets = 2: 2025 P1 Q9(b) and 2025 P2 Q4.

Manual deploy-preview smoke testing before PR #271 merge confirmed:
- Q9(b): adaptive offer after authoritative multipart grading; 3-step diagnostic + unscored retry; original Practice result unchanged;
- Q4: adaptive offer after final wrong attempt;
- Q30: ordinary Practice completes with no adaptive offer.

Final exact-head PR #271 checks were green on head `b24c39d6097ed573b28466ba8095c76169d95407`, including Adaptive Browser Pilot V2 Integrity, production-source reconciliation, Consolidated CI #320, all named hard gates and the full core browser suite.

## Architecture checkpoint — Phases 7B–7D

The architecture-modernisation sequence has reached an accepted safe stopping boundary.

- **Phase 7B — module bundling / build-system mapping:** Issue #291 is closed as completed. Shadow/generated tooling and equivalence work established safe compatibility boundaries without forcing a production framework or loader rewrite.
- **Phase 7C — V52B1 observer-gate replacement:** Issue #302 is closed as completed. The active global MutationObserver interception was replaced by explicit Question Bank lifecycle/refresh ownership while preserving native unrelated observers and the maintained hard gates.
- **Phase 7D — frozen nested loader decision:** Issue #315 is closed as completed. PR #319 merged the decision checkpoint: retain the current exact `config.js` → `v40-release.js` nested loader. The Phase 7D-C flat-loader prototype remains dormant tooling/evidence only; no production loader successor is authorised.

Reopen the frozen loader boundary only for a reproducible loader defect or a future architecture change with material payoff beyond the demonstrated one-request ceiling.

## Open / parked work

- Issue #266 — the only remaining open Maths issue. It remains intentionally open for controlled pilot evidence and any later evidence-backed adaptive design decision. Do not jump directly to Stage 4 demand-aware Mixed Practice.
- PR #180 — Science V0.2 standalone pilot — the only remaining open PR and PARKED. Do not resume while the current Maths-first scope is active.
- Superseded adaptive/demo drafts #237, #204 and #205 are closed and must not be revived as implementation baselines.

## Immediate next engineering action

There is no justified architecture implementation immediately after Phase 7D. The next Maths-first work is evidence/content driven:

1. collect controlled V5.9B pilot evidence before broadening access or adding adaptive selection logic;
2. continue Question Bank Integrity / Metadata V2 work only from verified source evidence;
3. keep 2025 P2 Q30 unprofiled/ineligible until the authoritative original source page/Table 2 is directly verified;
4. prefer small maintenance fixes tied to demonstrated student/teacher friction over speculative architecture churn.

Minimum pilot evidence remains: trigger timing, diagnostic completion/correctness, target retry result, confirmation that ordinary Practice score/XP/mastery/history are unchanged, usability friction, and network/error recovery if encountered.

Stage 4 demand-aware Mixed Practice remains deferred until there is enough evidence plus an explicit learning objective and coverage threshold.

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
