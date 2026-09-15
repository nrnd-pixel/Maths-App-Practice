# Maths Practice App — Decisions

Last updated: 2026-09-16

This file records important project decisions and the reason behind them. It is intentionally concise: record durable decisions, not every debugging step.

## 2026-09-16 — V5.9B is accepted only as a tightly controlled pilot

Decision:
Keep the merged V5.9B adaptive diagnostic flow restricted to the explicit browser pilot flag plus the existing server-side allow-list. Do not generalise it to all students or targets from the fact that the implementation and smoke tests passed.

Reason:
PR #271 proved the browser flow can preserve ordinary Practice authority and fail closed correctly, but a successful technical smoke test does not establish learning effectiveness.

Implication:
The next adaptive step is controlled evidence collection, not broader rollout. Current production scope remains one allowed student and three allow-listed target IDs, of which only Q9(b) and Q4 pass Metadata V2 readiness; Q30 remains ineligible.

## 2026-09-16 — Adaptive readiness must be enforced at the server authority boundary

Decision:
Diagnostic plan delivery and diagnostic grading must independently enforce `student_adaptive_question_readiness_v2`, not rely only on the browser having called readiness first.

Reason:
Review of the initial Stage 3 candidate found that a modified client could otherwise bypass the browser readiness check and directly call the plan/grader RPCs for an old allow-listed but Metadata-ineligible target such as Q30.

Implication:
PR #272 is part of the accepted adaptive architecture. Future adaptive endpoints that deliver protected diagnostic content or write adaptive evidence must fail closed independently at the server boundary.

## 2026-09-16 — Metadata V2 eligibility is permission, not diagnosis

Decision:
Treat Metadata V2 adaptive eligibility as a fail-closed permission/readiness gate. Continue to use the curated skill graph, prerequisite relationships, misconceptions and diagnostic plans as the authority for the actual diagnostic route.

Reason:
Demand scores describe question characteristics. They do not, by themselves, identify a student's misconception or prerequisite gap.

Implication:
Do not infer a diagnostic route from topic labels or demand scores. Do not interpret a high demand score as proof that a particular student is weak in that dimension without student-level evidence.

## 2026-09-16 — Demand-aware Mixed Practice remains deferred

Decision:
Do not move automatically from the controlled V5.9B pilot into demand-aware Mixed Practice.

Reason:
Metadata coverage remains small relative to the full Practice bank, and there is not yet enough pilot evidence to justify a particular adaptive selection objective or quota.

Implication:
Any future Stage 4 experiment must define a learning objective, coverage threshold, fail-open behaviour to the accepted V5.3D5 ordering, isolation boundaries and an explicit evidence-backed acceptance plan before implementation.

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

## 2026-09-13 — Question metadata will be enriched before adaptive expansion

Decision:
Supplement rather than immediately replace the current topic/difficulty fields with a multidimensional Question Metadata V2.

Reason:
The Paper 2 analysis found the existing difficulty field is not discriminating enough (169 of 170 digitised rows labelled `standard`) and that top-level topic labels hide embedded skills and different cognitive demands.

Implication:
Adaptive logic should use richer evidence only after source verification/calibration, and should not treat topic alone as the diagnostic explanation.

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
