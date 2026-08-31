-- V5.4A — Question Bank Practice eligibility clarity & control
-- Adds a teacher-only per-question Practice eligibility control while preserving
-- active state, Exam publication, grading and topical inactivity.

create or replace function public.save_question_practice_eligibility_v54a(
  p_question_id uuid,
  p_eligible boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_question public.questions;
  v_target boolean := coalesce(p_eligible,false);
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select q.*
  into v_question
  from public.questions q
  where q.id = p_question_id
  limit 1;

  if v_question.id is null then
    raise exception 'Question could not be found';
  end if;

  if v_target
     and v_question.source_type = 'topical_exercise'
     and coalesce(v_question.review_status,'none') <> 'reviewed' then
    raise exception 'Topical exercise questions must be Reviewed before they can be added to Practice';
  end if;

  update public.questions q
  set practice_eligible = v_target,
      updated_at = now()
  where q.id = v_question.id;

  return jsonb_build_object(
    'question_id',v_question.id,
    'practice_eligible',v_target,
    'source_type',v_question.source_type,
    'active',v_question.active,
    'review_status',coalesce(v_question.review_status,'none')
  );
end;
$function$;

revoke all on function public.save_question_practice_eligibility_v54a(uuid,boolean) from public;
revoke all on function public.save_question_practice_eligibility_v54a(uuid,boolean) from anon;
grant execute on function public.save_question_practice_eligibility_v54a(uuid,boolean) to authenticated, service_role;

-- V5.3A originally staged eligibility before unified student retrieval existed.
-- The same set-level RPCs remain in use, but their status payload now reflects
-- the current V5.3+ production architecture: Practice retrieval is live.
create or replace function public.get_topical_practice_eligibility_states_v53a()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
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
    'student_retrieval_live',true
  ) order by s.year_level,lower(s.source)),'[]'::jsonb)
  into v_result
  from states s;

  return v_result;
end;
$function$;

revoke all on function public.get_topical_practice_eligibility_states_v53a() from public;
revoke all on function public.get_topical_practice_eligibility_states_v53a() from anon;
grant execute on function public.get_topical_practice_eligibility_states_v53a() to authenticated, service_role;

create or replace function public.save_topical_practice_eligibility_v53a(
  p_year_level integer,
  p_source text,
  p_eligible boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
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
    'student_retrieval_live',true
  );
end;
$function$;

revoke all on function public.save_topical_practice_eligibility_v53a(integer,text,boolean) from public;
revoke all on function public.save_topical_practice_eligibility_v53a(integer,text,boolean) from anon;
grant execute on function public.save_topical_practice_eligibility_v53a(integer,text,boolean) to authenticated, service_role;
