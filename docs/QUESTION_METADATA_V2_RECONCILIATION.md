# Question Metadata V2 — Reviewer Reconciliation

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **post-review reconciliation artifact / no schema or production metadata write**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Use only **after** Reviewer B has completed `docs/QUESTION_METADATA_V2_REVIEWER_B_PACKET.md` without reading Reviewer-A scores.

## Acceptance rule

Do not average disagreements automatically.

For each difference:

1. identify the exact rubric boundary each reviewer used;
2. classify the cause as source evidence, wording ambiguity, or genuine judgement difference;
3. revise the rubric only if the boundary itself is unclear;
4. re-score after any rubric revision;
5. preserve source-dependent uncertainty as `HOLD`.

Before schema implementation, there should be no unresolved disagreement greater than one level on any dimension, and remaining adjacent-level disagreements should be explainable consistently.

## Reviewer-A reference scores

| Paper / Q | Proc A | Concept A | Reading A | Visual A | Response A |
|---|---:|---:|---:|---:|---:|
| 2025 P1 Q2 | 1 | 0 | 0 | 0 | 0 |
| 2025 P1 Q14 | 2 | 1 | 0 | 0 | 1 |
| 2025 P1 Q20 | 2 | 1 | 1 | 0 | 0 |
| 2025 P1 Q34 | 3 | 3 | 2 | 0 | 0 |
| 2025 P2 Q3 | 2 | 0 | 0 | 0 | 0 |
| 2025 P2 Q4 | 3 | 1 | 0 | 0 | 1 |
| 2025 P2 Q11 | 2 | 1 | 1 | 0 | 1 |
| 2025 P2 Q24 | 3 | 2 | 2 | 0 | 1 |

## Reconciliation worksheet

Fill in Reviewer-B values after the blind review, then record whether each dimension agrees exactly, differs by one level, differs by more than one level, or is on `HOLD`.

| Paper / Q | Dimension | A | B | Delta/status | Boundary used by A | Boundary used by B | Resolution |
|---|---|---:|---:|---|---|---|---|
| 2025 P1 Q2 | Procedural | 1 |  |  | single routine procedure |  |  |
| 2025 P1 Q2 | Conceptual | 0 |  |  | direct execution |  |  |
| 2025 P1 Q2 | Reading | 0 |  |  | symbolic/minimal text |  |  |
| 2025 P1 Q2 | Visual | 0 |  |  | no visual dependency |  |  |
| 2025 P1 Q2 | Response | 0 |  |  | single simple response |  |  |
| 2025 P1 Q14 | Procedural | 2 |  |  | convert/compare then order |  |  |
| 2025 P1 Q14 | Conceptual | 1 |  |  | familiar representation/choice |  |  |
| 2025 P1 Q14 | Reading | 0 |  |  | symbolic/minimal text |  |  |
| 2025 P1 Q14 | Visual | 0 |  |  | no visual dependency |  |  |
| 2025 P1 Q14 | Response | 1 |  |  | ordered sequence |  |  |
| 2025 P1 Q20 | Procedural | 2 |  |  | fraction-of-set plus remainder |  |  |
| 2025 P1 Q20 | Conceptual | 1 |  |  | familiar remaining-part interpretation |  |  |
| 2025 P1 Q20 | Reading | 1 |  |  | short single-relation context |  |  |
| 2025 P1 Q20 | Visual | 0 |  |  | no visual dependency |  |  |
| 2025 P1 Q20 | Response | 0 |  |  | single simple response |  |  |
| 2025 P1 Q34 | Procedural | 3 |  |  | reverse/reconstruction sequence |  |  |
| 2025 P1 Q34 | Conceptual | 3 |  |  | reverse modelling/coordinated constraints |  |  |
| 2025 P1 Q34 | Reading | 2 |  |  | several quantities/events |  |  |
| 2025 P1 Q34 | Visual | 0 |  |  | no visual dependency |  |  |
| 2025 P1 Q34 | Response | 0 |  |  | single simple response |  |  |
| 2025 P2 Q3 | Procedural | 2 |  |  | two linked arithmetic operations |  |  |
| 2025 P2 Q3 | Conceptual | 0 |  |  | direct execution |  |  |
| 2025 P2 Q3 | Reading | 0 |  |  | symbolic/minimal text |  |  |
| 2025 P2 Q3 | Visual | 0 |  |  | no visual dependency |  |  |
| 2025 P2 Q3 | Response | 0 |  |  | single simple response |  |  |
| 2025 P2 Q4 | Procedural | 3 |  |  | mixed conversion + reciprocal multiplication + simplification |  |  |
| 2025 P2 Q4 | Conceptual | 1 |  |  | familiar transformation choice |  |  |
| 2025 P2 Q4 | Reading | 0 |  |  | symbolic/minimal text |  |  |
| 2025 P2 Q4 | Visual | 0 |  |  | no visual dependency |  |  |
| 2025 P2 Q4 | Response | 1 |  |  | simplest-form fraction |  |  |
| 2025 P2 Q11 | Procedural | 2 |  |  | percentage then unit conversion |  |  |
| 2025 P2 Q11 | Conceptual | 1 |  |  | familiar percentage + unit connection |  |  |
| 2025 P2 Q11 | Reading | 1 |  |  | short single-relation context |  |  |
| 2025 P2 Q11 | Visual | 0 |  |  | no visual dependency |  |  |
| 2025 P2 Q11 | Response | 1 |  |  | number + unit |  |  |
| 2025 P2 Q24 | Procedural | 3 |  |  | whole/eaten/remaining sequence |  |  |
| 2025 P2 Q24 | Conceptual | 2 |  |  | linked whole/remainder relationships |  |  |
| 2025 P2 Q24 | Reading | 2 |  |  | multiple quantities/events |  |  |
| 2025 P2 Q24 | Visual | 0 |  |  | no visual dependency in stored prompt |  |  |
| 2025 P2 Q24 | Response | 1 |  |  | simplest-form fraction |  |  |

## Reviewer-B summary

- Exact agreements:
- Adjacent-level disagreements:
- >1-level disagreements:
- HOLDs:
- Rubric wording changes required:
- Source evidence still needed:

## Optional source-hold check — 2025 Paper 2 Q30

Reviewer A provisional values from stored text only:

- Procedural: 3
- Conceptual: 3
- Reading: 3
- Visual: HOLD
- Response: 0

Do not resolve the visual score until the authoritative Table 2 source is available.

## Gate to the next phase

The Metadata V2 schema-design phase may begin only after:

- Reviewer B has independently completed the eight-question sample;
- reconciliation is recorded here;
- there are no unresolved >1-level disagreements;
- source-dependent HOLDs remain explicit rather than guessed;
- any rubric revisions are reflected back into `docs/QUESTION_METADATA_V2_RUBRIC.md`.

Passing this gate authorizes **schema design only**, not a production migration, Question Bank bulk write, curriculum-map expansion or V5.9B rollout.