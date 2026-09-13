# Question Metadata V2 — Additive Schema Design

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **schema design proposal only / no DDL applied / no production metadata write**.

Repository baseline: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Calibration gate: PASSED in `docs/QUESTION_METADATA_V2_RECONCILIATION.md`.

## 1. Decision

The first Metadata V2 schema should be additive and narrow:

1. keep `questions.strand/topic/subtopic/skill/difficulty` unchanged;
2. keep the existing curriculum registry and `question_skill_map` as the canonical skill graph;
3. do not repurpose sparse `question_skill_map.cognitive_level`, `question_purpose` or edge-level `difficulty` as whole-question demand metadata;
4. add one typed, one-row-per-question demand/evidence profile table;
5. add an append-only audit-history table for that profile;
6. expose the profile directly to teachers only; future student/adaptive consumption must go through a separately reviewed server-authoritative contract;
7. do not populate the table in the schema-only PR.

Working table name:

`public.question_demand_profile_v2`

This is a schema proposal, not authorisation to create the table.

## 2. Why a separate table

Demand dimensions are properties of the question as presented, not properties of a question-to-skill edge. Putting them on `question_skill_map` would duplicate whole-question values across PRIMARY/SECONDARY edges and blur skill semantics.

Putting many new nullable columns directly on `questions` would expand a heavily protected compatibility surface consumed by Practice, Exam, assignments and teacher reporting.

A separate table therefore preserves the current runtime contract while allowing independently reviewed Metadata V2 evidence.

## 3. Proposed profile columns

| Column | Type | Null/default | Purpose |
|---|---|---|---|
| `question_id` | `uuid` | PK, not null | One profile per physical question row; FK to `questions(id)` |
| `metadata_version` | `text` | not null | Version of the demand rubric/profile semantics, not app version |
| `procedural_demand` | `smallint` | nullable | Reviewed 0–3 procedural-demand score |
| `conceptual_reasoning` | `smallint` | nullable | Reviewed 0–3 conceptual-reasoning score |
| `reading_context_load` | `smallint` | nullable | Reviewed 0–3 reading/context score |
| `visual_spatial_demand` | `smallint` | nullable | Reviewed 0–3 visual/spatial score |
| `response_complexity` | `smallint` | nullable | Reviewed 0–3 response-complexity score |
| `held_dimensions` | `text[]` | not null, default `{}` | Explicit dimensions on HOLD because evidence is insufficient |
| `source_evidence_status` | `text` | not null, default `needs_review` | `verified`, `verified_with_correction`, `needs_review` |
| `adaptive_use_status` | `text` | not null, default `hold` | `eligible`, `hold`, `excluded` |
| `evidence_note` | `text` | not null, default empty | Concise reviewer/source rationale |
| `profile_status` | `text` | not null, default `draft` | `draft` or `reviewed` |
| `reviewed_at` | `timestamptz` | nullable | Review completion timestamp |
| `reviewed_by` | `uuid` | nullable | Optional FK to `auth.users(id)`; null remains valid for controlled system/admin review |
| `created_at` | `timestamptz` | not null, default `now()` | Provenance |
| `updated_at` | `timestamptz` | not null, default `now()` | Updated by standard timestamp trigger |

### Deferred field: `assessment_stage`

Do **not** include `assessment_stage` in the first schema migration yet.

The architecture map identified early/middle/late demand bands as potentially useful for Paper 2 Blueprint Practice, but that dimension has not gone through the same calibration exercise as the five accepted demand scores. It can be added later after its semantics are independently reviewed.

## 4. Score and HOLD representation

The five score columns remain typed numeric values (`smallint`, 0–3). Do not use magic values such as `-1` or `9` for HOLD.

`held_dimensions` makes source-dependent uncertainty explicit while allowing other dimensions to be scored. Allowed values are exactly:

- `procedural_demand`
- `conceptual_reasoning`
- `reading_context_load`
- `visual_spatial_demand`
- `response_complexity`

For a reviewed profile:

- each dimension must either have a 0–3 score or appear in `held_dimensions`;
- a held dimension must have a null score;
- a non-held dimension must have a non-null score.

This directly represents cases such as 2025 Paper 2 Q30, where some dimensions can be supported while others remain on HOLD because authoritative Table 2 evidence is missing.

Draft profiles may be incomplete.

## 5. Core constraints

The migration proposal should enforce all of the following at the database boundary.

### Score ranges

Each non-null demand score must be between 0 and 3 inclusive.

### Controlled states

`source_evidence_status`:

- `verified`
- `verified_with_correction`
- `needs_review`

`adaptive_use_status`:

- `eligible`
- `hold`
- `excluded`

`profile_status`:

- `draft`
- `reviewed`

### Reviewed-profile completeness

A `reviewed` profile must have every demand dimension either scored or explicitly held, and `evidence_note` must contain a non-blank rationale.

### Adaptive eligibility invariant

`adaptive_use_status='eligible'` is permitted only when:

- `profile_status='reviewed'`;
- `source_evidence_status IN ('verified','verified_with_correction')`;
- `held_dimensions` is empty;
- all five demand scores are present.

This is a database safety invariant, not merely an application convention.

A profile with `source_evidence_status='needs_review'` can never be adaptive-eligible.

### Question lifecycle

`question_id` should reference `public.questions(id) ON DELETE CASCADE`.

Reason: adding Metadata V2 must not unexpectedly block an existing valid question deletion. Durable profile-change history is preserved separately.

## 6. Metadata-version semantics

`metadata_version` identifies the authored rubric semantics, not the Maths App release.

Recommended first value for the controlled pilot:

`v2.0-r1`

Do not hard-code one permitted value in the table constraint; future rubric versions should be able to coexist operationally without another structural migration. Require only a non-blank, bounded text value.

Because the profile remains one row per question, changing rubric version means an explicit reviewed update of that profile, captured by audit history. Historical student attempts are not rewritten.

## 7. Audit history

Add a separate append-only table:

`public.question_demand_profile_v2_history`

Recommended fields:

- `id uuid primary key default gen_random_uuid()`;
- `question_id uuid not null` — retained as immutable identity but intentionally not cascade-deleted with `questions`;
- `operation text not null` — `INSERT`, `UPDATE`, or `DELETE`;
- `changed_at timestamptz not null default now()`;
- `changed_by uuid null` — `auth.uid()` when available; null for controlled system/admin SQL is acceptable and matches existing Question Bank audit convention;
- `old_profile jsonb null`;
- `new_profile jsonb null`;
- `question_identity jsonb not null default '{}'` — source/year/paper/question identity snapshot for durable audit context.

Use an `AFTER INSERT OR UPDATE OR DELETE` trigger on `question_demand_profile_v2`.

The trigger should be implemented through a tightly scoped internal function with an empty `search_path`; if `SECURITY DEFINER` is required to write the protected history table, keep the function outside the public Data API surface (prefer the existing `private` schema) and do not grant direct execution to browser roles.

Do not reuse `question_change_history`: that table records changes to the legacy `questions` row, whereas Metadata V2 is a separate evidence surface with its own lifecycle.

## 8. RLS and access model

Production already uses `public.is_teacher()` to check membership in `teacher_profiles`. Reuse that accepted teacher-authority predicate rather than inventing a second role system.

### `question_demand_profile_v2`

Enable RLS.

Initial policies:

- teacher SELECT: authenticated + `is_teacher()`;
- teacher INSERT: authenticated + `is_teacher()`;
- teacher UPDATE: authenticated + `is_teacher()` in both `USING` and `WITH CHECK`;
- teacher DELETE: authenticated + `is_teacher()`.

Do **not** create an anon/student direct-read policy in the first schema phase.

Reason: demand scores, source-evidence state and reviewer notes are internal diagnostic metadata. Future student/adaptive consumers should receive only the minimum necessary fields through a separately reviewed server-authoritative RPC/view contract.

### `question_demand_profile_v2_history`

Enable RLS.

- teacher SELECT only via `is_teacher()`;
- no browser INSERT/UPDATE/DELETE policy;
- writes occur only through the audit trigger/internal function.

Explicitly review Data API grants during migration so that RLS and grants agree. Do not rely on default grants.

## 9. Existing-schema compatibility findings

Read-only production mapping confirmed:

- all curriculum/skill registry tables already have RLS enabled;
- teacher mutation policies use `is_teacher()`;
- `question_skill_map` enforces at most one active PRIMARY mapping per question through `question_skill_map_one_active_primary_idx`;
- `question_skill_map` currently contains 39 edges;
- current database-function search found no function reading `question_skill_map.cognitive_level` or `question_purpose`;
- current database-function search found no existing `question_demand_profile` consumer;
- `adaptive_route_preview_v1` is the current production function that reads `question_skill_map`;
- legacy `questions` remains separately protected by its update timestamp, history, published-exam integrity and V5.4H Practice/review safety triggers.

Therefore the V2 profile can be added without changing current question retrieval, Practice selection, Exam, assignments, reports or the V5.9B pilot.

## 10. No automatic adaptive-readiness view in the first migration

Do not create a general `adaptive_ready_questions` view/function in the schema-only PR.

The future readiness predicate also depends on:

- one accepted active PRIMARY curriculum mapping;
- mapping confidence;
- Practice/review exposure state;
- supported response type;
- prerequisite diagnostic-question safety;
- the new reviewed demand/evidence profile.

Those cross-table semantics should be implemented only after the profile schema and a small controlled data pilot are accepted.

## 11. Schema-only PR boundary

A future Metadata V2 schema PR should contain only:

- the additive profile table;
- profile constraints;
- profile RLS/grants;
- updated-at trigger;
- append-only profile history table and audit trigger;
- a dedicated static verifier for exact constraints/RLS/audit boundaries;
- required Supabase-tree and Option 2A/2B/2C successor-seal maintenance.

It should contain **no**:

- production question-demand rows;
- curriculum mapping expansion;
- browser runtime JS changes;
- `config.js`/loader changes;
- version bump;
- Practice selection changes;
- teacher dashboard changes;
- adaptive-pilot expansion.

## 12. Expected repository/CI impact when implementation is separately approved

Because all Supabase SQL is a high-risk/frozen boundary, implementation must begin from the exact then-current `main` and use a new branch.

Expected files:

1. one newly generated Supabase migration file;
2. one dedicated static verifier under `site/tests/`;
3. `.github/workflows/ci.yml` only to register the verifier if required by the maintained verifier pattern;
4. Option 2A/2B/2C and Supabase-tree successor seals only where the new migration/verifier bytes require it.

No runtime `site/*.js` file should change.

Validation before any merge:

- migration applies cleanly on a disposable/dev database or equivalent controlled validation target;
- all constraints are positively and negatively tested;
- RLS confirms non-teachers cannot mutate/read the profile and history surfaces;
- adaptive eligibility invariant rejects unsafe combinations;
- history trigger records insert/update/delete correctly;
- rollback of the **empty schema-only** migration is documented/tested;
- maintained static verifiers pass;
- named Playwright hard gates remain green;
- full `npm test` remains green;
- exact PR-head CI is inspected;
- no merge without explicit user instruction.

## 13. Data-pilot boundary after schema acceptance

The first data population must be a separate accepted checkpoint from the schema PR.

Recommended pilot: the eight source-complete 2025 P1/P2 calibration questions from the reconciled sample, excluding source-dependent Q30.

For each pilot row:

- use immutable question UUID;
- use reconciled 0–3 scores;
- use explicit source-evidence/adaptive statuses;
- preserve the current V5.9B allow-list unchanged;
- do not change `questions`, `question_skill_map`, historical `session_answers`, or Practice behaviour.

The data pilot should prove audit/RLS/readiness semantics before broader profiling begins.

## 14. Explicit non-goals

The first Metadata V2 schema does not:

- replace legacy skill/difficulty fields;
- create a new curriculum graph;
- bulk-map questions to skills;
- store prerequisite lists manually;
- store empirical difficulty/student success in the authored profile;
- auto-enable adaptive diagnosis;
- change current student/teacher UI;
- alter historical student evidence;
- add Paper 2 blueprint stage metadata before that dimension is separately calibrated.

## 15. Decision checkpoint

This design is ready for technical review.

The next step, if explicitly accepted, is to prepare a **schema-only migration plan/PR** from the exact current `main` with no production profile data. Until that separate approval, no DDL should be applied to production Supabase.
