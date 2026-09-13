# Maths Practice App — Known Issues and Watchlist

Last updated: 2026-09-13

This file records unresolved defects, stale branches and data/content risks that may affect future work. Resolved items should be removed or explicitly linked to their resolving checkpoint.

## Resolved since the previous checkpoint

### V56/V57 Playwright Home-readiness race

Resolved by PR #244.

The Phase 4 Past Paper hard-gate tests now wait for the existing V5.7C Student Home readiness contract (`data-v57c-rendered="true"`) before the affected Assignments clicks. Exact-head Consolidated CI run #285 passed the maintained verifier suite, all named hard gates and the core browser tests before merge.

Verified main after merge: `6f230b33700199a081d65c8465de4a0bd559d218`.

### Practice eligibility was not server-bound to unresolved review state

Resolved by PR #245 plus production migration `20260913091929_v54h_practice_review_safety`.

The production database now rejects the conflicting state:

`review_status='needs_review' AND practice_eligible=true`

The invariant is enforced at the database boundary for current and future write paths. It preserves `review_status='none'` / `reviewed`, leaves `active` independent, and does not silently auto-de-eligible questions.

Exact-head Consolidated CI run #288 passed before merge. Production preflight and post-apply verification both found 655 Practice-eligible rows and 0 conflicts.

Verified main after merge: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`.

## 1. `/demo-student/` hint counter can double-count

Status: minor demo-only issue; no production Practice impact.

Failure mode:
If a viewer manually opens a hint and then submits an incorrect first attempt, the demo can increment the final `Hints shown` statistic twice for the same question.

Impact:
Only the static demo completion statistic. No Supabase, real student record, scoring or production Practice behaviour is affected.

Priority:
Low. Fix opportunistically if it stays isolated and does not create unnecessary seal/CI churn.

## 2. Old demo PRs #204 and #205 remain open

Status: superseded.

PR #242 consolidated the maintained V5.9 demo routes. PRs #204 and #205 are based on an older V5.8.1 baseline and should not be merged.

Preferred action:
Close them as superseded during housekeeping.

## 3. PR #237 adaptive diagnostic pilot is intentionally not production-ready

Status: draft/pilot-only.

Risks:
- branch predates the current verified main;
- adaptive behaviour requires renewed source/architecture mapping before any promotion;
- pilot effectiveness must be evaluated, not inferred from implementation alone;
- current metadata debt must not be allowed to create false prerequisite diagnoses.

Rule:
Do not merge or broaden access without a new explicit acceptance cycle.

## 4. PR #180 Science V0.2 is parked on an old baseline

Status: parked.

It was built from an older Maths baseline and should not be revived by simply merging/rebasing blindly.

Preferred action if resumed:
Map current architecture and re-create/re-base the isolated Science pilot from the then-current verified main.

## 5. Paper 2 source/data audit issues are not yet in the production Question Bank

### 2022 Q30
Printed prices, ratio and stated total are internally inconsistent.

### 2023 Q30
Printed answer line uses `cm²` although the question asks for a length; the mathematically appropriate unit is `cm`.

Current production status:
The read-only Question Bank audit found that 2022 Paper 2 and 2023 Paper 2 are not currently present in the production questions table. These source issues are therefore not currently exposed through production Practice or Exam Mode.

Required handling if imported later:
Resolve the source issue or preserve a clear audit/review flag before Practice eligibility or Exam publication. Do not allow unresolved rows into adaptive calibration.

## 6. 123 Practice-eligible rows are missing `skill`

Status: confirmed live metadata debt; not a marking outage.

Breakdown:
- 2013 Paper 1: 44 rows;
- 2018 Paper 1: 39 rows;
- 2019 Paper 1: 40 rows.

Impact:
These questions can still be structurally valid and markable, but empty skills weaken teacher analytics, Question Metadata V2, prerequisite mapping and adaptive diagnostics.

Current remediation status:
All 123 rows have candidate labels in `docs/MISSING_SKILL_REMEDIATION_MAP.md`. High-confidence candidates still require spot-checking; Medium-confidence candidates require authoritative original-source verification before any production write.

Preferred action:
Source-aware remediation keyed by immutable question IDs. Do not infer skills blindly from the current topic label and do not bulk-write the candidate map without a separate accepted data-change plan.

## 7. Historical excluded questions lack durable review/audit rationale

Status: governance/data-quality issue.

The live audit found seven Past Paper rows that are both inactive and not Practice-eligible, protecting students from known or likely source/content problems. At the audit checkpoint those rows used `review_status='none'` with blank `review_note`.

Impact:
The reason for exclusion is not consistently represented in the database review workflow and can be lost when context moves between maintainers or AI assistants.

Preferred action:
Define a source-audit convention and backfill only from trusted evidence in a separate data-change plan. Do not mass-write review states automatically.

## 8. Current difficulty metadata is not discriminating enough

Observed evidence from the combined Paper 2 analysis:
- 169 of 170 digitised rows are labelled `standard`;
- only one row is labelled `challenge`.

Impact:
The current field should not be treated as sufficient evidence for adaptive sequencing or cross-year difficulty analysis.

Preferred direction:
Question Metadata V2 with multidimensional demand descriptors plus later calibration from real performance data.

## 9. Topic labels can hide embedded skills

Examples include percentage reasoning or unit conversion embedded inside Time, Mass, Capacity, Money or other labelled topics.

Impact:
Topic-only analytics can misdiagnose a shared underlying weakness as several unrelated topic weaknesses.

Preferred direction:
Secondary/embedded skill tags and prerequisite metadata before richer automatic recommendations.

## 10. Past Paper Practice often contains partial available-question subsets

Status: expected current behaviour; preserve wording carefully.

Past Paper Practice derives its library from `practice_eligible=true`, not from Exam publication readiness. Several historical papers therefore contain fewer than the original 40/90 or 30/90 after intentionally excluded questions are removed.

The accepted V5.5 UI currently communicates this correctly with wording such as `questions available`, `marks available in the Practice bank`, and `All Available Questions`, and explicitly distinguishes Practice Mode from Exam Mode.

Watch rule:
Do not later relabel these subsets as `full paper`, `complete paper`, or equivalent unless completeness has actually been verified.

## 11. Supabase security-advisor warnings require a separate map

Status: pre-existing security watchlist; not introduced by V5.4H.

A post-V5.4H advisor scan reported:

- SECURITY DEFINER functions executable by `anon` and/or `authenticated` roles;
- RLS-enabled tables with no explicit policies;
- leaked-password protection disabled in Supabase Auth.

Important caution:
Do not treat the advisor list as proof that every item is a defect. Several student RPCs deliberately accept app-issued access tokens and some RLS/no-policy tables may intentionally be accessible only through trusted RPC/service paths.

Preferred action:
Map each warning family against the actual authentication/session architecture before changing privileges or RLS. Any remediation must preserve student sign-in, Practice, Exam, assignment, teacher and platform-access flows and must go through the full frozen-SQL/seal/CI workflow.

## Watchlist discipline

When an item is resolved:
1. link the resolving PR/commit;
2. state the verified main SHA;
3. move any durable architectural lesson to `DECISIONS.md`;
4. remove or mark this issue resolved rather than leaving ambiguous stale warnings.
