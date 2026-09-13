# Maths Practice App — Question Bank Integrity Audit

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: read-only mapping checkpoint. No question rows, production runtime JavaScript or Supabase SQL were changed during this audit.

Repository baseline: `6f230b33700199a081d65c8465de4a0bd559d218`

## Purpose

This audit maps the current Question Bank integrity architecture and the live production question metadata before any Question Metadata V2 or adaptive-diagnostic work. The goal is to distinguish actual student-facing risk from legacy metadata debt and to avoid changing frozen owners without evidence.

Current GitHub/source state remains authoritative if it moves after this checkpoint.

## Executive findings

The live Practice pool is structurally healthy for marking. The main integrity debt is metadata and exposure governance rather than answer-engine corruption.

- Production contains 1,003 question rows.
- 704 rows are legacy `active=true`.
- 655 rows are `practice_eligible=true` and can enter ordinary Practice.
- There are currently zero `review_status='needs_review'` rows.
- There are zero `needs_review + practice_eligible=true` rows.
- There are zero `active=false + practice_eligible=true` rows in production at this checkpoint.
- 49 rows are `active=true + practice_eligible=false`, which is valid under the intentionally separate exposure domains.
- Deep response-configuration validation found no malformed currently Practice-eligible rows under the same structural rules used by the importer.
- The principal live metadata debt is 123 Practice-eligible Past Paper rows with an empty `skill` field.
- Seven known/problematic Past Paper rows are inactive and also not Practice-eligible, so they are protected from students; however, their exclusion rationale is not captured in `review_status` / `review_note`.
- The report-level 2022 Paper 2 Q30 and 2023 Paper 2 Q30 issues are not currently present in the production question bank.

## Exposure domains are intentionally separate

The app has two independent exposure concepts:

### Legacy / Exam-facing `active`

`active` continues to participate in legacy Question Bank management and Exam publication. Exam publication has strong server-side readiness checks including expected question counts, 90 marks, metadata/image/multipart blockers, duplicate identifiers and unresolved review status.

### Ordinary Practice `practice_eligible`

Ordinary Practice is selected from `practice_eligible=true`, not from `active=true`. This separation is intentional and supports staged resource-bank content.

Teacher per-question and bulk Practice-eligibility RPCs update only `practice_eligible` and deliberately leave `active` unchanged.

Do **not** introduce a blanket rule that `active=false` must imply `practice_eligible=false`; the architecture deliberately treats them as different domains even though no inactive-but-eligible rows currently exist in production.

## Current live production snapshot

### By source type

| Source type | Rows | Active | Practice eligible | Active but not Practice eligible |
| --- | ---: | ---: | ---: | ---: |
| `past_paper` | 704 | 697 | 652 | 45 |
| `practice` | 7 | 7 | 3 | 4 |
| `topical_exercise` | 292 | 0 | 0 | 0 |

No production row is currently both inactive and Practice-eligible.

### Current Exam publication settings

For Year 6, the current paper settings observed during the audit were:

| Paper | Available in Exam publication |
| --- | --- |
| 2022 Paper 1 | No |
| 2024 Paper 1 | No |
| 2025 Paper 1 | Yes |
| 2025 Paper 2 | No |

Exam availability is therefore not equivalent to Past Paper Practice availability.

## Past Paper Practice is an available-question mode, not a completeness guarantee

The consolidated V5.5 Past Paper Practice owner derives its paper library from the Practice-eligible student question payload. It displays the number of currently available logical questions and marks available in the Practice bank.

The UI explicitly labels the full-length choice as **All Available Questions** and states that it uses every question currently available in the Practice bank. It remains Practice Mode, not Exam Mode.

This wording is important because many historical paper subsets are intentionally partial after Practice-eligibility filtering. Examples at this checkpoint include:

- 2025 Paper 1: 39 logical questions / 88 marks available in Practice;
- 2025 Paper 2: 28 logical questions / 84 marks available in Practice;
- 2022 Paper 1: 38 / 86;
- 2024 Paper 1: 37 / 84.

This is **not currently classified as a defect** because the UI does not claim these are complete Exam papers. Any future UI or analytics must preserve that distinction.

## Structural validation of the current Practice pool

Read-only production checks found zero currently Practice-eligible rows with the following structural problems:

- invalid marks outside the importer contract;
- missing answer;
- missing question text, topic or strand;
- missing source;
- unsupported difficulty enum;
- unknown response type;
- non-object `response_config`;
- `number_unit` without usable units;
- `multi_blank` without blanks or with an unanswerable blank;
- choice rows with too few options;
- multiple-choice correct value not present in options;
- multi-select correct values not present in options;
- malformed fraction `simplest_form` shape;
- malformed numeric tolerance shape;
- malformed `accepted_answers` type;
- drawing/manual rows entering ordinary Practice;
- unresolved-review rows entering ordinary Practice;
- exact duplicate active/eligible Past Paper exam identities;
- active/eligible multipart group consistency blockers.

The current importer already performs materially deeper response-type validation than the older V5.1B1 Question Bank QA panel.

## Main live metadata debt: missing `skill`

123 currently Practice-eligible rows have an empty `skill` field:

- 2013 Paper 1: 44 rows;
- 2018 Paper 1: 39 rows;
- 2019 Paper 1: 40 rows.

These rows are not known to be unmarkable. The problem is analytical: missing skills weaken topic/skill reporting, future Question Metadata V2, prerequisite mapping and adaptive diagnostics.

Treat this as a metadata-remediation stream rather than an emergency production outage.

## Known excluded Past Paper rows lack audit rationale

Seven Past Paper rows are currently `active=false` and `practice_eligible=false`, so students are protected from them. Examples include unreadable prompts, source-unit inconsistencies, image/manual-response dependencies and mathematically questionable source content.

At this checkpoint all seven use `review_status='none'` with an empty `review_note`.

This means the app has a review-state architecture, but historical exclusion reasons are not yet consistently represented in the database audit fields.

Preferred direction: when source uncertainty is known and verified, record a durable audit reason instead of relying only on inactive/ineligible state or external chat notes. Do not bulk-write review states without a separate, reviewed data-change plan.

## Latent governance gap: Practice eligibility vs review state

Current production is safe: no unresolved-review row is Practice-eligible.

However, the existing teacher Practice-eligibility writers intentionally update only `practice_eligible` and do not server-side reject a row because `review_status='needs_review'`. Legacy activation and Exam publication have review-state guards, but Practice eligibility is a separate authority path.

This is a **latent governance risk**, not a current incident.

Do not patch frozen Supabase SQL casually. A future hardening proposal should first establish the intended product rule and add equivalence/adversarial coverage before any server-side change.

## Seal / ownership constraint

`site/question-bank-selection-qa.js` is currently part of the frozen out-of-scope site manifest protected by the Option 2A/2B/2C seal architecture.

Therefore, adding new runtime QA flags directly to that owner is not a small unsealed edit. It would require an explicit authorised successor/seal change and full hard-gate review.

This audit deliberately makes no such runtime change.

## Known Paper 2 report issues vs production

The combined Paper 2 analysis identified:

- 2022 Q30: internally inconsistent source quantities;
- 2023 Q30: printed answer line uses `cm²` for a length where `cm` is mathematically appropriate.

Neither 2022 Paper 2 nor 2023 Paper 2 is currently present in the production Question Bank at this checkpoint, so these report-level issues are not currently student-exposed through production Practice or Exam Mode.

If these papers are imported later, the issues must be resolved or explicitly audit-flagged before eligibility/publication.

## Recommended first implementation sequence

1. **Preserve this audit as the baseline.** No emergency runtime fix is justified by the current data.
2. **Metadata remediation plan:** fill/verify the 123 missing `skill` values from source-aware mappings; do not infer them blindly from topic labels.
3. **Audit-rationale plan:** define how known source problems should use `review_status`, `review_note`, and future source-confidence metadata.
4. **Question-bank integrity guard design:** specify read-only warnings for review/eligibility conflicts, response-structure blockers, missing skill and paper completeness without conflating `active` with `practice_eligible`.
5. **Only then decide the implementation boundary:** either an authorised successor to the existing QA owner or a separate maintained integrity surface/tool with the appropriate seal/test treatment.
6. Question Metadata V2 should build on these verified integrity foundations rather than replacing them.

## Hard blockers vs warnings for future QA

Suggested classification, subject to acceptance before implementation:

### Candidate hard blockers before Practice eligibility

- unsupported/unanswerable response configuration;
- missing answer where automatic grading requires one;
- unresolved multipart structural blocker;
- unresolved review state, if the product rule is explicitly adopted;
- missing Past Paper identity where Past Paper attribution is required.

### Candidate warnings / remediation items

- missing `skill`;
- coarse or weak difficulty metadata;
- incomplete Practice-paper coverage relative to the original exam blueprint;
- known source correction/audit note absent;
- embedded/prerequisite skills not yet tagged.

Incomplete Practice-paper coverage should **not** automatically block Past Paper Practice because the accepted UX is explicitly based on currently available questions.

## Next checkpoint

The safest next substantive step is a **metadata-remediation map for the 123 missing-skill rows**, using trusted source/topic/question evidence and no automatic writes. In parallel, design the future integrity guard contract without modifying frozen runtime or Supabase SQL.
