# Maths Practice App — Roadmap

Last updated: 2026-09-16

This roadmap prioritises the live Maths experience because students are actively using the app for practice. It deliberately deprioritises breadth, including Science expansion, until the Maths practice system is more reliable, diagnostically useful and maintainable.

## Guiding principles

1. Protect current students first: production stability before new breadth.
2. Improve learning value, not feature count.
3. Treat question/content quality as a production concern.
4. Build adaptive behaviour on richer evidence than topic labels alone.
5. Require pilot evidence before broadening adaptive access.
6. Modernise architecture only with strict behavioural equivalence.
7. Keep risky replacements last and map before code.

## P0 — Live stability and trustworthy foundations

### P0.1 V5.9 production stabilisation

Outcome: V5.9 remains the accepted Student Home/Practice baseline while real student use is observed.

Focus:
- sign-in reliability;
- Practice start/resume/finish;
- assignments;
- Past Papers;
- progress/results consistency;
- mobile usability;
- no unnecessary visual churn.

Exit condition: no known high-severity live regression; production flows have reliable regression coverage and can be distinguished from test-only flakes.

### P0.2 CI / Playwright reliability housekeeping

Status: the known V56/V57 Student Home readiness races have been repaired without weakening assertions.

Relevant checkpoints:
- PR #244 — synchronised Tests F/K with the existing V5.7C Home readiness contract;
- PR #269 — added the same accepted readiness wait to Gate G.

Continue to treat new timing failures as defects to diagnose rather than reasons to inflate timeouts or remove assertions.

### P0.3 Question Bank Integrity checkpoint

Outcome: automate content QA before richer adaptive logic depends on the question bank.

Target checks include:
- missing/empty accepted answers;
- inconsistent or impossible marks;
- malformed units;
- inactive questions accidentally exposed;
- source/paper/year attribution inconsistencies;
- multipart numbering/grouping integrity;
- duplicate or near-duplicate source records where relevant;
- response-type consistency;
- audit flags for corrected or uncertain source material;
- eligibility flags for adaptive/difficulty calibration.

Known Paper 2 audit examples to preserve:
- 2022 Q30: printed prices/ratio/stated total are internally inconsistent; keep excluded from automated modelling until resolved.
- 2023 Q30: printed answer line uses `cm²` although the demanded quantity is a length; mathematical correction is `cm`, with source audit retained.
- 2025 P2 Q30 adaptive target: authoritative original source/Table 2 has not yet been directly verified for Metadata V2; keep unprofiled/ineligible and fail closed.

## P1 — Better learning intelligence

### P1.1 Question Metadata V2

Outcome: supplement the current topic/difficulty fields with metadata that describes what a question actually demands.

Current checkpoint:
- schema foundation merged under PR #256;
- production currently has 41 Metadata V2 profiles;
- two profiles are explicitly adaptive-eligible: 2025 P1 Q9(b) and 2025 P2 Q4;
- 2025 P2 Q30 remains unprofiled/ineligible;
- eligibility remains a permission/readiness signal, not a student-weakness model.

Continue to expand metadata only from verified source evidence and reviewed calibration. Do not use the small profiled subset to filter the broader Practice bank.

### P1.2 V5.9B Adaptive Diagnostic — controlled pilot evidence

Outcome: diagnose prerequisite/reasoning failures rather than simply reacting to a top-level topic label.

Implementation checkpoint:
- Stage 0 source reconciliation — PR #267 merged;
- Stage 1 fail-closed readiness RPC — PR #268 merged and deployed;
- Stage 2 verified tiny eligibility subset — Q9(b) + Q4 eligible; Q30 remains ineligible;
- server authority hardening — PR #272 merged and deployed;
- Stage 3 browser pilot V2 — PR #271 merged after exact-head CI and manual smoke testing.

Current pilot boundary:
- browser flow dormant unless `?adaptivePilot=2` is present;
- server pilot remains `allow_all_students=false`;
- exactly one allowed student;
- three allow-listed target IDs, but only Q9(b) and Q4 pass Metadata V2 readiness;
- Q30 must fail closed;
- ordinary Practice grading, score, XP, mastery and answer history remain authoritative.

Next step: collect controlled pilot evidence. Measure trigger behaviour, diagnostic completion, target-retry outcome and usability. A successful technical smoke test is not evidence of learning effectiveness.

Do not broaden student access, add targets, or generalise adaptive sequencing until the evidence justifies a specific next hypothesis.

### P1.3 Stage 4 demand-aware Mixed Practice — deferred

Issue #266 originally reserved a future Stage 4 for demand-aware Mixed Practice. It remains deliberately deferred.

Before any experiment:
- define a student-level learning objective;
- define a minimum metadata/evidence coverage threshold;
- specify how unprofiled questions fail open to the accepted V5.3D5 ordering;
- prove no Topic/assignment/Past Paper/topical/Exam route leakage;
- obtain explicit approval for the experiment.

Do not create arbitrary demand quotas merely because Metadata V2 scores exist.

### P1.4 Paper 2 Blueprint Practice

Outcome: an optional practice mode that mirrors the observed Paper 2 demand progression without pretending to predict exact future questions.

Observed pattern across five available papers:
- Q1-10: short procedural Number/Algebra-heavy work;
- Q11-20: mixed calculation, measurement and geometry;
- Q21-30: more visual, contextual and multi-step reasoning.

A future session could intentionally sample across these demand bands instead of serving only random questions by topic.

Stable templates worth dedicated practice include:
- order of operations;
- factors/multiples/HCF;
- map coordinates/directions;
- graph/data interpretation followed by calculation;
- later multi-step angle reasoning;
- procedural and applied fraction reasoning.

### P1.5 Student weakness / teacher insight model

Outcome: analytics progress from broad topic percentages to actionable learning patterns.

Examples:
- procedural fractions secure; fraction-of-remainder reasoning weak;
- graph reading secure; follow-up percentage calculation weak;
- individual angle facts secure; multi-step angle reasoning weak;
- recurring unit-conversion weakness across Time/Mass/Capacity questions.

This depends on trustworthy content data, richer metadata and enough student evidence to avoid over-interpreting sparse results.

## P2 — Authentic practice and engineering modernisation

### P2.1 Authentic response coverage

Outcome: preserve Paper 2 tasks that cannot be reduced to text/number entry.

Possible approaches:
- structured interactive responses where practical;
- drawing/image submission;
- teacher/manual review for construction, symmetry, tessellation or graph-completion tasks.

Do not distort authentic exam demand merely because auto-marking is easier.

### P2.2 Production observability

Outcome: lightweight evidence about real student-facing failures.

Candidate signals:
- sign-in failure rate;
- Practice RPC/grading failures;
- session completion failures;
- assignment completion anomalies;
- unusual drops in activity;
- client/runtime errors where safely collectable.

Keep privacy and data minimisation in scope from the start.

### P2.3 Phase 7B — module bundling

Outcome: replace fragile script-loading complexity with an explicit build/dependency system while preserving behaviour.

Constraints:
- vanilla JS remains acceptable;
- Supabase remains;
- Netlify remains;
- no framework migration required;
- first milestone is behaviour-neutral equivalence, not feature redesign;
- use full static + Playwright equivalence coverage before promotion.

Vite or esbuild may be evaluated, but tool choice comes after mapping current loader/dependency ownership.

## P3 — high-risk architecture replacement

### P3.1 Phase 7C — V52B1 replacement

Outcome: eventually replace the current V52B1 observer/gate ownership with a clearer explicit contract.

First deliverable is mapping only; no runtime change.

Map:
- observed DOM/events;
- globals and functions touched;
- downstream dependants;
- install/ownership markers;
- existing hard-gate guarantees;
- exact replacement contract;
- rollback path.

Implementation begins only after the map and equivalence plan are accepted.

## Parked for now

These are not rejected; they are simply low priority while students are using Maths for active practice:
- Science V0.2 expansion (PR #180);
- further demo-route development beyond maintenance of the merged routes;
- additional Student Home cosmetic redesign;
- broad new product areas not tied to current Maths learning/stability needs.

## Current order of execution

1. maintain V5.9 production stability and trustworthy CI;
2. continue Question Bank Integrity work;
3. maintain/extend Metadata V2 only from verified evidence;
4. collect V5.9B controlled pilot evidence;
5. decide whether the evidence supports another adaptive refinement or whether to proceed to Paper 2 Blueprint Practice;
6. richer student/teacher learning insights;
7. authentic response coverage and observability;
8. Phase 7B module bundling;
9. Phase 7C mapping and eventual replacement.

Stage 4 demand-aware Mixed Practice is not an automatic next step; it requires a separate evidence-backed proposal and explicit acceptance.
