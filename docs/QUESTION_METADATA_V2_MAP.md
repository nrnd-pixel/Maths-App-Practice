# Question Metadata V2 — Architecture and Migration Map

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **read-only architecture map / no schema change / no production metadata write**.

Repository baseline mapped: `8445ad060438c22b9c31054a1bd0e1b2f1a58c07`

Production Maths Supabase project mapped: `lmveznstltjxzpalcmid`

## 1. Purpose

Question Metadata V2 is intended to make the Question Bank useful for richer diagnostics, teacher insight and later adaptive practice without breaking the current V5.9 Practice/Exam/reporting contracts.

The central design requirement is additive compatibility:

- current `questions.strand/topic/subtopic/skill/difficulty` remain valid legacy/runtime fields;
- current Practice, Past Paper, Exam, assignment and teacher analytics behaviour must remain unchanged until an explicit successor is accepted;
- richer curriculum mappings and cognitive-demand metadata live alongside the legacy fields rather than silently redefining them;
- source confidence and adaptive suitability must be explicit enough that a source/data problem cannot become a false learning diagnosis.

## 2. Current `questions` metadata surface

The production `questions` table currently has 31 columns. The first-level educational metadata is:

- `strand`
- `topic`
- `subtopic`
- `skill`
- `difficulty`

Other relevant boundaries include:

- `source_type`, `source`, exam identity fields;
- response type/configuration;
- multipart identity fields;
- `review_status` / `review_note`;
- `active` and `practice_eligible` as separate exposure domains.

Current production counts at this checkpoint:

- total question rows: **1,003**;
- ordinary-Practice eligible: **655**;
- Practice rows with blank `skill`: **123**;
- Practice rows with blank `subtopic`: **123**;
- Practice rows with missing hint: **0**;
- Practice rows with missing explanation: **0**;
- unresolved `needs_review`: **0**.

Legacy difficulty distribution within ordinary Practice:

- `foundation`: 31;
- `standard`: 585;
- `challenge`: 39.

The Paper 2 analysis remains important context: within the separate 2020/2022-2025 digitised Paper 2 dataset, 169/170 rows were labelled `standard`, showing that the legacy difficulty field alone is not a sufficient description of exam demand.

## 3. Legacy metadata is a compatibility contract

The current fields are already used by multiple runtime and reporting paths, so V2 must not repurpose their meaning.

### Student question retrieval

`get_student_practice_questions_v53b` and `get_student_practice_questions_v53d3` return `strand`, `topic`, `subtopic`, `skill` and `difficulty` to the Practice client.

The same metadata surface also exists in the current general student-question and topical-question retrieval functions.

### Mixed-Practice selection

`site/practice-selection-engine.js` uses:

- `strand + topic` as the balancing key;
- `strand + topic + skill` as the skill-diversity key;
- legacy `difficulty` for challenge caps and recommendation-sensitive ordering.

A blank legacy skill therefore becomes an `unclassified` selection key. Fixing approved legacy skill labels has a real current-Practice benefit even before Metadata V2 is consumed directly.

### Historical answer snapshots

`session_answers` currently snapshots:

- `strand`
- `topic`
- `subtopic`
- `skill`

when a Practice session is submitted.

This is intentional historical evidence. Future correction of a Question Bank skill should not silently rewrite past `session_answers` rows.

### Teacher analytics

`get_teacher_past_paper_analytics_v56d` reads current question `topic/skill` for the question list and historical `session_answers.topic/skill` for attempt aggregation.

Implication: a future legacy-skill remediation improves future snapshots immediately, but old attempts can remain `Unclassified`. Do not bulk-rewrite historical attempt metadata merely to make reports look cleaner.

### Teacher Question Bank management

The existing bulk metadata editor explicitly supports only a low-risk whitelist:

`strand`, `topic`, `subtopic`, `skill`, `difficulty`, `source_type`.

It writes directly to `questions` and treats `topic` and `skill` as required when those fields are intentionally edited.

The V5.1B1 Question Bank QA overlay flags a blank `skill` as a metadata issue.

## 4. An existing curriculum registry already exists

Do **not** create a competing second curriculum-skill graph.

Production already contains:

- `curriculum_domains`
- `curriculum_skills`
- `curriculum_subskills`
- `question_skill_map`
- `skill_relationships`
- `misconceptions`
- `scaffolds`

Current coverage:

- curriculum domains: **19**;
- curriculum skills: **297**;
- curriculum subskills: **752**;
- question-skill mapping edges: **39**;
- active PRIMARY-mapped Practice questions: **21 / 655**;
- Practice questions with at least one SECONDARY mapping: **16 / 655**;
- skill relationships: **360**;
- misconceptions: **19**;
- scaffolds: **23**.

All 297 curriculum skills and all 360 skill relationships currently use `registry_version='1.0-draft'`. All 360 relationships are currently marked inferred.

The 123 Practice-eligible questions with blank legacy `skill` currently have **zero** PRIMARY and **zero** SECONDARY registry mappings.

Current mapped questions are concentrated in a small pilot subset, especially 2025 Paper 1 / Paper 2, plus one 2018 Paper 2 and one 2024 Paper 1 question.

## 5. Existing graph semantics are already useful

`question_skill_map` supports:

- one PRIMARY curriculum skill;
- zero or more SECONDARY skills;
- mapping reason;
- mapping confidence (`HIGH`, `MEDIUM`, `LOW`);
- optional legacy/pilot edge fields for difficulty, cognitive level and question purpose;
- active/inactive versioning behaviour.

A partial unique index already enforces **at most one active PRIMARY mapping per question**:

`question_skill_map_one_active_primary_idx`

The PRIMARY mapping is therefore a safe canonical target-skill concept once coverage is expanded.

The current mappings also demonstrate the embedded-skill model needed by the Paper 2 analysis. Example: a percentage question can have a PRIMARY percentage mastery and a SECONDARY metric-unit-conversion mastery.

## 6. Existing prerequisite/adaptive graph

`skill_relationships` already supports:

- `PREREQUISITE`
- `SUPPORTS`
- `EXTENDS`
- `RELATED`

with relationship strength and reason/source basis.

The current adaptive route preview:

1. resolves the question's active PRIMARY skill;
2. returns SECONDARY skills;
3. follows prerequisite/extension relationships;
4. finds mapped prerequisite questions;
5. attaches supported misconception/scaffold evidence.

Therefore **prerequisite/dependency load should not be duplicated as manually maintained text on `questions`**. It can be derived from the curriculum graph once mapping coverage is trustworthy.

Likewise, the number of combined concepts can eventually be derived from the active PRIMARY + SECONDARY skill mappings rather than manually stored as a second potentially drifting count.

## 7. Current adaptive-pilot boundary

The V5.9B pilot is still explicitly allow-listed and isolated.

At this checkpoint its allowed-question set contains **3** questions. All three:

- exist;
- are `active=true`;
- are `practice_eligible=true`;
- have no unresolved review state;
- have an active PRIMARY curriculum mapping.

The current pilot safe-question helper is based on `active=true` and pilot allow-listing. It does not yet implement a general Metadata-V2 readiness rule.

Any future promotion beyond the pilot should use an explicit adaptive-readiness contract rather than treating the mere presence of a mapping as sufficient evidence.

## 8. Recommended V2 architecture

### Layer A — keep the current legacy Question Bank fields

Keep the current scalar fields unchanged for compatibility:

- `strand`
- `topic`
- `subtopic`
- `skill`
- `difficulty`

Continue source-aware repair of missing legacy `skill` values because current Practice selection and reports consume them.

Do not automatically generate a legacy skill from the top-level topic.

### Layer B — expand the existing curriculum registry

Use the existing registry as the canonical structured skill layer:

- PRIMARY curriculum mastery: `question_skill_map.mapping_role='PRIMARY'`;
- embedded/secondary skills: SECONDARY mapping edges;
- prerequisite/related knowledge: `skill_relationships`;
- finer curriculum descriptions: existing `curriculum_subskills`;
- misconceptions and scaffolds: existing registry tables.

Do not create `primary_skill`, `secondary_skills[]` or `prerequisite_skills[]` columns on `questions`; that would duplicate a graph which already exists.

### Layer C — add a per-question demand/evidence profile only if accepted

The current registry does **not** cleanly represent the full multidimensional question demand identified by the Paper 2 analysis. If a schema phase is approved, the preferred additive object is a separate one-row-per-question profile table rather than many nullable columns on frozen `questions`.

Working name:

`question_demand_profile_v2`

Recommended authored fields:

- `question_id` — primary key / FK to `questions(id)`;
- `metadata_version` — version of the profile rubric;
- `procedural_demand` — ordinal 0–3;
- `conceptual_reasoning` — ordinal 0–3;
- `reading_context_load` — ordinal 0–3;
- `visual_spatial_demand` — ordinal 0–3;
- `response_complexity` — ordinal 0–3;
- `assessment_stage` — optional profile such as early/middle/late/not-applicable, defined per assessment blueprint rather than inferred blindly from row number;
- `source_evidence_status` — separate source confidence state;
- `adaptive_use_status` — separate decision about whether the question may contribute to adaptive diagnosis;
- `evidence_note` — concise source/reviewer rationale;
- `profile_status` — draft/reviewed;
- `reviewed_at`, `reviewed_by`;
- `created_at`, `updated_at`.

Suggested source-evidence values:

- `verified`
- `verified_with_correction`
- `needs_review`

Suggested adaptive-use values:

- `eligible`
- `hold`
- `excluded`

These should be separate fields. `excluded_from_adaptive` is an eligibility decision, not a source-confidence level.

### Values that should be derived, not duplicated

Do not manually store these if they can be reliably derived from the graph:

- primary skill;
- secondary skill list;
- concept-combination count;
- prerequisite/dependency list/load.

Before relying on derived values, require complete/accepted mapping coverage for that question.

### Performance difficulty/calibration should be a later evidence layer

Do not mix observed student performance into the authored demand profile.

A future calibration layer can derive question-level evidence such as:

- sample size;
- first-try success;
- mastery success;
- hint usage;
- response/review patterns;
- later discrimination/stability measures if enough data exists.

This keeps authored cognitive-demand judgements separate from empirical difficulty and avoids rewriting a question profile every time student performance changes.

## 9. What to do with `question_skill_map.difficulty/cognitive_level/question_purpose`

These fields already exist, but they are effectively unused today:

- `cognitive_level`: null on all 39 mapping edges;
- `question_purpose`: null on all 39 mapping edges;
- edge-level `difficulty`: populated on only 2 of 39 edges.

Do not silently reinterpret these sparse pilot fields as the new canonical V2 demand model.

Reasons:

1. they live on a question-to-skill **edge**, while reading load / visual demand / response complexity are properties of the question itself;
2. a question can have several SECONDARY edges, which would duplicate whole-question demand values;
3. the richer V2 dimensions need independent review/provenance;
4. repurposing them would blur pilot history and future semantics.

Before any retirement or migration of these fields, verify whether any current or dormant pilot code reads them.

## 10. Multipart rule

Current curriculum mappings attach to physical question rows, while Practice selection groups multipart parts using the established logical-item identity.

Only one currently mapped multipart part was found (2025 Paper 1 Q9(b)).

Recommended rule for V2:

- preserve `question_id` as the authoritative mapping/profile key;
- annotate each part according to the demand/skill it actually assesses;
- keep shared group context in the existing multipart fields;
- derive logical-item selection/summary information from the parts using the already-established Practice logical-item identity;
- do not introduce a second independently stored logical-question ID solely for V2.

Any future aggregation rule for multipart demand (for example maximum conceptual/visual demand across parts) must be defined and tested before adaptive selection consumes it.

## 11. The 123 missing legacy-skill rows need a two-plane remediation

Once authoritative source verification is available, remediation should be staged per immutable question ID.

Plane 1 — current compatibility metadata:

- approve/update `questions.skill` using the source-aware candidate map;
- update `subtopic` only where a trusted curriculum/source classification supports it; blank subtopic is not currently the critical selection defect;
- preserve all answer, marks, response, exam identity, exposure and review fields.

Plane 2 — structured curriculum mapping:

- assign exactly one active PRIMARY curriculum skill where evidence supports it;
- add SECONDARY mappings only for genuinely embedded skills;
- record mapping reason and confidence;
- do not infer PRIMARY/SECONDARY mappings solely from the legacy topic/skill strings.

Plane 3 — demand/evidence profile (after schema acceptance):

- assign reviewed demand dimensions;
- record source evidence status;
- keep questionable source rows on hold/excluded from adaptive use.

Do not rewrite historical `session_answers` snapshots during this remediation.

## 12. Proposed adaptive-readiness rule for future expansion

The current three-question pilot can remain explicitly allow-listed. A future general adaptive pathway should require a reusable readiness predicate approximately equivalent to:

- question is available in the intended exposure domain (`practice_eligible=true` for ordinary Practice);
- `review_status <> 'needs_review'` (already protected by V5.4H for Practice);
- one active PRIMARY curriculum mapping exists;
- mapping confidence meets the accepted threshold;
- demand/evidence profile is reviewed;
- source evidence is `verified` or `verified_with_correction`;
- adaptive-use status is `eligible`;
- response type is supported by the diagnostic path;
- any required prerequisite diagnostic questions pass the same safety contract.

Do not encode this predicate until the Metadata V2 schema/rubric is explicitly accepted.

## 13. Recommended implementation phases

### Metadata V2 Phase 0 — completed mapping checkpoint

- map existing schema and consumers;
- identify legacy compatibility contracts;
- discover/reuse the existing curriculum registry;
- quantify registry coverage and missing legacy metadata;
- define a no-write architecture recommendation.

### Metadata V2 Phase 1 — rubric and evidence review, no production write

- define the exact 0–3 demand rubric with worked examples;
- verify the 123 missing-skill source evidence;
- map candidate legacy skills to curriculum PRIMARY/SECONDARY skills;
- review the draft curriculum registry where it affects the target Year 6 questions;
- define source-evidence and adaptive-use criteria.

### Metadata V2 Phase 2 — schema-only proposal

Only after explicit acceptance:

- draft the additive demand-profile migration;
- preserve the existing registry tables;
- add static verifier/seal updates;
- test constraints, RLS/teacher authority and rollback/equivalence;
- no mass question metadata writes in the same PR.

### Metadata V2 Phase 3 — controlled data pilot

- populate a small verified set first (recommended: a reviewed subset of 2025 Paper 1/2 that already has curriculum mappings);
- compare teacher analytics / selection behaviour before and after;
- keep V5.9B allow-list isolated;
- require explicit acceptance before expanding coverage.

### Metadata V2 Phase 4 — broader mapping/remediation

- use immutable-ID change sets;
- batch by paper/source;
- require source-confidence review;
- preserve audit evidence;
- do not overwrite attempt history.

## 14. Explicit non-goals for the first V2 implementation

Do not:

- replace legacy `questions.skill` or `questions.difficulty`;
- change current Practice selection behaviour;
- change current teacher reports;
- auto-enable more adaptive questions;
- infer hundreds of mappings from topic strings without review;
- modify historical answer snapshots;
- merge curriculum graph, demand profile and performance calibration into one overloaded JSON field;
- make a framework/runtime architecture change as part of metadata work.

## 15. Recommended immediate next step

The safest next step is **rubric definition and evidence review, not DDL**.

Produce a reviewed Metadata V2 rubric with concrete Year 6 examples for each 0–3 demand dimension, then use a small sample of already-mapped 2025 questions to test whether two reviewers would classify demand consistently.

In parallel, continue source verification of the Medium-confidence 2013/2018/2019 Paper 1 missing-skill candidates. Only after those two evidence streams are stable should a schema migration or bulk metadata change be proposed.
