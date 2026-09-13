# Maths Practice App — Roadmap

Last updated: 2026-09-13

This roadmap prioritises the live Maths experience because students are actively using the app for practice. It deliberately deprioritises breadth (for example Science expansion and additional demo work) until the Maths practice system is more reliable, diagnostically useful and maintainable.

## Guiding principles

1. Protect current students first: production stability before new breadth.
2. Improve learning value, not feature count.
3. Treat question/content quality as a production concern.
4. Build adaptive behaviour on richer evidence than topic labels alone.
5. Modernise architecture only with strict behavioural equivalence.
6. Keep risky replacements last and map before code.

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

Outcome: eliminate known deterministic timing races without weakening tests.

Immediate item:
- V56/V57 Past Paper tests F/K sometimes click Assignments while the V5.7C Home dashboard has `data-v57c-rendered="false"`.
- Synchronise the test with the existing readiness contract before clicking.

Rules:
- do not increase timeouts as the primary fix;
- do not remove assertions;
- do not change production runtime for a test-only race unless real browser evidence shows a production bug.

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

## P1 — Better learning intelligence

### P1.1 Question Metadata V2

Outcome: supplement the current topic/difficulty fields with metadata that describes what a question actually demands.

Do not immediately replace the existing production fields. Add richer metadata alongside them and validate usefulness first.

Candidate dimensions:
- primary topic;
- secondary/embedded skills;
- prerequisites;
- procedural-step count;
- conceptual-reasoning demand;
- reading/context load;
- visual-spatial demand;
- number of concepts combined;
- response complexity;
- paper-section profile (early fluency / middle mixed / late applied);
- source-confidence/audit status;
- calibrated difficulty from real performance data, when enough evidence exists.

Evidence from the 2020, 2022-2025 Paper 2 analysis:
- 169 of 170 digitised rows currently share the `standard` difficulty label, so the current field is not discriminating enough for adaptation.
- topic labels can hide embedded skills such as unit conversion or percentage reasoning.
- the papers show a stable demand progression even when contexts rotate.

### P1.2 V5.9B Adaptive Diagnostic — controlled pilot refinement

Outcome: diagnose prerequisite/reasoning failures rather than simply reacting to the top-level topic label.

Keep PR #237 pilot-only until re-based/reviewed from current main and a new acceptance cycle is completed.

Desired direction:
- identify which prerequisite or reasoning step is likely failing;
- serve a very short diagnostic/intervention sequence;
- preserve normal Practice scoring and authority;
- keep diagnostic grading server-side;
- measure whether the student succeeds on a subsequent retry;
- do not generalise to all students until pilot evidence supports it.

Example target pattern:
`fraction of whole -> remainder -> fraction of remainder -> retry original structure`.

### P1.3 Paper 2 Blueprint Practice

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

### P1.4 Student weakness / teacher insight model

Outcome: analytics progress from broad topic percentages to actionable learning patterns.

Examples:
- procedural fractions secure; fraction-of-remainder reasoning weak;
- graph reading secure; follow-up percentage calculation weak;
- individual angle facts secure; multi-step angle reasoning weak;
- recurring unit-conversion weakness across Time/Mass/Capacity questions.

This depends on Question Metadata V2 and trustworthy content data.

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
- further demo-route development beyond maintenance of the routes already merged;
- additional Student Home cosmetic redesign;
- broad new product areas not tied to current Maths learning/stability needs.

## Order of execution

Current recommended sequence:

1. shared project record/documentation;
2. V5.9 production + CI stabilisation;
3. Question Bank Integrity checkpoint;
4. Question Metadata V2;
5. V5.9B controlled adaptive pilot refinement;
6. Paper 2 Blueprint Practice;
7. richer student/teacher learning insights;
8. authentic response coverage and observability;
9. Phase 7B module bundling;
10. Phase 7C mapping and eventual replacement.

Each phase should be re-evaluated against real student use before automatically moving to the next one.
