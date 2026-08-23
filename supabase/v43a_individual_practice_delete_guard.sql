-- Maths Practice V4.3A follow-up — protect individual Practice assignment recipients.
-- An assigned student is no longer an unused roster record, even before starting.

alter table public.practice_assignment_recipients
  drop constraint if exists practice_assignment_recipients_roster_student_id_fkey;

alter table public.practice_assignment_recipients
  add constraint practice_assignment_recipients_roster_student_id_fkey
  foreign key (roster_student_id) references public.class_students(id) on delete restrict;

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
  v_practice_assignment_recipients integer := 0;
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
  into v_practice_assignment_recipients
  from public.practice_assignment_recipients par
  where par.roster_student_id = v_student.id;

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
    + v_practice_assignment_recipients
    + v_ai_help
    + v_learning_days
    + v_messages;

  if v_history_total > 0 then
    return jsonb_build_object(
      'can_delete', false,
      'deleted', false,
      'student_id', v_student.student_id,
      'student_name', v_student.student_name,
      'message', 'This student has learning history or assigned work and cannot be permanently deleted. Deactivate the student instead.',
      'history', jsonb_build_object(
        'practice_sessions', v_practice_sessions,
        'exam_attempts', v_exam_attempts,
        'practice_assignment_attempts', v_practice_assignment_attempts,
        'practice_assignment_recipients', v_practice_assignment_recipients,
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
