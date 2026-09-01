-- V5.4E — Bulk Practice eligibility controls
-- Additive teacher-only RPC for atomic Question Bank bulk Practice management.
-- Reuses the V5.3D1 logical-question key, rejects topical per-question management,
-- keeps multipart logical questions together, and never changes legacy active.

create or replace function public.save_questions_practice_eligibility_v54e(
  p_question_ids uuid[],
  p_eligible boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_target boolean := coalesce(p_eligible,false);
  v_requested_ids uuid[] := '{}'::uuid[];
  v_target_ids uuid[] := '{}'::uuid[];
  v_requested_rows integer := 0;
  v_found_rows integer := 0;
  v_topical_rows integer := 0;
  v_logical_questions integer := 0;
  v_logical_rows integer := 0;
  v_updated_rows integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select coalesce(array_agg(distinct item.id), '{}'::uuid[])
  into v_requested_ids
  from unnest(coalesce(p_question_ids,'{}'::uuid[])) as item(id)
  where item.id is not null;

  v_requested_rows := coalesce(cardinality(v_requested_ids),0);
  if v_requested_rows < 1 then
    raise exception 'Select at least one question';
  end if;
  if v_requested_rows > 500 then
    raise exception 'Bulk Practice changes are limited to 500 selected rows at a time';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where lower(trim(coalesce(q.source_type,''))) = 'topical_exercise'
    )::integer
  into v_found_rows, v_topical_rows
  from public.questions q
  where q.id = any(v_requested_ids);

  if v_found_rows <> v_requested_rows then
    raise exception 'One or more selected questions could not be found';
  end if;

  if v_topical_rows > 0 then
    raise exception 'Topical Practice eligibility is managed for whole resource sets. Deselect topical rows and use the Topical Exercise Resource Library.';
  end if;

  with selected_groups as (
    select distinct
      q.year_level,
      public.practice_logical_item_key_v53d1(
        q.id,
        q.parent_question_number,
        q.exam_year,
        q.paper,
        q.source_type,
        q.source
      ) as logical_key
    from public.questions q
    where q.id = any(v_requested_ids)
      and lower(trim(coalesce(q.source_type,''))) <> 'topical_exercise'
  ),
  target_rows as (
    select distinct q.id
    from public.questions q
    join selected_groups g
      on g.year_level = q.year_level
     and public.practice_logical_item_key_v53d1(
       q.id,
       q.parent_question_number,
       q.exam_year,
       q.paper,
       q.source_type,
       q.source
     ) = g.logical_key
    where lower(trim(coalesce(q.source_type,''))) <> 'topical_exercise'
  )
  select
    coalesce(array_agg(tr.id), '{}'::uuid[]),
    (select count(*)::integer from selected_groups)
  into v_target_ids, v_logical_questions
  from target_rows tr;

  v_logical_rows := coalesce(cardinality(v_target_ids),0);
  if v_logical_questions < 1 or v_logical_rows < 1 then
    raise exception 'Practice logical questions could not be resolved';
  end if;

  update public.questions q
  set practice_eligible = v_target,
      updated_at = now()
  where q.id = any(v_target_ids)
    and lower(trim(coalesce(q.source_type,''))) <> 'topical_exercise'
    and q.practice_eligible is distinct from v_target;

  get diagnostics v_updated_rows = row_count;

  return jsonb_build_object(
    'requested_rows',v_requested_rows,
    'logical_questions',v_logical_questions,
    'logical_rows',v_logical_rows,
    'eligible',v_target,
    'updated_rows',v_updated_rows,
    'topical_rows',0,
    'active_unchanged',true,
    'atomic',true
  );
end;
$function$;

revoke all on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) from public;
revoke all on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) from anon;
grant execute on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) to authenticated, service_role;

comment on function public.save_questions_practice_eligibility_v54e(uuid[],boolean) is
  'V5.4E teacher-only atomic bulk Practice eligibility writer. Rejects topical selections, deduplicates selected rows into non-topical logical questions, expands multipart groups, updates practice_eligible only, and leaves active unchanged.';
