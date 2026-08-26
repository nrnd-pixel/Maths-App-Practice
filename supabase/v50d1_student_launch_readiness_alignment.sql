-- Maths Practice V5.0D1 — Student Launch Readiness alignment
-- Keeps server readiness identical to the teacher UI and guarantees generated PINs
-- always contain the requested number of visible digits (no leading-zero CSV loss).

create or replace function public.get_teacher_launch_readiness_v50d1()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_active_classes integer := 0;
  v_active_students integer := 0;
  v_pin_ready integer := 0;
  v_pin_missing integer := 0;
  v_duplicate_ids integer := 0;
  v_possible_test_count integer := 0;
  v_possible_test_students jsonb := '[]'::jsonb;
  v_access_mode text := 'open';
  v_active_questions integer := 0;
  v_active_exam_papers integer := 0;
  v_available_exam_settings integer := 0;
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
  v_active_practice_assignments integer := 0;
  v_active_exam_assignments integer := 0;
  v_history_total integer := 0;
  v_report_archives integer := 0;
  v_last_reset_at timestamptz;
  v_ready boolean := false;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select count(*)::integer into v_active_classes
  from public.school_classes where active = true;

  select
    count(*) filter (where cs.active and sc.active)::integer,
    count(*) filter (where cs.active and sc.active and cs.pin_hash is not null)::integer,
    count(*) filter (where cs.active and sc.active and cs.pin_hash is null)::integer
  into v_active_students, v_pin_ready, v_pin_missing
  from public.class_students cs
  join public.school_classes sc on sc.id = cs.class_id;

  select count(*)::integer into v_duplicate_ids
  from (
    select lower(trim(cs.student_id))
    from public.class_students cs
    join public.school_classes sc on sc.id = cs.class_id
    where cs.active and sc.active
    group by lower(trim(cs.student_id))
    having count(*) > 1
  ) duplicates;

  select count(*)::integer,
         coalesce(jsonb_agg(jsonb_build_object(
           'roster_student_id', cs.id,
           'student_id', cs.student_id,
           'student_name', cs.student_name,
           'class_name', sc.name
         ) order by sc.name, cs.student_name), '[]'::jsonb)
  into v_possible_test_count, v_possible_test_students
  from public.class_students cs
  join public.school_classes sc on sc.id = cs.class_id
  where cs.active and sc.active
    and (
      lower(cs.student_name) like '%test%' or lower(cs.student_id) like '%test%' or
      lower(cs.student_name) like '%demo%' or lower(cs.student_id) like '%demo%'
    );

  select coalesce(access_mode,'open') into v_access_mode
  from public.app_access_settings where id = true;

  select count(*) filter (where active)::integer,
         count(distinct (exam_year,paper)) filter (
           where active and exam_year is not null and nullif(trim(paper),'') is not null
         )::integer
  into v_active_questions, v_active_exam_papers
  from public.questions;

  select count(*) filter (where is_available)::integer into v_available_exam_settings
  from public.exam_paper_settings;

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
  select count(*) filter (where active)::integer into v_active_practice_assignments from public.practice_assignments;
  select count(*) filter (where active)::integer into v_active_exam_assignments from public.exam_assignments;
  select count(*)::integer into v_report_archives from public.report_archives;

  select max(executed_at) into v_last_reset_at
  from public.student_launch_reset_log where executed_by = auth.uid();

  v_history_total :=
      v_practice_sessions + v_session_answers + v_exam_attempts + v_access_tickets
    + v_access_failures + v_answer_events + v_learning_days + v_messages
    + v_ai_interactions + v_assignment_attempts;

  -- Keep this definition aligned with effectiveReady() in v50-student-launch-readiness.js.
  v_ready :=
       v_active_classes > 0
   and v_active_students > 0
   and v_pin_missing = 0
   and v_duplicate_ids = 0
   and v_access_mode = 'student_pin'
   and v_active_questions > 0
   and v_active_exam_papers > 0
   and v_available_exam_settings > 0
   and v_history_total = 0
   and v_possible_test_count = 0;

  return jsonb_build_object(
    'ready', v_ready,
    'generated_at', now(),
    'active_classes', v_active_classes,
    'active_students', v_active_students,
    'pin_ready', v_pin_ready,
    'pin_missing', v_pin_missing,
    'duplicate_student_ids', v_duplicate_ids,
    'possible_test_students_count', v_possible_test_count,
    'possible_test_students', v_possible_test_students,
    'access_mode', v_access_mode,
    'active_questions', v_active_questions,
    'active_exam_papers', v_active_exam_papers,
    'available_exam_settings', v_available_exam_settings,
    'active_practice_assignments', v_active_practice_assignments,
    'active_exam_assignments', v_active_exam_assignments,
    'report_archives', v_report_archives,
    'last_reset_at', v_last_reset_at,
    'history_total', v_history_total,
    'history', jsonb_build_object(
      'practice_sessions', v_practice_sessions,
      'session_answers', v_session_answers,
      'exam_attempts', v_exam_attempts,
      'access_tickets', v_access_tickets,
      'access_failures', v_access_failures,
      'practice_answer_events', v_answer_events,
      'learning_activity_days', v_learning_days,
      'teacher_messages', v_messages,
      'ai_help_interactions', v_ai_interactions,
      'practice_assignment_attempts', v_assignment_attempts
    )
  );
end;
$$;

revoke all on function public.get_teacher_launch_readiness_v50d1() from public;
revoke all on function public.get_teacher_launch_readiness_v50d1() from anon;
grant execute on function public.get_teacher_launch_readiness_v50d1() to authenticated;

create or replace function public.generate_missing_student_pins_v50d1(
  p_digits smallint default 4
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_student record;
  v_random bigint;
  v_floor bigint;
  v_span bigint;
  v_pin text;
  v_rows jsonb := '[]'::jsonb;
  v_count integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if p_digits is null or p_digits < 4 or p_digits > 6 then
    raise exception 'PIN length must be between 4 and 6 digits';
  end if;

  v_floor := power(10,p_digits - 1)::bigint;
  v_span := 9 * v_floor;

  for v_student in
    select cs.id, cs.student_id, cs.student_name, sc.name as class_name
    from public.class_students cs
    join public.school_classes sc on sc.id = cs.class_id
    where cs.active and sc.active and cs.pin_hash is null
    order by sc.name, cs.student_name, cs.student_id
  loop
    v_random := (('x' || encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint);
    v_pin := (v_floor + (v_random % v_span))::text;

    update public.class_students
    set pin_hash = extensions.crypt(v_pin, extensions.gen_salt('bf')),
        pin_updated_at = now(),
        updated_at = now()
    where id = v_student.id and pin_hash is null;

    if found then
      v_count := v_count + 1;
      v_rows := v_rows || jsonb_build_array(jsonb_build_object(
        'roster_student_id', v_student.id,
        'class_name', v_student.class_name,
        'student_id', v_student.student_id,
        'student_name', v_student.student_name,
        'pin', v_pin
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'generated', true,
    'generated_count', v_count,
    'pin_digits', p_digits,
    'pins', v_rows,
    'message', case when v_count > 0
      then 'PINs were generated. Plain-text PINs are returned only in this response; the database stores hashes only.'
      else 'All active roster students already have PINs.' end
  );
end;
$$;

revoke all on function public.generate_missing_student_pins_v50d1(smallint) from public;
revoke all on function public.generate_missing_student_pins_v50d1(smallint) from anon;
grant execute on function public.generate_missing_student_pins_v50d1(smallint) to authenticated;
