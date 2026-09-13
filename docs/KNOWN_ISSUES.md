# Maths Practice App — Known Issues and Watchlist

Last updated: 2026-09-13

This file records unresolved defects, test flakes, stale branches and data-quality risks that may affect future work.

## 1. V56/V57 Playwright Home-readiness race

Status: known test flake; production runtime not proven faulty.

Observed in:
- `e2e/tests/past-paper-phase4-v56-v57.spec.cjs`
- Test F: teacher-assigned Past Paper end-to-end checkpoint flow
- Test K: shared completion lock / double-fire protection

Failure mode:
The test can click the V5.7C Home Assignments action while the dashboard has `data-v57c-rendered="false"`. The runtime click handler intentionally ignores navigation until the dashboard is rendered. The same unchanged PR head later passed on rerun, confirming timing sensitivity.

Preferred fix:
Wait for the existing readiness contract (`data-v57c-rendered="true"`) before the automated Assignments click. Do not weaken assertions or merely increase timeouts.

## 2. `/demo-student/` hint counter can double-count

Status: minor demo-only issue; no production Practice impact.

Failure mode:
If a viewer manually opens a hint and then submits an incorrect first attempt, the demo can increment the final `Hints shown` statistic twice for the same question.

Impact:
Only the static demo completion statistic. No Supabase, real student record, scoring or production Practice behaviour is affected.

Priority:
Low. Fix opportunistically if it stays isolated and does not create unnecessary seal/CI churn.

## 3. Old demo PRs #204 and #205 remain open

Status: superseded.

PR #242 consolidated the maintained V5.9 demo routes. PRs #204 and #205 are based on an older V5.8.1 baseline and should not be merged.

Preferred action:
Close them as superseded during housekeeping.

## 4. PR #237 adaptive diagnostic pilot is intentionally not production-ready

Status: draft/pilot-only.

Risks:
- branch predates the current verified main;
- adaptive behaviour requires renewed source/architecture mapping before any promotion;
- pilot effectiveness must be evaluated, not inferred from implementation alone.

Rule:
Do not merge or broaden access without a new explicit acceptance cycle.

## 5. PR #180 Science V0.2 is parked on an old baseline

Status: parked.

It was built from an older Maths baseline and should not be revived by simply merging/rebasing blindly.

Preferred action if resumed:
Map current architecture and re-create/re-base the isolated Science pilot from the then-current verified main.

## 6. Paper 2 source/data audit issues

### 2022 Q30
Printed prices, ratio and stated total are internally inconsistent.

Handling:
Keep inactive/manual-review and exclude from automated difficulty/adaptive calibration until source resolution.

### 2023 Q30
Printed answer line uses `cm²` although the question asks for a length; the mathematically appropriate unit is `cm`.

Handling:
Use the corrected mathematical unit while preserving a source audit flag.

## 7. Current difficulty metadata is not discriminating enough

Observed evidence from the combined Paper 2 analysis:
- 169 of 170 digitised rows are labelled `standard`;
- only one row is labelled `challenge`.

Impact:
The current field should not be treated as sufficient evidence for adaptive sequencing or cross-year difficulty analysis.

Preferred direction:
Question Metadata V2 with multidimensional demand descriptors plus later calibration from real performance data.

## 8. Topic labels can hide embedded skills

Examples include percentage reasoning or unit conversion embedded inside Time, Mass, Capacity, Money or other labelled topics.

Impact:
Topic-only analytics can misdiagnose a shared underlying weakness as several unrelated topic weaknesses.

Preferred direction:
Secondary/embedded skill tags and prerequisite metadata before richer automatic recommendations.

## Watchlist discipline

When an item is resolved:
1. link the resolving PR/commit;
2. state the verified main SHA;
3. move any durable architectural lesson to `DECISIONS.md`;
4. remove or mark this issue resolved rather than leaving ambiguous stale warnings.
