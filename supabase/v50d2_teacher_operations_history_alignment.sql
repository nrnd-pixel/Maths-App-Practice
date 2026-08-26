-- Maths Practice V5.0D2 history-count alignment
-- Keep the Teacher Operations rollover history total consistent with V5.0D1 Launch Readiness.

create or replace function public.get_teacher_operations_v50d2()
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_classes jsonb := '[]'::jsonb;
  v_students jsonb := '[]'::jsonb;
  v_assignments jsonb := '[]'::jsonb;
  v_active_students integer := 0;
  v_inactive_students integer := 0;
  v_pin_missing integer := 0;
  v_active_exam_assignments integer := 0;
  v_active_practice_assignments integer := 0;
  v_in_progress_exam_attempts integer := 0;
  v_in_progress_practice_attempts integer := 0;
  v_pending_review_answers integer := 0;
  v_report_archives integer := 0;
  v_student_history_total integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sc.id,
    'name', sc.name,
    'year_level', sc.year_level,
    'active', sc.active
  ) order by sc.year_level, sc.name), '[]'::jsonb)
  into v_classes
  from public.school_classes sc;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cs.id,
    'class_id', cs.class_id,
    'class_name', sc.name,
    'year_level', sc.year_level,
    'student_id', cs.student_id,
    'student_name', cs.student_name,
    'active', cs.active,
    'pin_set', cs.pin_hash is not null,
    'practice_sessions', (
      select count(*) from public.practice_sessions ps
      where ps.roster_student_id = cs.id
    ),
    'exam_attempts', (
      select count(*) from public.exam_attempts ea
      where ea.roster_student_id = cs.id
    ),
    'in_progress_exam_attempts', (
      select count(*) from public.exam_attempts ea
      where ea.roster_student_id = cs.id and ea.status = 'in_progress'
    ),
    'in_progress_practice_assignments', (
      select count(*) from public.practice_assignment_attempts paa
      where paa.roster_student_id = cs.id and paa.status = 'in_progress'
    )
  ) order by sc.year_level, sc.name, cs.student_name, cs.student_id), '[]'::jsonb)
  into v_students
  from public.class_students cs
  join public.school_classes sc on sc.id = cs.class_id;

  with assignment_rows as (
    select
      'exam'::text as kind,
      ea.id,
      ea.class_id,
      sc.name as class_name,
      sc.year_level,
      concat(ea.exam_year, ' · ', ea.paper) as title,
      ea.active,
      ea.created_at,
      (select count(*) from public.exam_attempts at where at.assignment_id = ea.id)::integer as attempt_count,
      0::integer as recipient_count
    from public.exam_assignments ea
    join public.school_classes sc on sc.id = ea.class_id

    union all

    select
      'practice'::text as kind,
      pa.id,
      pa.class_id,
      sc.name as class_name,
      sc.year_level,
      case
        when pa.topic is null or trim(pa.topic) = ''
          then concat(initcap(pa.strand), ' · all topics')
        else concat(initcap(pa.strand), ' · ', pa.topic)
      end as title,
      pa.active,
      pa.created_at,
      (select count(*) from public.practice_assignment_attempts at where at.assignment_id = pa.id)::integer as attempt_count,
      (select count(*) from public.practice_assignment_recipients pr where pr.assignment_id = pa.id)::integer as recipient_count
    from public.practice_assignments pa
    join public.school_classes sc on sc.id = pa.class_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'kind', ar.kind,
    'id', ar.id,
    'class_id', ar.class_id,
    'class_name', ar.class_name,
    'year_level', ar.year_level,
    'title', ar.title,
    'active', ar.active,
    'attempt_count', ar.attempt_count,
    'recipient_count', ar.recipient_count,
    'created_at', ar.created_at
  ) order by ar.created_at desc), '[]'::jsonb)
  into v_assignments
  from assignment_rows ar;

  select
    count(*) filter (where cs.active)::integer,
    count(*) filter (where not cs.active)::integer,
    count(*) filter (where cs.active and cs.pin_hash is null)::integer
  into v_active_students, v_inactive_students, v_pin_missing
  from public.class_students cs
  join public.school_classes sc on sc.id = cs.class_id
  where sc.active = true;

  select count(*) filter (where active)::integer
  into v_active_exam_assignments
  from public.exam_assignments;

  select count(*) filter (where active)::integer
  into v_active_practice_assignments
  from public.practice_assignments;

  select count(*) filter (where status = 'in_progress')::integer
  into v_in_progress_exam_attempts
  from public.exam_attempts;

  select count(*) filter (where status = 'in_progress')::integer
  into v_in_progress_practice_attempts
  from public.practice_assignment_attempts;

  select count(*) filter (where review_status = 'pending')::integer
  into v_pending_review_answers
  from public.session_answers;

  select count(*)::integer
  into v_report_archives
  from public.report_archives;

  -- Same row families counted by V5.0D1 get_teacher_launch_readiness_v50d1().
  select
      (select count(*) from public.practice_sessions)
    + (select count(*) from public.session_answers)
    + (select count(*) from public.exam_attempts)
    + (select count(*) from public.student_access_tickets)
    + (select count(*) from public.student_access_failures)
    + (select count(*) from public.student_practice_answer_events)
    + (select count(*) from public.student_learning_activity_days)
    + (select count(*) from public.student_motivation_messages)
    + (select count(*) from public.student_ai_help_interactions)
    + (select count(*) from public.practice_assignment_attempts)
  into v_student_history_total;

  return jsonb_build_object(
    'generated_at', now(),
    'classes', v_classes,
    'students', v_students,
    'assignments', v_assignments,
    'summary', jsonb_build_object(
      'active_students', v_active_students,
      'inactive_students', v_inactive_students,
      'pin_missing', v_pin_missing,
      'active_exam_assignments', v_active_exam_assignments,
      'active_practice_assignments', v_active_practice_assignments,
      'in_progress_exam_attempts', v_in_progress_exam_attempts,
      'in_progress_practice_attempts', v_in_progress_practice_attempts,
      'pending_review_answers', v_pending_review_answers,
      'report_archives', v_report_archives,
      'student_history_total', v_student_history_total,
      'rollover_attention_count',
          v_active_exam_assignments
        + v_active_practice_assignments
        + v_in_progress_exam_attempts
        + v_in_progress_practice_attempts
        + v_pending_review_answers
    )
  );
end;
$$;

revoke all on function public.get_teacher_operations_v50d2() from public;
revoke all on function public.get_teacher_operations_v50d2() from anon;
grant execute on function public.get_teacher_operations_v50d2() to authenticated;
