# Maths Practice App — Roadmap

Last updated: 2026-09-25

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

Status: **accepted preventive QA checkpoint completed** via PR #323 / Issue #322 on verified main `66fe4d7ba039ed26da20f39b111183e14503a156`.

Outcome: automate content QA before richer adaptive logic depends on the question bank.

Accepted checkpoint now includes:
- existing inactive/exposure, duplicate identifier, multipart and metadata QA;
- response-contract QA for supported response families;
- malformed unit / multi-blank / choice-option configuration checks;
- impossible >3-mark physical Paper 1/2 row checks;
- explicit past-paper source/year/paper contradiction checks;
- activation blockers for semantic response/source QA failures;
- exact-head CI coverage through the dedicated P0.3 verifier, maintained static suite, V51 hard gates and full core browser suite.

This checkpoint is preventive, not a claim that every source-content ambiguity is resolved. Continue source-specific audits only from authoritative evidence.

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
- Stage 3 browser pilot V2 — PR #271 merged after exact-head CI and manual smoke testing;
- Stage 3E lifecycle telemetry — deployed and production-smoke validated for Q4 and Q9(b);
- Stage 3F-A operator/Demo validation — completed, then production access was returned to Demo-only.

Current pilot boundary:
- browser flow dormant unless `?adaptivePilot=2` is present;
- server pilot remains `allow_all_students=false`;
- exactly one allowed student;
- two allow-listed target IDs: Q9(b) and Q4;
- Q30 is outside the current pilot target allow-list and must remain fail-closed if queried;
- ordinary Practice grading, score, XP, mastery and answer history remain authoritative.

Next step: resume Stage 3F-B controlled real-student usability evidence collection when suitable students are available. Measure trigger behaviour, diagnostic completion, target-retry outcome and usability. Demo/operator runs remain engineering evidence, not learning-effectiveness evidence.

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

### P2.3 Phase 7B — module bundling / explicit build-system mapping

Status: **completed at the accepted safe boundary**; Issue #291 is closed.

Outcome achieved:
- current two-tier loader/dependency ownership is machine-mapped;
- shadow/generated bundle compatibility and determinism can be tested without forcing production promotion;
- low-risk candidates were evaluated under behavioural-equivalence gates;
- no framework migration was required;
- no production loader rewrite was justified merely to reduce script count.

Vanilla JS, Supabase and Netlify remain the production stack. Reopen bundling only for a concrete maintenance/performance objective with preserved static + Playwright equivalence.

Deployment infrastructure completed 2026-09-25:
- netlify.toml: explicit publish dir, 1-year immutable cache for JS/images, no-cache for shell, security headers
- Service worker v2: cache-first for assets, network-first for shell, offline fallback
- WebP image conversion: 47 past paper images, 17.3 MB -> 1.2 MB (93% reduction)
- v59n shim: transparent PNG->WebP rewrite at render time

## P3 — high-risk architecture replacement

### P3.1 Phase 7C — V52B1 observer-gate replacement

Status: **completed**; Issue #302 is closed.

Outcome achieved:
- the exact suppressed-observer inventory and explicit lifecycle dependencies were mapped and hard-gated;
- Question Bank refresh/correction-history lifecycle ownership was made explicit;
- active global MutationObserver interception was retired while unrelated/native observers remained native;
- the maintained Question Bank, Option 2A/2B/2C and broader regression gates were preserved rather than weakened.

The compatibility-positioned V52B1 file remains part of the frozen loader manifest until a separately accepted loader successor exists.

### P3.2 Phase 7D — frozen nested loader successor decision

Status: **completed**; Issue #315 is closed and PR #319 is merged.

Decision: retain the current frozen nested loader.

Evidence established:
- exact browser chronology for the 45 tier-1 + 41 tier-2 runtime scripts is deterministic and hard-gated;
- tier-2 authority/dependency boundaries are mapped;
- a dormant flat-loader prototype proves technical feasibility outside production;
- a production successor would save zero runtime requests in the straightforward variants, while the most aggressive config-inline variant saves only one request and crosses major frozen/seal boundaries.

Therefore no production loader change is authorised. Keep the flat-loader prototype as dormant tooling/evidence only. Reopen only for a reproducible loader defect or a broader change with material payoff.

## Parked for now

These are not rejected; they are simply low priority while students are using Maths for active practice:
- Science V0.2 expansion (PR #180);
- further demo-route development beyond maintenance of the merged routes;
- additional Student Home cosmetic redesign;
- broad new product areas not tied to current Maths learning/stability needs.

## Current order of execution

1. maintain V5.9 production stability and trustworthy CI;
2. continue Question Bank Integrity work from authoritative source evidence;
3. maintain/extend Metadata V2 only from verified evidence;
4. collect V5.9B controlled pilot evidence;
5. decide whether that evidence supports another adaptive refinement or Paper 2 Blueprint Practice;
6. richer student/teacher learning insights;
7. authentic response coverage and privacy-conscious observability;
8. keep the completed Phase 7B/7C/7D architecture boundaries stable unless a concrete defect or material benefit justifies reopening them.

Stage 4 demand-aware Mixed Practice is not an automatic next step; it requires a separate evidence-backed proposal and explicit acceptance. There is currently no approved Phase 7E runtime programme.
