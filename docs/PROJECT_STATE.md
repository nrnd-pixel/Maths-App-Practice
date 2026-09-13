# Maths Practice App — Project State

Last updated: 2026-09-13 (Brunei, UTC+08:00)

This file is the short operational checkpoint for humans and AI assistants. It must be read together with current GitHub state. If GitHub has moved since this file was updated, current repository/PR/CI state is authoritative and this file should be refreshed after the next accepted checkpoint.

## Repository and production

- Repository: `nrnd-pixel/Maths-App-Practice`
- Live site: `https://magical-pixie-a61111.netlify.app`
- Stack: vanilla JavaScript, Supabase/PostgreSQL, Netlify static hosting
- Production release: V5.9
- Verified `main`: `7dcd65c9ada0c08bf6b5584fd6b5a86590a9d0ab`
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

PR #242 added isolated `/demo/`, `/viewer-demo/`, and `/demo-student/` routes without changing the normal `/` runtime or Supabase SQL.

## Open / parked work

- PR #237 — V5.9B adaptive diagnostic pilot — DRAFT / PILOT ONLY / DO NOT MERGE without a new explicit acceptance cycle.
- PR #180 — Science V0.2 standalone pilot — PARKED. It was built from an old baseline and must be re-mapped/re-based from current main before any renewed work.
- PR #204 and PR #205 — old V5.8.1 demo drafts — superseded by PR #242; do not merge.

## Immediate next engineering action

Create a tiny standalone housekeeping change for the known V56/V57 Playwright Home-readiness race. The intended fix is test synchronisation against the existing V5.7C readiness contract (`data-v57c-rendered="true"`) before the affected automated Assignments clicks. Do not weaken assertions or increase timeouts merely to hide the race.

After CI reliability is clean, continue with the Question Bank Integrity checkpoint described in `ROADMAP.md`.

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

Then verify current GitHub `main`, open PRs and relevant CI directly before acting.
