# Maths Practice App — AI Handoff Protocol

Last updated: 2026-09-13

Use this file whenever work moves between ChatGPT, Claude or another AI assistant. The repository is the shared memory; no assistant should rely only on its own previous chat history.

## Mandatory startup sequence

Before proposing or making changes:

1. Read `docs/PROJECT_STATE.md`.
2. Read `docs/ROADMAP.md`.
3. Read `docs/DECISIONS.md`.
4. Read `docs/KNOWN_ISSUES.md`.
5. Verify current GitHub `main` directly.
6. Verify relevant open PRs and exact-head CI directly.
7. Read the actual source files involved before coding.

If the documentation and current GitHub state disagree, current repository/PR/CI state wins. Update the documentation after the next accepted checkpoint.

## Engineering rules

- Repository: `nrnd-pixel/Maths-App-Practice`
- Live: `https://magical-pixie-a61111.netlify.app`
- Stack: vanilla JS, Supabase/PostgreSQL, Netlify static
- Never commit directly to `main`.
- Always branch from the exact verified current `main` SHA.
- Map ownership/impact before code.
- Keep changes small and reversible.
- Never weaken tests to make CI pass.
- Maintain static verifiers and Playwright hard gates.
- Inspect exact PR-head CI before recommending merge.
- Never merge without the user's explicit instruction.
- Flag usage-heavy actions before running them.
- Treat frozen files and all Supabase SQL as high risk.

## Frozen / high-risk files

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

## Current product principle

Students are actively using the Maths app. Prioritise reliability, content integrity and measurable learning improvement over new breadth or cosmetic redesign.

## Handoff output expected from an assistant

At the end of substantial work, leave a concise checkpoint containing:

- verified base/main SHA;
- branch name;
- PR number/head SHA if applicable;
- files changed;
- tests/verifiers run;
- exact CI status/run number;
- known unresolved issues;
- whether anything was merged;
- next recommended action.

For a major accepted/merged checkpoint, update the shared docs on a separate safe documentation change if the current PR should remain narrowly scoped.

## Copy-paste startup prompt — generic

Use this with either ChatGPT or Claude:

> Continue the Maths Practice App project from the repository source of truth. Repository: `nrnd-pixel/Maths-App-Practice`; live: `https://magical-pixie-a61111.netlify.app`. Before doing any work, read `docs/AI_HANDOFF.md`, `docs/PROJECT_STATE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`, and `docs/KNOWN_ISSUES.md` from the current `main`, then independently verify the latest `main` SHA, relevant open PRs, and exact-head CI on GitHub. Current GitHub/source state overrides stale documentation or chat memory. Follow the documented cautious workflow: map before code, branch from exact verified main, never commit directly to main, never weaken tests, preserve frozen-file/Supabase boundaries, run required static + Playwright coverage, and never merge unless I explicitly say `please merge`. Tell me the verified checkpoint and the next recommended action before making substantial changes.

## Copy-paste prompt — resume a specific task

> Resume the Maths Practice App task: [DESCRIBE TASK]. First read the shared project records under `docs/` (`AI_HANDOFF.md`, `PROJECT_STATE.md`, `ROADMAP.md`, `DECISIONS.md`, `KNOWN_ISSUES.md`) and verify current GitHub main/PR/CI state directly. Do not trust an old chat handoff if GitHub has moved. Read the actual source and map ownership/impact before code. Work on a new branch from exact verified main, keep the change small/reversible, preserve all hard gates and frozen boundaries, and do not merge without my explicit approval.

## Copy-paste prompt — review only / no code

> Review the current Maths Practice App state only; do not modify anything. Read the shared project records under `docs/`, then verify current GitHub main, open PRs and relevant CI directly. Report: current production checkpoint, active/parked work, known risks, roadmap position, and the safest next action. Clearly separate verified GitHub facts from recommendations.

## When switching assistants mid-task

If a branch or PR already exists, add this sentence to the startup prompt:

> I am switching assistants mid-task. Reconstruct the task from the repository and PR itself rather than assuming the previous assistant's narrative is complete. Verify the branch base, current head, diff, tests and CI before continuing.

If you have an exact PR number, add:

> Current task is PR #[NUMBER]. Treat its actual GitHub diff and current exact head as authoritative.
