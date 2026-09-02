-- V5.7B — Teacher assignment management
-- Read-only management summary plus tightly scoped teacher update/reassign RPCs.
-- Existing V5.6B assignment creation/student flows remain unchanged.

create or replace function public.get_teacher_past_paper_assignment_management_v57b(p_class_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_class public.school_classes;
  v_assignments jsonb;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  select sc.* into v_class
  from public.school_classes sc
  where sc.id=p_class_id
  limit 1;

  if v_class.id is null then raise exception 'Choose a valid class'; end if;

  with assignment_rows as (
    select pa.*,
      exists(select 1 from public.practice_assignment_recipients pr where pr.assignment_id=pa.id) as targeted
    from public.practice_assignments pa
    where pa.class_id=v_class.id
      and pa.assignment_type='past_paper'
  ), student_rows as (
    select ar.id assignment_id,
      cs.id roster_student_id,cs.student_id,cs.student_name,cs.active student_active,
      att.id attempt_id,att.status attempt_status,att.started_at,att.completed_at,
      att.practice_session_id,att.question_target,
      ps.first_try_percent,ps.mastery_percent,ps.result_code,ps.completed_at session_completed_at,
      case
        when att.id is null then 'not_started'
        when att.status='completed' then 'completed'
        else 'in_progress'
      end student_status
    from assignment_rows ar
    join public.class_students cs
      on cs.class_id=ar.class_id and cs.active=true
    left join public.practice_assignment_attempts att
      on att.assignment_id=ar.id and att.roster_student_id=cs.id
    left join public.practice_sessions ps on ps.id=att.practice_session_id
    where not ar.targeted
       or exists(
         select 1 from public.practice_assignment_recipients pr
         where pr.assignment_id=ar.id and pr.roster_student_id=cs.id
       )
  ), packed as (
    select ar.id,
      jsonb_build_object(
        'assignment_id',ar.id,
        'class_id',ar.class_id,
        'assignment_type',ar.assignment_type,
        'exam_year',ar.exam_year,
        'paper',ar.paper,
        'selection_mode',ar.selection_mode,
        'question_count',ar.question_count,
        'opens_at',ar.opens_at,
        'closes_at',ar.closes_at,
        'active',ar.active,
        'created_at',ar.created_at,
        'updated_at',ar.updated_at,
        'created_by_current_teacher',(ar.created_by=auth.uid()),
        'audience',case when ar.targeted then 'selected_students' else 'whole_class' end,
        'assigned_count',count(sr.roster_student_id)::integer,
        'not_started_count',count(*) filter (where sr.student_status='not_started')::integer,
        'in_progress_count',count(*) filter (where sr.student_status='in_progress')::integer,
        'completed_count',count(*) filter (where sr.student_status='completed')::integer,
        'overdue_count',count(*) filter (
          where ar.active=true and ar.closes_at is not null and now()>=ar.closes_at
            and sr.student_status<>'completed'
        )::integer,
        'timing_status',case
          when ar.active=false then 'closed'
          when ar.opens_at is not null and now()<ar.opens_at then 'upcoming'
          when ar.closes_at is not null and now()>=ar.closes_at then 'due_passed'
          else 'active'
        end,
        'students',coalesce(jsonb_agg(jsonb_build_object(
          'roster_student_id',sr.roster_student_id,
          'student_id',sr.student_id,
          'student_name',sr.student_name,
          'status',sr.student_status,
          'attempt_id',sr.attempt_id,
          'started_at',sr.started_at,
          'completed_at',sr.completed_at,
          'question_target',sr.question_target,
          'practice_session_id',sr.practice_session_id,
          'first_try_percent',sr.first_try_percent,
          'mastery_percent',sr.mastery_percent,
          'result_code',sr.result_code,
          'latest_activity',coalesce(sr.session_completed_at,sr.completed_at,sr.started_at),
          'overdue',(ar.active=true and ar.closes_at is not null and now()>=ar.closes_at and sr.student_status<>'completed')
        ) order by sr.student_name,sr.student_id) filter (where sr.roster_student_id is not null),'[]'::jsonb)
      ) payload
    from assignment_rows ar
    left join student_rows sr on sr.assignment_id=ar.id
    group by ar.id,ar.class_id,ar.assignment_type,ar.exam_year,ar.paper,ar.selection_mode,
      ar.question_count,ar.opens_at,ar.closes_at,ar.active,ar.created_at,ar.updated_at,ar.created_by,ar.targeted
  )
  select coalesce(jsonb_agg(payload order by (payload->>'active')::boolean desc,
    (payload->>'created_at')::timestamptz desc),'[]'::jsonb)
  into v_assignments
  from packed;

  return jsonb_build_object(
    'class',jsonb_build_object('class_id',v_class.id,'class_name',v_class.name,'year_level',v_class.year_level),
    'assignments',coalesce(v_assignments,'[]'::jsonb)
  );
end;
$$;

create or replace function public.update_teacher_past_paper_assignment_v57b(
  p_assignment_id uuid,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null,
  p_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_assignment public.practice_assignments;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  select pa.* into v_assignment
  from public.practice_assignments pa
  where pa.id=p_assignment_id and pa.assignment_type='past_paper'
  for update;

  if v_assignment.id is null then raise exception 'Past Paper assignment was not found'; end if;
  if v_assignment.created_by is distinct from auth.uid() then
    raise exception 'Only the teacher who created this assignment can change it';
  end if;
  if p_opens_at is not null and p_closes_at is not null and p_closes_at<=p_opens_at then
    raise exception 'Due date must be after the start date';
  end if;

  update public.practice_assignments
  set opens_at=p_opens_at,
      closes_at=p_closes_at,
      active=coalesce(p_active,true),
      updated_at=now()
  where id=v_assignment.id
  returning * into v_assignment;

  return jsonb_build_object(
    'updated',true,'assignment_id',v_assignment.id,'opens_at',v_assignment.opens_at,
    'closes_at',v_assignment.closes_at,'active',v_assignment.active,'updated_at',v_assignment.updated_at
  );
end;
$$;

create or replace function public.reassign_teacher_past_paper_assignment_v57b(
  p_assignment_id uuid,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_assignment public.practice_assignments;
  v_targets uuid[];
  v_result jsonb;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  select pa.* into v_assignment
  from public.practice_assignments pa
  where pa.id=p_assignment_id and pa.assignment_type='past_paper'
  limit 1;

  if v_assignment.id is null then raise exception 'Past Paper assignment was not found'; end if;
  if v_assignment.created_by is distinct from auth.uid() then
    raise exception 'Only the teacher who created this assignment can reassign it';
  end if;
  if p_opens_at is not null and p_closes_at is not null and p_closes_at<=p_opens_at then
    raise exception 'Due date must be after the start date';
  end if;

  select case when count(*)=0 then null else array_agg(pr.roster_student_id order by pr.roster_student_id) end
  into v_targets
  from public.practice_assignment_recipients pr
  where pr.assignment_id=v_assignment.id;

  select public.create_teacher_past_paper_assignments_v56b(
    array[v_assignment.class_id],
    v_assignment.exam_year::integer,
    v_assignment.paper,
    v_assignment.selection_mode,
    v_assignment.question_count,
    p_opens_at,
    p_closes_at,
    v_targets
  ) into v_result;

  return jsonb_build_object('reassigned',true,'source_assignment_id',v_assignment.id,'created',v_result);
end;
$$;

revoke all on function public.get_teacher_past_paper_assignment_management_v57b(uuid) from public,anon;
revoke all on function public.update_teacher_past_paper_assignment_v57b(uuid,timestamptz,timestamptz,boolean) from public,anon;
revoke all on function public.reassign_teacher_past_paper_assignment_v57b(uuid,timestamptz,timestamptz) from public,anon;

grant execute on function public.get_teacher_past_paper_assignment_management_v57b(uuid) to authenticated,service_role;
grant execute on function public.update_teacher_past_paper_assignment_v57b(uuid,timestamptz,timestamptz,boolean) to authenticated,service_role;
grant execute on function public.reassign_teacher_past_paper_assignment_v57b(uuid,timestamptz,timestamptz) to authenticated,service_role;
