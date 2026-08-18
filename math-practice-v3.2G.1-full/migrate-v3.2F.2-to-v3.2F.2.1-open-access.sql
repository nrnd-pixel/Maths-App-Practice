-- Maths Practice V3.2F.2.1: open-access class assignments
-- Minimal incremental migration for an existing V3.2F.2 database.
-- Assignments guide and track roster participation; they never restrict paper access.
-- Hotfix: composite assignment, student and class rows are loaded separately for PostgreSQL compatibility.

-- Remove assignment closing dates from active countdowns without losing responses.
-- Timed papers retain their original paper duration; untimed papers return to no timer.
update public.exam_attempts
set deadline_at=case
  when duration_minutes is null then null
  else started_at+make_interval(mins=>duration_minutes)
end
where status='in_progress' and assignment_id is not null;

create or replace function public.get_student_exam_access(
  p_student_id text,p_year_level smallint,p_exam_year smallint,p_paper text
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  v_assignment public.exam_assignments;
  v_student public.class_students;
  v_class public.school_classes;
  v_used integer := 0;
  v_timing_status text := 'within_target_window';
begin
  if trim(coalesce(p_student_id,'')) <> '' then
    select ea.* into v_assignment
    from public.exam_assignments ea
    join public.school_classes sc on sc.id=ea.class_id and sc.active
    where ea.active and sc.year_level=p_year_level and ea.exam_year=p_exam_year
      and lower(trim(ea.paper))=lower(trim(p_paper))
      and exists (
        select 1 from public.class_students cs
        where cs.class_id=sc.id and cs.active
          and lower(trim(cs.student_id))=lower(trim(p_student_id))
      )
    order by ea.created_at desc
    limit 1;
    if v_assignment.id is not null then
      select cs.* into v_student from public.class_students cs
      where cs.class_id=v_assignment.class_id and cs.active
        and lower(trim(cs.student_id))=lower(trim(p_student_id)) limit 1;
      select sc.* into v_class from public.school_classes sc
      where sc.id=v_assignment.class_id and sc.active limit 1;
    end if;
  end if;

  if v_assignment.id is null then
    return jsonb_build_object(
      'status','open_access','allowed',true,'tracking',false,
      'message','This paper is open to everyone. A recognised roster Student ID adds class participation tracking.'
    );
  end if;

  select count(*) into v_used
  from public.exam_attempts a
  where a.assignment_id=v_assignment.id and a.roster_student_id=v_student.id
    and a.status not in ('incomplete','cancelled');

  if v_assignment.opens_at is not null and now()<v_assignment.opens_at then
    v_timing_status := 'before_suggested_start';
  elsif v_assignment.closes_at is not null and now()>=v_assignment.closes_at then
    v_timing_status := 'after_target_due';
  end if;

  return jsonb_build_object(
    'status','tracked_assignment','allowed',true,'tracking',true,
    'message','This attempt will be included in class participation. Assignment targets do not restrict access.',
    'assignment_id',v_assignment.id,'roster_student_id',v_student.id,
    'class_id',v_class.id,'class_name',v_class.name,'student_name',v_student.student_name,
    'opens_at',v_assignment.opens_at,'closes_at',v_assignment.closes_at,
    'timing_status',v_timing_status,'attempts_used',v_used,
    'attempt_limit',v_assignment.attempt_limit,
    'target_reached',(v_used>=v_assignment.attempt_limit)
  );
end;
$$;

create or replace function public.start_or_resume_exam_attempt(
  p_client_attempt_key text,p_resume_token text,p_student_name text,p_student_id text,
  p_year_level smallint,p_class_group text,p_exam_year smallint,p_paper text,
  p_duration_minutes integer,p_answer_release_rule text,p_question_count integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v public.exam_attempts;
  v_duplicate public.exam_attempts;
  v_access jsonb;
  v_assignment_id uuid;
  v_roster_id uuid;
  v_close timestamptz;
  v_deadline timestamptz;
begin
  if length(trim(coalesce(p_client_attempt_key,'')))<16 or length(trim(coalesce(p_resume_token,'')))<16 then
    raise exception 'Invalid attempt credentials';
  end if;

  select * into v from public.exam_attempts
  where client_attempt_key=trim(p_client_attempt_key)
  limit 1;
  if found then
    if v.resume_token_hash<>extensions.digest(trim(p_resume_token),'sha256') then
      raise exception 'Attempt credentials do not match';
    end if;
    if v.status<>'in_progress' then
      return jsonb_build_object('duplicate',false,'closed',true,'status',v.status);
    end if;
    return public.exam_attempt_json(v,true);
  end if;

  v_access:=public.get_student_exam_access(p_student_id,p_year_level,p_exam_year,p_paper);

  if trim(coalesce(p_student_id,''))<>'' then
    select * into v_duplicate from public.exam_attempts
    where lower(trim(student_id))=lower(trim(p_student_id))
      and year_level=p_year_level and exam_year=p_exam_year
      and lower(trim(paper))=lower(trim(p_paper)) and status='in_progress'
    order by started_at desc
    limit 1;
    if found then
      return jsonb_build_object(
        'duplicate',true,'status',v_duplicate.status,
        'started_at',v_duplicate.started_at,'last_saved_at',v_duplicate.last_saved_at
      );
    end if;
  end if;

  v_assignment_id:=nullif(v_access->>'assignment_id','')::uuid;
  v_roster_id:=nullif(v_access->>'roster_student_id','')::uuid;
  v_close:=nullif(v_access->>'closes_at','')::timestamptz;
  v_deadline:=case when p_duration_minutes is null then null else now()+make_interval(mins=>p_duration_minutes) end;

  insert into public.exam_attempts(
    client_attempt_key,resume_token_hash,student_name,student_id,year_level,class_group,
    exam_year,paper,duration_minutes,answer_release_rule,question_count,deadline_at,
    assignment_id,roster_student_id,assignment_closes_at
  ) values (
    trim(p_client_attempt_key),extensions.digest(trim(p_resume_token),'sha256'),
    coalesce(nullif(v_access->>'student_name',''),trim(p_student_name)),nullif(trim(p_student_id),''),
    p_year_level,coalesce(nullif(v_access->>'class_name',''),p_class_group),p_exam_year,trim(p_paper),
    p_duration_minutes,coalesce(p_answer_release_rule,'immediate'),greatest(0,p_question_count),
    v_deadline,v_assignment_id,v_roster_id,v_close
  ) returning * into v;

  return public.exam_attempt_json(v,false)||jsonb_build_object('access',v_access);
end;
$$;

revoke all on function public.get_student_exam_access(text,smallint,smallint,text) from public;
grant execute on function public.get_student_exam_access(text,smallint,smallint,text) to anon,authenticated;

-- Verification: allowed should be true and tracking should be false without a roster ID.
select
  public.get_student_exam_access('',6::smallint,2025::smallint,'Paper 1')->>'allowed' as open_access_allowed,
  public.get_student_exam_access('',6::smallint,2025::smallint,'Paper 1')->>'tracking' as roster_tracking_without_id;
