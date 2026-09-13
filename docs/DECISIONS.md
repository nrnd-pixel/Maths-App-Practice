# Maths Practice App — Decisions

Last updated: 2026-09-13

This file records important project decisions and the reason behind them. It is intentionally concise: record durable decisions, not every debugging step.

## 2026-09-13 — GitHub repository becomes the cross-assistant project memory

Decision:
Use version-controlled files under `docs/` as the shared operational record for ChatGPT, Claude and future assistants.

Reason:
Assistant chat memory is not portable between tools. GitHub is shared, auditable and tied directly to the codebase.

Implication:
After major accepted checkpoints, update `PROJECT_STATE.md` and any affected roadmap/decision/known-issue entries.

## 2026-09-13 — V5.9 Student Home is the production baseline

Decision:
Treat the accepted V5.9 Student Home as stable production UX. Do not continue cosmetic redesign without a demonstrated student usability problem.

Reason:
Students are actively using the app for practice. Reliability and learning value now matter more than further visual iteration.

Implication:
Near-term work prioritises production stability, content quality, diagnostics and trustworthy analytics.

## 2026-09-13 — Demo routes are consolidated under PR #242

Decision:
Use the merged V5.9 demo routes from PR #242 as the maintained demo implementation.

Reason:
They supersede the older V5.8.1 demo drafts and were reviewed with isolation verifiers and exact-head CI.

Implication:
PR #204 and PR #205 must not be merged; close them as superseded when housekeeping is performed.

## 2026-09-13 — V5.9B remains a controlled pilot

Decision:
Do not promote the adaptive diagnostic pilot broadly until it is re-based/reviewed from current main and evaluated with controlled pilot evidence.

Reason:
Adaptive behaviour can affect learning pathways. It should diagnose real prerequisite/reasoning needs and prove useful before broad release.

Implication:
PR #237 remains draft/pilot-only. Existing Practice scoring and server authority remain authoritative.

## 2026-09-13 — Question metadata will be enriched before adaptive expansion

Decision:
Supplement rather than immediately replace the current topic/difficulty fields with a multidimensional Question Metadata V2.

Reason:
The Paper 2 analysis found the existing difficulty field is not discriminating enough (169 of 170 digitised rows labelled `standard`) and that top-level topic labels hide embedded skills and different cognitive demands.

Implication:
Adaptive logic should eventually consider prerequisites, procedural steps, conceptual reasoning, reading load, visual-spatial demand, combined concepts, response complexity and source-confidence—not topic alone.

## 2026-09-13 — Paper 2 patterns guide practice design, not prediction

Decision:
Use recurring cross-year structures to build balanced practice, but never present them as guarantees about future exam wording or exact questions.

Reason:
The 2020, 2022-2025 analysis shows a stable assessment architecture with rotating contexts and emphasis.

Implication:
A future Paper 2 Blueprint Practice mode may mirror early fluency -> middle mixed application -> late visual/multi-step demand while keeping broad concept coverage.

## 2026-09-13 — Content integrity is a production concern

Decision:
Question-bank QA must precede wider adaptive/difficulty automation.

Reason:
Real students are using the bank, and source anomalies can create false learning diagnoses.

Implication:
Questions with unresolved source inconsistencies must be excluded from automated modelling. Preserve audit flags for corrected source material.

## 2026-09-13 — Phase 7B is behaviour-neutral first

Decision:
If/when module bundling starts, the first milestone must preserve existing production behaviour exactly.

Reason:
The current vanilla JS/Supabase/Netlify stack is working. The purpose of bundling is dependency/ownership clarity, not a framework rewrite.

Implication:
Evaluate Vite/esbuild only after mapping the current loader. Require static and Playwright equivalence before promotion.

## 2026-09-13 — Phase 7C starts with mapping only

Decision:
Do not begin V52B1 replacement with implementation.

Reason:
`v52b1-question-bank-observer-gate.js` is a frozen, high-risk ownership boundary.

Implication:
First produce a map of observers, events, globals, downstream dependencies, hard-gate guarantees and rollback/replacement contracts. Code follows only after explicit acceptance.

## Standing engineering decisions

- Never commit directly to `main`.
- Always branch from exact verified current main.
- Read actual source and map impact before code.
- Never weaken a test to make CI pass.
- Full maintained static verifiers + Playwright hard gates + `npm test` are required for production-facing changes.
- Frozen files and all Supabase SQL require extreme care.
- Never merge without explicit user instruction.
