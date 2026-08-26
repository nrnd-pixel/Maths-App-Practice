-- Maths Practice V5.0D1 — Student Launch Readiness
-- Teacher-only readiness checks, guarded clean-start reset and bulk missing-PIN generation.
-- Permanent roster/question/config/report data is preserved by default.

create table if not exists public.student_launch_reset_log (
  id uuid primary key default gen_random_uuid(),
  executed_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  clear_assignments boolean not null default false,
  clear_pins boolean not null default false,
  deleted_counts jsonb not null default '{}'::jsonb check (jsonb_typeof(deleted_counts) = 'object'),
  executed_at timestamptz not null default now()
);

alter table public.student_launch_reset_log enable row level security;

drop policy if exists "teachers read own launch reset log" on public.student_launch_reset_log;
create policy "teachers read own launch reset log"
on public.student_launch_reset_log
for select
to authenticated
using (public.is_teacher() and executed_by = auth.uid());

revoke all on table public.student_launch_reset_log from anon;
revoke all on table public.student_launch_reset_log from authenticated;
grant select on table public.student_launch_reset_log to authenticated;

create index if not exists student_launch_reset_log_teacher_time_idx
  on public.student_launch_reset_log(executed_by, executed_at desc);

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

  v_ready :=
       v_active_classes > 0
   and v_active_students > 0
   and v_duplicate_ids = 0
   and v_pin_missing = 0
   and v_access_mode = 'student_pin'
   and v_active_questions > 0
   and v_history_total = 0;

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

create or replace function public.reset_student_launch_activity_v50d1(
  p_confirm_text text,
  p_clear_assignments boolean default false,
  p_clear_pins boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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

  -- Child records first. Every statement participates in the RPC transaction;
  -- any failure rolls the entire reset back.
  delete from public.student_ai_help_interactions;
  delete from public.student_practice_answer_events;
  delete from public.student_learning_activity_days;
  delete from public.student_motivation_messages;
  delete from public.practice_assignment_attempts;
  delete from public.student_access_failures;

  -- Break the safe SET NULL cycle before deleting Exam/Practice parents.
  update public.practice_sessions set exam_attempt_id = null where exam_attempt_id is not null;
  update public.exam_attempts set practice_session_id = null where practice_session_id is not null;

  delete from public.exam_attempts;
  -- session_answers cascade from practice_sessions.
  delete from public.practice_sessions;
  -- Any remaining ticket-linked child rows are already gone; tickets can now be invalidated.
  delete from public.student_access_tickets;

  if coalesce(p_clear_assignments,false) then
    delete from public.exam_assignments;
    delete from public.practice_assignments;
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
$$;

revoke all on function public.reset_student_launch_activity_v50d1(text,boolean,boolean) from public;
revoke all on function public.reset_student_launch_activity_v50d1(text,boolean,boolean) from anon;
grant execute on function public.reset_student_launch_activity_v50d1(text,boolean,boolean) to authenticated;

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

  for v_student in
    select cs.id, cs.student_id, cs.student_name, sc.name as class_name
    from public.class_students cs
    join public.school_classes sc on sc.id = cs.class_id
    where cs.active and sc.active and cs.pin_hash is null
    order by sc.name, cs.student_name, cs.student_id
  loop
    v_random := (('x' || encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint);
    v_pin := lpad((v_random % (power(10,p_digits)::bigint))::text, p_digits, '0');

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

comment on table public.student_launch_reset_log is
  'V5.0D1 audit record of teacher-triggered pre-launch student activity resets; stores counts only, not deleted student evidence.';
comment on function public.reset_student_launch_activity_v50d1(text,boolean,boolean) is
  'Teacher-only transactional reset. Requires exact confirmation phrase and preserves roster/content/config/report archives by default.';
comment on function public.generate_missing_student_pins_v50d1(smallint) is
  'Teacher-only bulk PIN creation for active students missing a PIN. Plain PINs are returned once; only bcrypt hashes are stored.';
