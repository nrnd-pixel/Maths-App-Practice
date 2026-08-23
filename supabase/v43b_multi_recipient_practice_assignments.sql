-- Maths Practice V4.3B — Multi-Student & Multi-Class Practice Assignments
-- Additive teacher creation RPC only. Existing V4.3A recipient/student RPC model remains unchanged.

create or replace function public.create_teacher_practice_assignments_v43b(
  p_class_ids uuid[],
  p_strand text,
  p_topic text default null,
  p_question_count integer default 5,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null,
  p_target_student_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_class_ids uuid[];
  v_target_ids uuid[];
  v_class_count integer := 0;
  v_target_count integer := 0;
  v_active_class_count integer := 0;
  v_active_target_count integer := 0;
  v_min_year smallint;
  v_max_year smallint;
  v_topic text;
  v_available integer := 0;
  v_assignment public.practice_assignments;
  v_class public.school_classes;
  v_created jsonb := '[]'::jsonb;
  v_target_names jsonb := '[]'::jsonb;
  v_audience text;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select coalesce(array_agg(distinct value order by value), '{}'::uuid[])
  into v_class_ids
  from unnest(coalesce(p_class_ids, '{}'::uuid[])) as u(value)
  where value is not null;

  select coalesce(array_agg(distinct value order by value), '{}'::uuid[])
  into v_target_ids
  from unnest(coalesce(p_target_student_ids, '{}'::uuid[])) as u(value)
  where value is not null;

  v_class_count := cardinality(v_class_ids);
  v_target_count := cardinality(v_target_ids);

  if v_class_count < 1 then
    raise exception 'Choose at least one class';
  end if;

  if trim(coalesce(p_strand,'')) not in ('number','measurement','geometry','statistics','thinking') then
    raise exception 'Choose a valid strand';
  end if;

  if coalesce(p_question_count,0) < 1 or p_question_count > 20 then
    raise exception 'Question target must be between 1 and 20';
  end if;

  if p_opens_at is not null and p_closes_at is not null and p_closes_at <= p_opens_at then
    raise exception 'Target due date must be after the suggested start';
  end if;

  select count(*)::integer, min(sc.year_level), max(sc.year_level)
  into v_active_class_count, v_min_year, v_max_year
  from public.school_classes sc
  where sc.id = any(v_class_ids)
    and sc.active = true;

  if v_active_class_count <> v_class_count then
    raise exception 'Every selected class must be active';
  end if;

  if v_min_year is distinct from v_max_year then
    raise exception 'Selected classes must be in the same year level';
  end if;

  if v_target_count > 0 then
    if v_class_count <> 1 then
      raise exception 'Selected students must belong to one selected class';
    end if;

    select count(*)::integer
    into v_active_target_count
    from public.class_students cs
    where cs.id = any(v_target_ids)
      and cs.class_id = v_class_ids[1]
      and cs.active = true;

    if v_active_target_count <> v_target_count then
      raise exception 'Every selected student must be active in the selected class';
    end if;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'roster_student_id', cs.id,
        'student_id', cs.student_id,
        'student_name', cs.student_name
      ) order by cs.student_name, cs.student_id
    ), '[]'::jsonb)
    into v_target_names
    from public.class_students cs
    where cs.id = any(v_target_ids);
  end if;

  v_topic := nullif(trim(coalesce(p_topic,'')), '');

  select count(distinct case
    when nullif(trim(q.parent_question_number),'') is not null
     and q.exam_year is not null and nullif(trim(q.paper),'') is not null
    then concat(
      'group|', q.exam_year, '|',
      lower(regexp_replace(trim(q.paper),'\s+','','g')), '|',
      lower(regexp_replace(trim(q.parent_question_number),'\s+','','g'))
    )
    else concat('single|',q.id::text)
  end)::integer
  into v_available
  from public.questions q
  where q.active = true
    and q.year_level = v_min_year
    and lower(trim(q.strand)) = lower(trim(p_strand))
    and (v_topic is null or lower(trim(q.topic)) = lower(v_topic));

  if coalesce(v_available,0) < 1 then
    raise exception 'No active questions match this strand/topic for the selected year level';
  end if;

  for v_class in
    select sc.*
    from public.school_classes sc
    where sc.id = any(v_class_ids)
    order by sc.name, sc.id
  loop
    insert into public.practice_assignments(
      class_id, strand, topic, question_count, opens_at, closes_at,
      active, created_by, created_at, updated_at
    ) values (
      v_class.id, trim(p_strand), v_topic, p_question_count, p_opens_at, p_closes_at,
      true, auth.uid(), now(), now()
    ) returning * into v_assignment;

    if v_target_count > 0 then
      insert into public.practice_assignment_recipients(assignment_id, roster_student_id)
      select v_assignment.id, cs.id
      from public.class_students cs
      where cs.id = any(v_target_ids)
        and cs.class_id = v_class.id
        and cs.active = true;
    end if;

    v_created := v_created || jsonb_build_array(jsonb_build_object(
      'assignment_id', v_assignment.id,
      'class_id', v_class.id,
      'class_name', v_class.name,
      'year_level', v_class.year_level,
      'recommended_count', least(v_assignment.question_count, v_available)
    ));
  end loop;

  v_audience := case
    when v_target_count = 1 then 'individual'
    when v_target_count > 1 then 'students'
    when v_class_count > 1 then 'classes'
    else 'class'
  end;

  return jsonb_build_object(
    'created', true,
    'audience', v_audience,
    'class_count', v_class_count,
    'student_count', v_target_count,
    'strand', trim(p_strand),
    'topic', v_topic,
    'question_count', p_question_count,
    'available_questions', v_available,
    'recommended_count', least(p_question_count, v_available),
    'assignments', v_created,
    'students', v_target_names
  );
end;
$$;

revoke all on function public.create_teacher_practice_assignments_v43b(uuid[],text,text,integer,timestamptz,timestamptz,uuid[]) from public;
revoke all on function public.create_teacher_practice_assignments_v43b(uuid[],text,text,integer,timestamptz,timestamptz,uuid[]) from anon;
grant execute on function public.create_teacher_practice_assignments_v43b(uuid[],text,text,integer,timestamptz,timestamptz,uuid[]) to authenticated;
