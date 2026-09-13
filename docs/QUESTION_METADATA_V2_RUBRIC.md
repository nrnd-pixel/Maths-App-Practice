# Question Metadata V2 — Demand Rubric and Calibration Worksheet

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **draft rubric / read-only calibration artifact / no schema or production metadata write**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Companion architecture map: `docs/QUESTION_METADATA_V2_MAP.md`

## 1. Purpose

This document turns the proposed Metadata V2 demand dimensions into a concrete scoring rubric that can be independently applied by two reviewers before any database schema or bulk metadata work is accepted.

The rubric is intentionally small (0–3) to avoid false precision.

It describes **question demand**, not student ability and not empirical difficulty. A question can be procedurally demanding but conceptually routine, or visually demanding but computationally simple.

## 2. General scoring rules

1. Score the demand required by the question as presented to the student, not the sophistication of the ideal teacher solution.
2. Do not raise a score simply because a question appears late in a paper.
3. Do not use marks as a substitute for demand scoring; marks are supporting evidence only.
4. Use the original source visual/context where the score depends on a diagram/table/image. If that evidence is unavailable, mark the affected dimension `HOLD` rather than guessing.
5. For multipart questions, score each physical part against its own demand. Shared group context can influence the reading/visual score of each dependent part.
6. Keep curriculum skill mappings separate. PRIMARY/SECONDARY skills describe *what knowledge is involved*; the demand rubric describes *how the question asks the learner to use it*.

## 3. Dimension A — Procedural demand (`procedural_demand`)

How many linked routine operations/transformations or procedural decisions are required to reach the answer?

### 0 — No meaningful procedure

Recognition, recall, direct identification or a response with no calculation/transformation sequence.

Examples:
- identify a named shape/property from an obvious representation;
- state a directly read value;
- choose a fact without calculation.

### 1 — Single routine procedure

One familiar operation, conversion or directly signalled procedure.

Examples:
- subtract two decimals;
- convert one mixed number to an improper fraction;
- calculate one simple percentage/fraction value when no follow-up step is required.

### 2 — Two linked routine procedures

Two connected operations/transformations, or a routine procedure with a necessary follow-up conversion/comparison.

Examples:
- perform two operations in an expression;
- find a fraction of a set then subtract from the original;
- convert representations then order/compare them;
- calculate a percentage and then convert units.

### 3 — Multi-step / reverse / planned procedure

Three or more linked operations, a reverse/reconstruction process, or a sequence where the learner must plan the order rather than simply follow one direct routine.

Examples:
- fraction division requiring mixed-to-improper conversion, reciprocal multiplication and simplification;
- reconstruct an original amount from a fractional spend plus other purchases/remainder;
- combine several category totals/percentage relationships before comparing groups.

## 4. Dimension B — Conceptual reasoning (`conceptual_reasoning`)

How much relational or structural reasoning is required beyond executing a known routine?

### 0 — Direct execution

The required operation/form is explicit or strongly signalled; success mostly depends on carrying out the procedure accurately.

Examples:
- `Calculate ...` with one familiar operation;
- `Express 85% as a fraction`;
- direct decimal arithmetic.

### 1 — Familiar representation/choice

The learner must interpret a familiar representation, choose a standard transformation, or connect one straightforward concept to the required operation.

Examples:
- compare equivalent forms (fraction/decimal/percentage);
- interpret “left” as subtracting the sold part;
- combine a percentage calculation with a familiar unit conversion.

### 2 — Linked relationships / unstated intermediate idea

The learner must connect two or more conceptual relationships or create an intermediate representation not explicitly requested.

Examples:
- reason from eaten + remaining to the fraction given away;
- combine equivalent fractions with whole/remainder reasoning;
- use an embedded prerequisite skill that is not named in the top-level topic.

### 3 — Reverse modelling / coordinated constraints

The learner must reconstruct an unknown state, coordinate several conditions, or reason backwards/non-routinely from relationships.

Examples:
- find an original whole from a fractional spend and remaining money;
- infer category quantities from percentage-of-total and subgroup constraints;
- combine several geometric relationships where no single fact gives the answer.

## 5. Dimension C — Reading/context load (`reading_context_load`)

How much language/context information must the learner extract, retain and coordinate before doing the mathematics?

### 0 — Symbolic/minimal text

Essentially symbolic arithmetic or one short direct instruction with no contextual interpretation.

Examples:
- `6.26 − 5.2 + 4.615`;
- `Simplify: 3/4 ÷ 3 3/8`.

### 1 — Short single-relation context

One short sentence or simple context; the mathematical relationship is easy to identify.

Examples:
- `Express 60% of 3 kilometres in metres.`
- a short fraction-of-set story with one action.

### 2 — Multi-sentence / multiple quantities

The learner must track several quantities, events or relationships from the wording.

Examples:
- spent a fraction, bought another item, and had money left;
- ate some, gave some away, and retained a fraction of the whole.

### 3 — Dense / conditional / table-linked context

Several conditions or categories must be integrated, especially when information is split between prose and a table/diagram.

Examples:
- adult/child category totals plus percentages and subgroup counts;
- longer data/measurement situations with multiple constraints.

## 6. Dimension D — Visual-spatial demand (`visual_spatial_demand`)

How necessary is a visual representation to obtain or reason about the answer?

### 0 — No visual dependency

All required information is fully available in text/symbols.

### 1 — Supportive/simple visual

A picture/table is referenced or helpful, but the central reasoning is not strongly spatial and the information is simple/redundant.

Examples:
- a simple table naming categories when all required numbers are also stated;
- a basic pictorial representation used only for identification.

### 2 — Necessary visual interpretation

The learner must read a graph, diagram, map, geometric figure or visual arrangement to obtain essential relationships/data.

Examples:
- read a bar/line graph before calculation;
- use positions/directions from a map;
- infer an angle relationship from a diagram.

### 3 — Visual construction/transformation or dense spatial reasoning

The visual structure is central and requires constructing, transforming or coordinating several spatial relationships.

Examples:
- symmetry construction/shading;
- tessellation/construction;
- completing a graph;
- multi-relation geometry where the diagram must be actively decomposed.

### HOLD rule

If the question references a diagram/table/image but the authoritative visual is not available to the reviewer, use `HOLD` for this dimension rather than inferring from the text alone.

## 7. Dimension E — Response complexity (`response_complexity`)

How complex is the student-facing response format, independently of the mathematical reasoning?

### 0 — Single simple response

One number, short text answer, or one fraction without a special response structure.

### 1 — Single constrained/formatted response

One answer with an additional format requirement.

Examples:
- number + unit;
- fraction explicitly required in simplest form;
- ordered sequence/list in a single response.

### 2 — Multiple coordinated auto-marked responses

Several blanks/selections/entries must be supplied together or a multipart auto-marked response structure is required.

Examples:
- multi-blank answer;
- multi-select answer;
- several linked entries from one question part.

### 3 — Construction/manual/mixed response

The response cannot be faithfully represented as a simple scalar/list and requires drawing, construction, graph completion or teacher/manual review.

Examples:
- draw/construct a shape;
- shade symmetry;
- complete a graph;
- manual-response explanation.

## 8. What is deliberately NOT scored here

### Primary/secondary skill count

Use `question_skill_map`; do not manually duplicate this in the demand profile.

### Prerequisite/dependency load

Derive from the PRIMARY skill and `skill_relationships` after mapping coverage is trusted.

### Empirical difficulty

Later calibration should use real response data and sample size. Do not convert observed student performance directly into an authored 0–3 demand score.

### Paper position

Record assessment stage separately if useful. Do not inflate demand because a question is late in a paper.

## 9. Source/evidence states

Use these separately from the five demand scores.

### `source_evidence_status`

- `verified` — prompt/visual/answer configuration checked against authoritative source;
- `verified_with_correction` — source contains a known issue and the digital version has an explicit documented correction;
- `needs_review` — source/configuration is not yet reliable enough for adaptive interpretation.

### `adaptive_use_status`

- `eligible` — may be considered once all other readiness rules pass;
- `hold` — do not use for adaptive diagnosis yet;
- `excluded` — deliberately not suitable for adaptive diagnosis under the current model.

These states must never be collapsed into one ambiguous “confidence” field.

## 10. Calibration sample — Reviewer A provisional ratings

These ratings are a first-pass application of the rubric using the stored production question text/config and existing curriculum mappings. They are **not production metadata**.

| Paper / Q | Brief task | Proc | Concept | Reading | Visual | Response | Reviewer-A rationale |
|---|---|---:|---:|---:|---:|---:|---|
| 2025 P1 Q2 | Subtract 5.3 from 19.47 | 1 | 0 | 0 | 0 | 0 | One direct decimal subtraction. |
| 2025 P1 Q14 | Order 70%, 0.6, 3/10, 1.2 descending | 2 | 1 | 0 | 0 | 1 | Convert/compare mixed representations, then order; output is an ordered sequence. |
| 2025 P1 Q20 | 90 pears, sell 3/5, find left | 2 | 1 | 1 | 0 | 0 | Fraction-of-set plus remainder; short single-relation story. |
| 2025 P1 Q34 | Spent 2/3, bought shoes, had money left; find original | 3 | 3 | 2 | 0 | 0 | Reverse reconstruction with several linked monetary conditions. |
| 2025 P2 Q3 | 6.26 − 5.2 + 4.615 | 2 | 0 | 0 | 0 | 0 | Two linked decimal operations, no contextual interpretation. |
| 2025 P2 Q4 | 3/4 ÷ 3 3/8, simplest form | 3 | 1 | 0 | 0 | 1 | Convert mixed number, invert/multiply, simplify; constrained fraction form. |
| 2025 P2 Q11 | 60% of 3 km in metres | 2 | 1 | 1 | 0 | 1 | Percentage calculation plus unit conversion; number+unit response. |
| 2025 P2 Q24 | Pizza: ate pieces, has 3/8 left, find fraction given away | 3 | 2 | 2 | 0 | 1 | Coordinate whole/eaten/remaining, use equivalent fractions, derive missing part; simplest-form fraction. |

## 11. Source-hold example

2025 Paper 2 Q30 is a useful high-demand candidate, but the stored text references `Table 2` while `image_url` is blank.

The prose appears mathematically sufficient to derive the required relationship, but the authoritative table should be checked before assigning a final visual-spatial score or source-evidence status.

Provisional non-visual dimensions from stored text only:

- procedural demand: **3**;
- conceptual reasoning: **3**;
- reading/context load: **3**;
- visual-spatial demand: **HOLD**;
- response complexity: **0**.

This is an example of the intended discipline: incomplete source evidence should create a hold, not a confident guessed score.

## 12. Reviewer B worksheet

A second reviewer should independently score the same eight calibration questions **without reading the Reviewer-A rationale first if possible**.

| Paper / Q | Proc B | Concept B | Reading B | Visual B | Response B | Notes / disagreement reason |
|---|---:|---:|---:|---:|---:|---|
| 2025 P1 Q2 |  |  |  |  |  |  |
| 2025 P1 Q14 |  |  |  |  |  |  |
| 2025 P1 Q20 |  |  |  |  |  |  |
| 2025 P1 Q34 |  |  |  |  |  |  |
| 2025 P2 Q3 |  |  |  |  |  |  |
| 2025 P2 Q4 |  |  |  |  |  |  |
| 2025 P2 Q11 |  |  |  |  |  |  |
| 2025 P2 Q24 |  |  |  |  |  |  |

## 13. How to resolve reviewer differences

Do not average disagreements automatically.

For each different rating:

1. quote the rubric boundary each reviewer used;
2. identify whether the disagreement came from missing source evidence, different interpretation of a level, or actual ambiguity in the question;
3. revise the rubric wording/examples if the level boundary is ambiguous;
4. re-score that question after the rubric revision;
5. preserve unresolved source-dependent questions as `HOLD`.

A disagreement of more than one level on any dimension is a strong signal that the rubric or evidence is not ready for bulk use.

Before schema implementation, the project should reach a point where the reviewed sample has no unresolved >1-level disagreements and reviewers can explain any remaining adjacent-level differences consistently.

## 14. Recommended expansion sample after calibration

If the initial eight-question review is coherent, expand to a deliberately diverse source-verified sample covering:

- direct arithmetic;
- fraction/percentage multi-step reasoning;
- time/unit conversion;
- ratio/rate;
- data interpretation;
- position/direction;
- angle/geometry diagram reasoning;
- multi-blank/multi-select;
- drawing/construction/manual response;
- at least one multipart logical question.

Do not bulk-score the whole bank before those categories are represented.

## 15. Next checkpoint

This rubric is ready for independent Reviewer-B scoring.

No database migration, Question Bank row update, curriculum mapping expansion or adaptive-pilot expansion should be triggered from this document alone.
