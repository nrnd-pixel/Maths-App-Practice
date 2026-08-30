-- V5.3A — Unified Practice eligibility foundation
-- Applied to production as 20260830170751 v53a_practice_eligibility_foundation.
-- This stage introduces teacher-controlled eligibility only. Ordinary student Practice
-- retrieval remains unchanged until V5.3B.

alter table public.questions
  add column if not exists practice_eligible boolean not null default false;

comment on column public.questions.practice_eligible is
  'Teacher-controlled eligibility for the unified Practice resource pool. V5.3A stages this flag only; ordinary Practice retrieval remains unchanged until V5.3B.';

-- Preserve the exact legacy Practice pool as the initial eligibility pool.
-- Topical exercise rows intentionally remain false until a teacher stages them.
update public.questions
set practice_eligible = true
where active = true
  and source_type <> 'topical_exercise'
  and practice_eligible = false;

create or replace function public.get_topical_practice_eligibility_states_v53a()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  with identities as (
    select q.year_level::integer as year_level, trim(q.source) as source
    from public.questions q
    where q.source_type = 'topical_exercise'
      and nullif(trim(coalesce(q.source,'')),'') is not null
    group by q.year_level, trim(q.source)
  ), states as (
    select
      i.year_level,
      i.source,
      count(q.*)::integer as physical_rows,
      count(distinct coalesce(nullif(trim(q.parent_question_number),''),trim(q.question_number)))::integer as logical_questions,
      count(*) filter (where q.practice_eligible)::integer as eligible_rows,
      count(*) filter (where q.review_status = 'reviewed')::integer as reviewed_rows,
      count(*) filter (where q.active)::integer as active_rows,
      public.topical_exercise_readiness_v52c(i.year_level,i.source) as readiness
    from identities i
    join public.questions q
      on q.source_type='topical_exercise'
     and q.year_level=i.year_level
     and lower(trim(q.source))=lower(trim(i.source))
    group by i.year_level,i.source
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'year_level',s.year_level,
    'source',s.source,
    'physical_rows',s.physical_rows,
    'logical_questions',s.logical_questions,
    'eligible_rows',s.eligible_rows,
    'reviewed_rows',s.reviewed_rows,
    'active_rows',s.active_rows,
    'all_eligible',(s.eligible_rows=s.physical_rows and s.physical_rows>0),
    'partially_eligible',(s.eligible_rows>0 and s.eligible_rows<s.physical_rows),
    'ready',coalesce((s.readiness->>'ready')::boolean,false),
    'readiness_reasons',coalesce(s.readiness->'reasons','[]'::jsonb),
    'student_retrieval_live',false
  ) order by s.year_level,lower(s.source)),'[]'::jsonb)
  into v_result
  from states s;

  return v_result;
end;
$$;

create or replace function public.save_topical_practice_eligibility_v53a(
  p_year_level integer,
  p_source text,
  p_eligible boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source text := trim(coalesce(p_source,''));
  v_canonical text;
  v_readiness jsonb;
  v_rows integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;
  if p_year_level not between 1 and 6 then
    raise exception 'Invalid year level';
  end if;
  if length(v_source) < 1 or length(v_source) > 120 then
    raise exception 'Invalid topical set name';
  end if;

  select q.source into v_canonical
  from public.questions q
  where q.source_type='topical_exercise'
    and q.year_level=p_year_level
    and lower(trim(q.source))=lower(v_source)
  order by q.created_at nulls last,q.id
  limit 1;

  if v_canonical is null then
    raise exception 'Topical exercise set could not be found';
  end if;
  v_canonical := trim(v_canonical);

  if coalesce(p_eligible,false) then
    v_readiness := public.topical_exercise_readiness_v52c(p_year_level,v_canonical);
    if coalesce((v_readiness->>'ready')::boolean,false) is not true then
      raise exception 'Topical set is not ready for the Practice resource pool: %',
        coalesce(array_to_string(array(select jsonb_array_elements_text(v_readiness->'reasons')), '; '),'readiness checks failed');
    end if;
  end if;

  update public.questions q
  set practice_eligible=coalesce(p_eligible,false),
      updated_at=now()
  where q.source_type='topical_exercise'
    and q.year_level=p_year_level
    and lower(trim(q.source))=lower(v_canonical);
  get diagnostics v_rows = row_count;

  if v_rows=0 then
    raise exception 'No topical exercise rows were updated';
  end if;

  return jsonb_build_object(
    'year_level',p_year_level,
    'source',v_canonical,
    'eligible',coalesce(p_eligible,false),
    'updated_rows',v_rows,
    'student_retrieval_live',false
  );
end;
$$;

revoke execute on function public.get_topical_practice_eligibility_states_v53a() from public,anon;
grant execute on function public.get_topical_practice_eligibility_states_v53a() to authenticated;
revoke execute on function public.save_topical_practice_eligibility_v53a(integer,text,boolean) from public,anon;
grant execute on function public.save_topical_practice_eligibility_v53a(integer,text,boolean) to authenticated;
