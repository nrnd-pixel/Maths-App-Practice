# Missing Skill Metadata — Pre-change Snapshot

Last updated: 2026-09-13 (Brunei, UTC+08:00)

Status: **read-only production snapshot / no metadata writes authorised**.

Companion candidate map: `docs/MISSING_SKILL_REMEDIATION_MAP.md`

Companion source queue: `docs/MISSING_SKILL_SOURCE_IMAGE_REVIEW.md`

## Snapshot scope

Live production `public.questions` rows satisfying all of:

- `practice_eligible = true`;
- `skill` is null/blank;
- `exam_year in (2013, 2018, 2019)`;
- `paper = 'Paper 1'` after trim/case normalisation.

Observed production state at this checkpoint:

- rows: **123**;
- active rows: **123**;
- Practice-eligible rows: **123**;
- `needs_review` rows: **0**;
- earliest `updated_at`: `2026-09-01 23:25:59.580904+00`;
- latest `updated_at`: `2026-09-01 23:25:59.580904+00`.

All 123 rows therefore shared the same recorded `updated_at` value at snapshot time.

## Immutable snapshot fingerprint

The following SHA-256 was computed over the sorted concatenation of:

`id | exam_year | question_number | updated_at_utc | active | practice_eligible | review_status`

Snapshot SHA-256:

`74d32f47e7c9ef1f9d57b5fe5a54a158772bcaa011c204bfac2c70cf6e448ed2`

Canonical payload length at snapshot time: **10,744 characters**.

This fingerprint is intended as a drift detector before any future write. If the same query produces a different fingerprint, stop and remap the changed rows before applying metadata.

## Reproducible fingerprint query

```sql
with ordered as (
  select
    id::text as id,
    exam_year::text as exam_year,
    question_number,
    to_char(updated_at at time zone 'UTC','YYYY-MM-DD HH24:MI:SS.US') as updated_at_utc,
    active::text as active,
    practice_eligible::text as practice_eligible,
    review_status
  from public.questions
  where practice_eligible = true
    and coalesce(trim(skill),'') = ''
    and exam_year in (2013,2018,2019)
    and lower(trim(coalesce(paper,''))) = 'paper 1'
  order by exam_year, question_number, id
), material as (
  select string_agg(
    id || '|' || exam_year || '|' || question_number || '|' || updated_at_utc || '|' ||
    active || '|' || practice_eligible || '|' || review_status,
    E'\n'
  ) as payload
  from ordered
)
select
  encode(extensions.digest(payload,'sha256'),'hex') as snapshot_sha256,
  length(payload) as payload_chars
from material;
```

## Immutable-ID resolution query

Before preparing any write set, resolve the current immutable IDs again rather than trusting paper/question labels alone:

```sql
select
  id,
  exam_year,
  paper,
  question_number,
  parent_question_number,
  part_label,
  updated_at,
  active,
  practice_eligible,
  review_status
from public.questions
where practice_eligible = true
  and coalesce(trim(skill),'') = ''
  and exam_year in (2013,2018,2019)
  and lower(trim(coalesce(paper,''))) = 'paper 1'
order by exam_year,
  coalesce(nullif(regexp_replace(coalesce(parent_question_number, question_number),'[^0-9].*$','','g'),''),'999')::integer,
  coalesce(part_order,0),
  question_number;
```

The candidate remediation map remains keyed by source identity for human review. Any eventual production change set must translate each accepted source identity to the immutable `id` returned by this query and must include that ID explicitly.

## Pre-write guard

A future metadata update must stop if any proposed row has changed since this snapshot in a way that affects safety or interpretation, including:

- `skill` is no longer blank;
- `updated_at` changed unexpectedly;
- `active` changed;
- `practice_eligible` changed;
- `review_status` changed;
- source identity changed;
- the 123-row snapshot fingerprint no longer matches and the difference has not been reviewed.

Do not overwrite concurrent/manual metadata work simply to force this snapshot to match.

## 2019 Q39 multipart context note

The live rows for 2019 Q39 carry this shared `group_prompt`:

`Four boys obtained a total of 184 marks. There are 2 girls. The average of all 6 pupils is 57.`

This context is sufficient to explain the candidate skill for Q39(b), `Use a mean to find the mean of remaining values`: total marks are derived from the six-pupil mean, the boys' total is removed, and the remainder is divided by the two girls.

This resolves the mathematical-action ambiguity in the digital record, but it does **not** replace authoritative-paper provenance. Q39(b) should remain source-review pending until the original source is independently checked.

## What this snapshot does not authorise

This document does not authorise:

- updating the 123 `skill` values;
- adding curriculum graph mappings;
- changing Question Metadata V2 schema;
- changing Practice eligibility, `active`, answers, marks or response configuration;
- rewriting historical `session_answers` snapshots.

Any production metadata write remains a separate explicitly approved checkpoint.