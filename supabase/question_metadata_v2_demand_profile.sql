-- Question Metadata V2 — additive demand/evidence profile schema
-- Schema-only checkpoint. This file creates no profile data and changes no
-- existing Question Bank, curriculum mapping, historical answer, or runtime row.
--
-- Design boundary:
--   - one profile per physical public.questions row;
--   - five independently calibrated 0–3 demand dimensions;
--   - explicit HOLD dimensions instead of magic numeric values;
--   - source-evidence state kept separate from adaptive-use eligibility;
--   - teacher-only direct profile access;
--   - append-only profile audit history written by an internal trigger.

-- Fail rather than silently re-shape an unexpected pre-existing surface.
do $metadata_v2_preflight$
begin
  if to_regclass('public.question_demand_profile_v2') is not null
     or to_regclass('public.question_demand_profile_v2_history') is not null then
    raise exception 'Metadata V2 preflight failed: demand-profile table already exists.';
  end if;

  if to_regprocedure('public.is_teacher()') is null then
    raise exception 'Metadata V2 preflight failed: public.is_teacher() is required.';
  end if;

  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'Metadata V2 preflight failed: public.set_updated_at() is required.';
  end if;
end;
$metadata_v2_preflight$;

create table public.question_demand_profile_v2 (
  question_id uuid primary key
    references public.questions(id) on delete cascade,
  metadata_version text not null
    check (char_length(btrim(metadata_version)) between 1 and 64),

  procedural_demand smallint null
    check (procedural_demand is null or procedural_demand between 0 and 3),
  conceptual_reasoning smallint null
    check (conceptual_reasoning is null or conceptual_reasoning between 0 and 3),
  reading_context_load smallint null
    check (reading_context_load is null or reading_context_load between 0 and 3),
  visual_spatial_demand smallint null
    check (visual_spatial_demand is null or visual_spatial_demand between 0 and 3),
  response_complexity smallint null
    check (response_complexity is null or response_complexity between 0 and 3),

  held_dimensions text[] not null default '{}'::text[]
    check (
      array_position(held_dimensions, null) is null
      and held_dimensions <@ array[
        'procedural_demand',
        'conceptual_reasoning',
        'reading_context_load',
        'visual_spatial_demand',
        'response_complexity'
      ]::text[]
    ),

  source_evidence_status text not null default 'needs_review'
    check (source_evidence_status in ('verified', 'verified_with_correction', 'needs_review')),
  adaptive_use_status text not null default 'hold'
    check (adaptive_use_status in ('eligible', 'hold', 'excluded')),
  evidence_note text not null default ''
    check (char_length(evidence_note) <= 2000),
  profile_status text not null default 'draft'
    check (profile_status in ('draft', 'reviewed')),

  reviewed_at timestamptz null,
  reviewed_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint question_demand_profile_v2_reviewed_complete check (
    profile_status <> 'reviewed'
    or (
      char_length(btrim(evidence_note)) > 0
      and (
        (procedural_demand is null and 'procedural_demand' = any(held_dimensions))
        or (procedural_demand is not null and not ('procedural_demand' = any(held_dimensions)))
      )
      and (
        (conceptual_reasoning is null and 'conceptual_reasoning' = any(held_dimensions))
        or (conceptual_reasoning is not null and not ('conceptual_reasoning' = any(held_dimensions)))
      )
      and (
        (reading_context_load is null and 'reading_context_load' = any(held_dimensions))
        or (reading_context_load is not null and not ('reading_context_load' = any(held_dimensions)))
      )
      and (
        (visual_spatial_demand is null and 'visual_spatial_demand' = any(held_dimensions))
        or (visual_spatial_demand is not null and not ('visual_spatial_demand' = any(held_dimensions)))
      )
      and (
        (response_complexity is null and 'response_complexity' = any(held_dimensions))
        or (response_complexity is not null and not ('response_complexity' = any(held_dimensions)))
      )
    )
  ),

  constraint question_demand_profile_v2_adaptive_eligibility check (
    adaptive_use_status <> 'eligible'
    or (
      profile_status = 'reviewed'
      and source_evidence_status in ('verified', 'verified_with_correction')
      and cardinality(held_dimensions) = 0
      and procedural_demand is not null
      and conceptual_reasoning is not null
      and reading_context_load is not null
      and visual_spatial_demand is not null
      and response_complexity is not null
    )
  )
);

comment on table public.question_demand_profile_v2 is
  'Metadata V2 authored question-demand/source-evidence profile. Separate from legacy questions metadata and empirical student-performance calibration.';
comment on column public.question_demand_profile_v2.metadata_version is
  'Version of the authored Metadata V2 rubric semantics, not the Maths App release version.';
comment on column public.question_demand_profile_v2.held_dimensions is
  'Demand dimensions explicitly held because authoritative evidence is insufficient. Held scores remain NULL.';
comment on column public.question_demand_profile_v2.adaptive_use_status is
  'Explicit adaptive-diagnosis eligibility decision. Eligible rows must satisfy the database safety invariant.';

create table public.question_demand_profile_v2_history (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  changed_at timestamptz not null default now(),
  changed_by uuid null,
  old_profile jsonb null,
  new_profile jsonb null,
  question_identity jsonb not null default '{}'::jsonb
    check (jsonb_typeof(question_identity) = 'object')
);

create index question_demand_profile_v2_history_question_time_idx
  on public.question_demand_profile_v2_history (question_id, changed_at desc);

comment on table public.question_demand_profile_v2_history is
  'Append-only audit history for Metadata V2 demand profiles. Retains question identity even if the source question/profile is later deleted.';

create or replace function private.capture_question_demand_profile_v2_history()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_question_id uuid := coalesce(new.question_id, old.question_id);
  v_identity jsonb;
begin
  select jsonb_build_object(
    'question_id', q.id,
    'year_level', q.year_level,
    'source_type', q.source_type,
    'source', q.source,
    'exam_year', q.exam_year,
    'paper', q.paper,
    'question_number', q.question_number,
    'parent_question_number', q.parent_question_number,
    'part_label', q.part_label
  )
  into v_identity
  from public.questions q
  where q.id = v_question_id;

  if v_identity is null then
    select h.question_identity
    into v_identity
    from public.question_demand_profile_v2_history h
    where h.question_id = v_question_id
    order by h.changed_at desc, h.id desc
    limit 1;
  end if;

  insert into public.question_demand_profile_v2_history (
    question_id,
    operation,
    changed_by,
    old_profile,
    new_profile,
    question_identity
  ) values (
    v_question_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end,
    coalesce(v_identity, '{}'::jsonb)
  );

  return coalesce(new, old);
end;
$function$;

revoke all on function private.capture_question_demand_profile_v2_history()
  from public, anon, authenticated;

create trigger question_demand_profile_v2_set_updated_at
before update on public.question_demand_profile_v2
for each row execute function public.set_updated_at();

create trigger question_demand_profile_v2_capture_history
after insert or update or delete on public.question_demand_profile_v2
for each row execute function private.capture_question_demand_profile_v2_history();

alter table public.question_demand_profile_v2 enable row level security;
alter table public.question_demand_profile_v2_history enable row level security;

-- Make Data API privileges explicit. RLS remains the row-level authority.
revoke all on table public.question_demand_profile_v2 from public, anon, authenticated;
grant select, insert, update, delete on table public.question_demand_profile_v2 to authenticated;

revoke all on table public.question_demand_profile_v2_history from public, anon, authenticated;
grant select on table public.question_demand_profile_v2_history to authenticated;

create policy "teachers select question demand profile v2"
on public.question_demand_profile_v2
for select
to authenticated
using ((select public.is_teacher()));

create policy "teachers insert question demand profile v2"
on public.question_demand_profile_v2
for insert
to authenticated
with check ((select public.is_teacher()));

create policy "teachers update question demand profile v2"
on public.question_demand_profile_v2
for update
to authenticated
using ((select public.is_teacher()))
with check ((select public.is_teacher()));

create policy "teachers delete question demand profile v2"
on public.question_demand_profile_v2
for delete
to authenticated
using ((select public.is_teacher()));

create policy "teachers select question demand profile v2 history"
on public.question_demand_profile_v2_history
for select
to authenticated
using ((select public.is_teacher()));

comment on function private.capture_question_demand_profile_v2_history() is
  'Internal Metadata V2 audit trigger. SECURITY DEFINER is isolated in private schema, uses an empty search_path, and is not callable by browser roles.';
