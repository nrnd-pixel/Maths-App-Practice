-- Maths Practice V4.2C — Safe roster cleanup
-- Teachers may permanently delete only truly unused roster records.

create or replace function public.delete_unused_roster_student(
  p_roster_student_id uuid,
  p_confirm boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_student public.class_students;
  v_practice_sessions integer := 0;
  v_exam_attempts integer := 0;
  v_practice_assignment_attempts integer := 0;
  v_ai_help integer := 0;
  v_learning_days integer := 0;
  v_messages integer := 0;
  v_history_total integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select cs.*
  into v_student
  from public.class_students cs
  where cs.id = p_roster_student_id
  for update;

  if v_student.id is null then
    raise exception 'Student record was not found';
  end if;

  -- Preserve both linked history and older Student-ID history that may not
  -- carry a roster FK. Class is included when available to avoid false matches.
  select count(*)::integer
  into v_practice_sessions
  from public.practice_sessions ps
  where ps.roster_student_id = v_student.id
     or (
       nullif(trim(v_student.student_id),'') is not null
       and lower(trim(coalesce(ps.student_id,''))) = lower(trim(v_student.student_id))
       and (ps.class_id = v_student.class_id or ps.class_id is null)
     );

  select count(*)::integer
  into v_exam_attempts
  from public.exam_attempts ea
  where ea.roster_student_id = v_student.id
     or (
       nullif(trim(v_student.student_id),'') is not null
       and lower(trim(coalesce(ea.student_id,''))) = lower(trim(v_student.student_id))
       and (ea.class_id = v_student.class_id or ea.class_id is null)
     );

  select count(*)::integer
  into v_practice_assignment_attempts
  from public.practice_assignment_attempts paa
  where paa.roster_student_id = v_student.id;

  select count(*)::integer
  into v_ai_help
  from public.student_ai_help_interactions sai
  where sai.roster_student_id = v_student.id;

  select count(*)::integer
  into v_learning_days
  from public.student_learning_activity_days slad
  where slad.roster_student_id = v_student.id;

  select count(*)::integer
  into v_messages
  from public.student_motivation_messages smm
  where smm.roster_student_id = v_student.id;

  v_history_total :=
      v_practice_sessions
    + v_exam_attempts
    + v_practice_assignment_attempts
    + v_ai_help
    + v_learning_days
    + v_messages;

  if v_history_total > 0 then
    return jsonb_build_object(
      'can_delete', false,
      'deleted', false,
      'student_id', v_student.student_id,
      'student_name', v_student.student_name,
      'message', 'This student has learning history and cannot be permanently deleted. Deactivate the student instead.',
      'history', jsonb_build_object(
        'practice_sessions', v_practice_sessions,
        'exam_attempts', v_exam_attempts,
        'practice_assignment_attempts', v_practice_assignment_attempts,
        'ai_help_interactions', v_ai_help,
        'learning_days', v_learning_days,
        'teacher_messages', v_messages
      )
    );
  end if;

  if not coalesce(p_confirm,false) then
    return jsonb_build_object(
      'can_delete', true,
      'deleted', false,
      'student_id', v_student.student_id,
      'student_name', v_student.student_name,
      'message', 'This unused roster record can be permanently deleted.'
    );
  end if;

  delete from public.class_students
  where id = v_student.id;

  return jsonb_build_object(
    'can_delete', true,
    'deleted', true,
    'student_id', v_student.student_id,
    'student_name', v_student.student_name,
    'message', 'Unused roster record deleted.'
  );
end;
$$;

revoke all on function public.delete_unused_roster_student(uuid,boolean) from public;
revoke all on function public.delete_unused_roster_student(uuid,boolean) from anon;
grant execute on function public.delete_unused_roster_student(uuid,boolean) to authenticated;
