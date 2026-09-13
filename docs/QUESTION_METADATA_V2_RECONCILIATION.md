# Question Metadata V2 — Reviewer Reconciliation

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **calibration gate passed for schema design only / no schema or production metadata write**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Issue: #246

Reviewer-B blind result was frozen first in `docs/QUESTION_METADATA_V2_REVIEWER_B_RESULT.md` at commit `2e0739576a0035d5c9bde67daa495a91a73341cb`. Reviewer-A scores were read only after that commit existed.

## Acceptance rule

Do not average disagreements automatically. Resolve each difference against the written rubric boundary; preserve source-dependent uncertainty as `HOLD`.

Before schema design, there must be no unresolved disagreement greater than one level on any dimension.

## Calibration comparison

| Paper / Q | Proc A/B | Concept A/B | Reading A/B | Visual A/B | Response A/B | Status |
|---|---:|---:|---:|---:|---:|---|
| 2025 P1 Q2 | 1/1 | 0/0 | 0/0 | 0/0 | 0/0 | exact |
| 2025 P1 Q14 | 2/2 | 1/2 | 0/0 | 0/0 | 1/1 | one adjacent difference |
| 2025 P1 Q20 | 2/2 | 1/1 | 1/1 | 0/0 | 0/0 | exact |
| 2025 P1 Q34 | 3/3 | 3/3 | 2/2 | 0/0 | 0/0 | exact |
| 2025 P2 Q3 | 2/2 | 0/0 | 0/0 | 0/0 | 0/0 | exact |
| 2025 P2 Q4 | 3/3 | 1/0 | 0/0 | 0/0 | 1/1 | one adjacent difference |
| 2025 P2 Q11 | 2/2 | 1/1 | 1/0 | 0/0 | 1/1 | one adjacent difference |
| 2025 P2 Q24 | 3/3 | 2/2 | 2/2 | 0/0 | 1/1 | exact |

Across the eight-question sample there are **40 scored dimensions**:

- exact agreements: **37/40 (92.5%)**;
- adjacent one-level differences: **3/40 (7.5%)**;
- differences greater than one level: **0**;
- source-dependent HOLDs in the core eight: **0**.

## Reconciliation of adjacent differences

### 1. 2025 P1 Q14 — conceptual reasoning

- Reviewer A: **1** (`familiar representation/choice`).
- Reviewer B: **2** (`linked relationships / unstated intermediate idea`).

Reviewer B treated the coordination of four values across percentage, decimal and fraction forms as several linked representation relationships.

The full rubric explicitly places **compare equivalent forms (fraction/decimal/percentage)** at Concept **1**. The multiple conversions/order operations raise procedural demand to 2, but they do not create a separate unstated conceptual structure.

**Reconciled score: 1.**

Cause: reasonable adjacent judgement difference from the condensed blind packet. No rubric wording change required because the full rubric already states this boundary explicitly.

### 2. 2025 P2 Q4 — conceptual reasoning

- Reviewer A: **1** (`familiar transformation choice`).
- Reviewer B: **0** (`direct execution`).

Reviewer B intentionally separated the long standard algorithm from conceptual demand and treated the item as direct execution.

The full rubric defines Concept **1** to include choosing a standard transformation/representation. Converting the mixed number before fraction division is therefore a familiar representation choice even though the overall procedure is routine.

**Reconciled score: 1.**

Cause: adjacent interpretation difference. No rubric wording change required.

### 3. 2025 P2 Q11 — reading/context load

- Reviewer A: **1** (`short single-relation context`).
- Reviewer B: **0** (`symbolic/minimal text`).

Reviewer B treated the short direct instruction as minimal text. The full rubric explicitly uses a percentage-of-distance/unit-conversion statement of this form as a Reading **1** example, because the learner must parse the quantity relationship and unit context from natural language.

**Reconciled score: 1.**

Cause: adjacent boundary difference caused by the deliberately condensed blind packet. No rubric wording change required because the full rubric contains an explicit matching example.

## Reconciled calibration scores

| Paper / Q | Proc | Concept | Reading | Visual | Response |
|---|---:|---:|---:|---:|---:|
| 2025 P1 Q2 | 1 | 0 | 0 | 0 | 0 |
| 2025 P1 Q14 | 2 | 1 | 0 | 0 | 1 |
| 2025 P1 Q20 | 2 | 1 | 1 | 0 | 0 |
| 2025 P1 Q34 | 3 | 3 | 2 | 0 | 0 |
| 2025 P2 Q3 | 2 | 0 | 0 | 0 | 0 |
| 2025 P2 Q4 | 3 | 1 | 0 | 0 | 1 |
| 2025 P2 Q11 | 2 | 1 | 1 | 0 | 1 |
| 2025 P2 Q24 | 3 | 2 | 2 | 0 | 1 |

## Optional source-hold check — 2025 Paper 2 Q30

Reviewer A provisional values from stored text only were Proc 3 / Concept 3 / Reading 3 / Visual HOLD / Response 0.

Reviewer B independently scored Proc HOLD / Concept HOLD / Reading 3 / Visual HOLD / Response 0 because the stored prompt references a missing authoritative `Table 2`.

For project safety, retain the **more conservative HOLD** for procedural, conceptual and visual demand until the authoritative table is available. This optional source-hold challenge is not part of the eight-question acceptance denominator and demonstrates the intended rule: missing source evidence is never averaged into a confident score.

## Gate result

The initial Metadata V2 calibration gate **passes**:

- Reviewer B completed all eight questions blind;
- reconciliation occurred only afterward;
- 37/40 dimensions agreed exactly;
- the remaining 3 differences were adjacent and are resolved by existing rubric boundaries;
- there are no unresolved >1-level disagreements;
- no core-sample source HOLD remains hidden;
- Q30 source uncertainty remains explicit as HOLD;
- no rubric wording change is required at this checkpoint.

Passing this gate authorizes **schema design only**. It does not authorize a production migration, Question Bank bulk write, curriculum-map expansion, or V5.9B adaptive rollout.
