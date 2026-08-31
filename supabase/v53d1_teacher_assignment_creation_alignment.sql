-- Applied to production as migrations:
--   20260830234903 v53d1_teacher_assignment_creation_alignment
--   20260830235023 v53d1_teacher_assignment_helper_call_alignment
-- Final recorded state: teacher Practice assignment creation uses the V5.3 unified
-- questions.practice_eligible pool and the shared source-aware logical-item key.

create or replace function public.create_teacher_practice_assignment_v53d1(
  p_class_id uuid,
  p_strand text,
  p_topic text default null,
  p_question_count integer default 5,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null,
  p_target_student_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_class public.school_classes;
  v_student public.class_students;
  v_assignment public.practice_assignments;
  v_topic text;
  v_available integer := 0;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  select sc.* into v_class
  from public.school_classes sc
  where sc.id=p_class_id and sc.active=true
  limit 1;
  if v_class.id is null then raise exception 'Active class could not be verified'; end if;

  if trim(coalesce(p_strand,'')) not in ('number','measurement','geometry','statistics','thinking') then
    raise exception 'Choose a valid strand';
  end if;
  if coalesce(p_question_count,0)<1 or p_question_count>20 then
    raise exception 'Question target must be between 1 and 20';
  end if;
  if p_opens_at is not null and p_closes_at is not null and p_closes_at<=p_opens_at then
    raise exception 'Target due date must be after the suggested start';
  end if;

  v_topic:=nullif(trim(coalesce(p_topic,'')),'');

  if p_target_student_id is not null then
    select cs.* into v_student
    from public.class_students cs
    where cs.id=p_target_student_id and cs.class_id=v_class.id and cs.active=true
    limit 1;
    if v_student.id is null then raise exception 'Target student must be active in the selected class'; end if;
  end if;

  select count(distinct public.practice_logical_item_key_v53d1(
    q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
  ))::integer
  into v_available
  from public.questions q
  where q.practice_eligible=true
    and q.year_level=v_class.year_level
    and lower(trim(q.strand))=lower(trim(p_strand))
    and (v_topic is null or lower(trim(q.topic))=lower(v_topic));

  if coalesce(v_available,0)<1 then
    raise exception 'No Practice-eligible questions match this strand/topic for the selected class year';
  end if;

  insert into public.practice_assignments(
    class_id,strand,topic,question_count,opens_at,closes_at,active,created_by,created_at,updated_at
  ) values (
    v_class.id,trim(p_strand),v_topic,p_question_count,p_opens_at,p_closes_at,true,auth.uid(),now(),now()
  ) returning * into v_assignment;

  if v_student.id is not null then
    insert into public.practice_assignment_recipients(assignment_id,roster_student_id)
    values(v_assignment.id,v_student.id);
  end if;

  return jsonb_build_object(
    'assignment_id',v_assignment.id,'class_id',v_assignment.class_id,
    'strand',v_assignment.strand,'topic',v_assignment.topic,
    'question_count',v_assignment.question_count,'available_questions',v_available,
    'recommended_count',least(v_assignment.question_count,v_available),
    'audience',case when v_student.id is null then 'class' else 'individual' end,
    'target_student_id',v_student.id,'target_student_name',v_student.student_name,
    'target_student_code',v_student.student_id
  );
end;
$function$;

create or replace function public.create_teacher_practice_assignments_v53d1(
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
as $function$
declare
  v_class_ids uuid[];
  v_target_ids uuid[];
  v_class_count integer:=0;
  v_target_count integer:=0;
  v_active_class_count integer:=0;
  v_active_target_count integer:=0;
  v_min_year smallint;
  v_max_year smallint;
  v_topic text;
  v_available integer:=0;
  v_assignment public.practice_assignments;
  v_class public.school_classes;
  v_created jsonb:='[]'::jsonb;
  v_target_names jsonb:='[]'::jsonb;
  v_audience text;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  select coalesce(array_agg(distinct value order by value),'{}'::uuid[])
  into v_class_ids
  from unnest(coalesce(p_class_ids,'{}'::uuid[])) as u(value)
  where value is not null;

  select coalesce(array_agg(distinct value order by value),'{}'::uuid[])
  into v_target_ids
  from unnest(coalesce(p_target_student_ids,'{}'::uuid[])) as u(value)
  where value is not null;

  v_class_count:=cardinality(v_class_ids);
  v_target_count:=cardinality(v_target_ids);
  if v_class_count<1 then raise exception 'Choose at least one class'; end if;
  if trim(coalesce(p_strand,'')) not in ('number','measurement','geometry','statistics','thinking') then raise exception 'Choose a valid strand'; end if;
  if coalesce(p_question_count,0)<1 or p_question_count>20 then raise exception 'Question target must be between 1 and 20'; end if;
  if p_opens_at is not null and p_closes_at is not null and p_closes_at<=p_opens_at then raise exception 'Target due date must be after the suggested start'; end if;

  select count(*)::integer,min(sc.year_level),max(sc.year_level)
  into v_active_class_count,v_min_year,v_max_year
  from public.school_classes sc
  where sc.id=any(v_class_ids) and sc.active=true;
  if v_active_class_count<>v_class_count then raise exception 'Every selected class must be active'; end if;
  if v_min_year is distinct from v_max_year then raise exception 'Selected classes must be in the same year level'; end if;

  if v_target_count>0 then
    if v_class_count<>1 then raise exception 'Selected students must belong to one selected class'; end if;
    select count(*)::integer into v_active_target_count
    from public.class_students cs
    where cs.id=any(v_target_ids) and cs.class_id=v_class_ids[1] and cs.active=true;
    if v_active_target_count<>v_target_count then raise exception 'Every selected student must be active in the selected class'; end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'roster_student_id',cs.id,'student_id',cs.student_id,'student_name',cs.student_name
    ) order by cs.student_name,cs.student_id),'[]'::jsonb)
    into v_target_names
    from public.class_students cs
    where cs.id=any(v_target_ids);
  end if;

  v_topic:=nullif(trim(coalesce(p_topic,'')),'');

  select count(distinct public.practice_logical_item_key_v53d1(
    q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
  ))::integer
  into v_available
  from public.questions q
  where q.practice_eligible=true
    and q.year_level=v_min_year
    and lower(trim(q.strand))=lower(trim(p_strand))
    and (v_topic is null or lower(trim(q.topic))=lower(v_topic));

  if coalesce(v_available,0)<1 then
    raise exception 'No Practice-eligible questions match this strand/topic for the selected year level';
  end if;

  for v_class in
    select sc.* from public.school_classes sc
    where sc.id=any(v_class_ids)
    order by sc.name,sc.id
  loop
    insert into public.practice_assignments(
      class_id,strand,topic,question_count,opens_at,closes_at,active,created_by,created_at,updated_at
    ) values (
      v_class.id,trim(p_strand),v_topic,p_question_count,p_opens_at,p_closes_at,true,auth.uid(),now(),now()
    ) returning * into v_assignment;

    if v_target_count>0 then
      insert into public.practice_assignment_recipients(assignment_id,roster_student_id)
      select v_assignment.id,cs.id
      from public.class_students cs
      where cs.id=any(v_target_ids) and cs.class_id=v_class.id and cs.active=true;
    end if;

    v_created:=v_created||jsonb_build_array(jsonb_build_object(
      'assignment_id',v_assignment.id,'class_id',v_class.id,'class_name',v_class.name,
      'year_level',v_class.year_level,'recommended_count',least(v_assignment.question_count,v_available)
    ));
  end loop;

  v_audience:=case
    when v_target_count=1 then 'individual'
    when v_target_count>1 then 'students'
    when v_class_count>1 then 'classes'
    else 'class'
  end;

  return jsonb_build_object(
    'created',true,'audience',v_audience,'class_count',v_class_count,'student_count',v_target_count,
    'strand',trim(p_strand),'topic',v_topic,'question_count',p_question_count,
    'available_questions',v_available,'recommended_count',least(p_question_count,v_available),
    'assignments',v_created,'students',v_target_names
  );
end;
$function$;

revoke all on function public.create_teacher_practice_assignment_v53d1(uuid,text,text,integer,timestamptz,timestamptz,uuid) from public,anon,authenticated;
revoke all on function public.create_teacher_practice_assignments_v53d1(uuid[],text,text,integer,timestamptz,timestamptz,uuid[]) from public,anon,authenticated;
grant execute on function public.create_teacher_practice_assignment_v53d1(uuid,text,text,integer,timestamptz,timestamptz,uuid) to authenticated,service_role;
grant execute on function public.create_teacher_practice_assignments_v53d1(uuid[],text,text,integer,timestamptz,timestamptz,uuid[]) to authenticated,service_role;
