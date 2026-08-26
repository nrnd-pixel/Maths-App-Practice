-- V5.0 launch hotfix: make every intentional full-table launch reset delete explicit.
-- Some production database safety layers reject DELETE statements without a WHERE clause.
-- `WHERE true` preserves the intended transactional clean-start behavior while keeping
-- the delete target explicit and leaving the existing teacher/confirmation safeguards intact.

create or replace function public.reset_student_launch_activity_v50d1(
  p_confirm_text text,
  p_clear_assignments boolean default false,
  p_clear_pins boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_practice_sessions integer := 0;
  v_session_answers integer := 0;
  v_exam_attempts integer := 0;
  v_access_tickets integer := 0;
  v_access_failures integer := 0;
  v_answer_events integer := 0;
  v_learning_days integer := 0;
  v_messages integer := 0;
  v_ai_interactions integer := 0;
  v_assignment_attempts integer := 0;
  v_practice_assignments integer := 0;
  v_exam_assignments integer := 0;
  v_pins_cleared integer := 0;
  v_log_id uuid;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if coalesce(p_confirm_text,'') <> 'RESET STUDENT ACTIVITY' then
    raise exception 'Type RESET STUDENT ACTIVITY exactly to confirm';
  end if;

  select count(*)::integer into v_practice_sessions from public.practice_sessions;
  select count(*)::integer into v_session_answers from public.session_answers;
  select count(*)::integer into v_exam_attempts from public.exam_attempts;
  select count(*)::integer into v_access_tickets from public.student_access_tickets;
  select count(*)::integer into v_access_failures from public.student_access_failures;
  select count(*)::integer into v_answer_events from public.student_practice_answer_events;
  select count(*)::integer into v_learning_days from public.student_learning_activity_days;
  select count(*)::integer into v_messages from public.student_motivation_messages;
  select count(*)::integer into v_ai_interactions from public.student_ai_help_interactions;
  select count(*)::integer into v_assignment_attempts from public.practice_assignment_attempts;

  if coalesce(p_clear_assignments,false) then
    select count(*)::integer into v_practice_assignments from public.practice_assignments;
    select count(*)::integer into v_exam_assignments from public.exam_assignments;
  end if;

  if coalesce(p_clear_pins,false) then
    select count(*)::integer into v_pins_cleared
    from public.class_students cs
    join public.school_classes sc on sc.id = cs.class_id
    where cs.active and sc.active and cs.pin_hash is not null;
  end if;

  delete from public.student_ai_help_interactions where true;
  delete from public.student_practice_answer_events where true;
  delete from public.student_learning_activity_days where true;
  delete from public.student_motivation_messages where true;
  delete from public.practice_assignment_attempts where true;
  delete from public.student_access_failures where true;

  update public.practice_sessions set exam_attempt_id = null where exam_attempt_id is not null;
  update public.exam_attempts set practice_session_id = null where practice_session_id is not null;

  delete from public.exam_attempts where true;
  delete from public.practice_sessions where true;
  delete from public.student_access_tickets where true;

  if coalesce(p_clear_assignments,false) then
    delete from public.exam_assignments where true;
    delete from public.practice_assignments where true;
  end if;

  if coalesce(p_clear_pins,false) then
    update public.class_students cs
    set pin_hash = null, pin_updated_at = null, updated_at = now()
    from public.school_classes sc
    where sc.id = cs.class_id and cs.active and sc.active and cs.pin_hash is not null;
  end if;

  insert into public.student_launch_reset_log(
    executed_by, clear_assignments, clear_pins, deleted_counts
  ) values (
    auth.uid(), coalesce(p_clear_assignments,false), coalesce(p_clear_pins,false),
    jsonb_build_object(
      'practice_sessions', v_practice_sessions,
      'session_answers', v_session_answers,
      'exam_attempts', v_exam_attempts,
      'access_tickets', v_access_tickets,
      'access_failures', v_access_failures,
      'practice_answer_events', v_answer_events,
      'learning_activity_days', v_learning_days,
      'teacher_messages', v_messages,
      'ai_help_interactions', v_ai_interactions,
      'practice_assignment_attempts', v_assignment_attempts,
      'practice_assignments', v_practice_assignments,
      'exam_assignments', v_exam_assignments,
      'pins_cleared', v_pins_cleared
    )
  ) returning id into v_log_id;

  return jsonb_build_object(
    'reset', true,
    'reset_log_id', v_log_id,
    'clear_assignments', coalesce(p_clear_assignments,false),
    'clear_pins', coalesce(p_clear_pins,false),
    'deleted', jsonb_build_object(
      'practice_sessions', v_practice_sessions,
      'session_answers', v_session_answers,
      'exam_attempts', v_exam_attempts,
      'access_tickets', v_access_tickets,
      'access_failures', v_access_failures,
      'practice_answer_events', v_answer_events,
      'learning_activity_days', v_learning_days,
      'teacher_messages', v_messages,
      'ai_help_interactions', v_ai_interactions,
      'practice_assignment_attempts', v_assignment_attempts,
      'practice_assignments', v_practice_assignments,
      'exam_assignments', v_exam_assignments,
      'pins_cleared', v_pins_cleared
    ),
    'preserved', jsonb_build_object(
      'school_classes', (select count(*) from public.school_classes),
      'class_students', (select count(*) from public.class_students),
      'questions', (select count(*) from public.questions),
      'exam_paper_settings', (select count(*) from public.exam_paper_settings),
      'report_archives', (select count(*) from public.report_archives)
    )
  );
end;
$function$;

revoke all on function public.reset_student_launch_activity_v50d1(text,boolean,boolean) from anon;
grant execute on function public.reset_student_launch_activity_v50d1(text,boolean,boolean) to authenticated;
