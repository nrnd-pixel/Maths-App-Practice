-- V5.0 launch roster maintenance: safely edit an existing student's name / Student ID.
-- Keeps the same roster UUID, class and PIN hash. Student ID changes are blocked once
-- learning history exists, preventing legacy Student-ID-only evidence from being orphaned.

create or replace function public.edit_roster_student_identity_v50(
  p_roster_student_id uuid,
  p_student_id text,
  p_student_name text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_student public.class_students;
  v_class public.school_classes;
  v_new_id text := trim(coalesce(p_student_id,''));
  v_new_name text := trim(coalesce(p_student_name,''));
  v_normalized_id_changed boolean := false;
  v_display_id_changed boolean := false;
  v_duplicate_count integer := 0;
  v_history_total integer := 0;
  v_tickets_expired integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if length(v_new_id) < 1 or length(v_new_id) > 40 then
    raise exception 'Student ID must contain 1 to 40 characters';
  end if;

  if length(v_new_name) < 1 or length(v_new_name) > 80 then
    raise exception 'Student name must contain 1 to 80 characters';
  end if;

  select cs.* into v_student
  from public.class_students cs
  where cs.id = p_roster_student_id
  for update;

  if v_student.id is null then
    raise exception 'Student record was not found';
  end if;

  select sc.* into v_class
  from public.school_classes sc
  where sc.id = v_student.class_id;

  v_normalized_id_changed := lower(trim(v_student.student_id)) is distinct from lower(v_new_id);
  v_display_id_changed := trim(v_student.student_id) is distinct from v_new_id;

  if v_student.active and coalesce(v_class.active,false) then
    select count(*)::integer into v_duplicate_count
    from public.class_students other
    join public.school_classes osc on osc.id = other.class_id
    where other.id <> v_student.id
      and other.active = true
      and osc.active = true
      and lower(trim(other.student_id)) = lower(v_new_id);

    if v_duplicate_count > 0 then
      raise exception 'Another active roster record already uses this Student ID';
    end if;
  end if;

  if v_normalized_id_changed then
    select
        (select count(*) from public.practice_sessions ps
          where ps.roster_student_id = v_student.id
             or lower(trim(coalesce(ps.student_id,''))) = lower(trim(v_student.student_id)))
      + (select count(*) from public.exam_attempts ea
          where ea.roster_student_id = v_student.id
             or lower(trim(coalesce(ea.student_id,''))) = lower(trim(v_student.student_id)))
      + (select count(*) from public.student_learning_activity_days d where d.roster_student_id = v_student.id)
      + (select count(*) from public.practice_assignment_attempts a where a.roster_student_id = v_student.id)
      + (select count(*) from public.practice_assignment_recipients r where r.roster_student_id = v_student.id)
      + (select count(*) from public.student_ai_help_interactions h where h.roster_student_id = v_student.id)
      + (select count(*) from public.student_motivation_messages m where m.roster_student_id = v_student.id)
      + (select count(*)
           from public.student_practice_answer_events e
           join public.student_access_tickets t on t.id = e.ticket_id
          where t.roster_student_id = v_student.id)
    into v_history_total;

    if v_history_total > 0 then
      raise exception 'Student ID cannot be changed after learning history exists. You can still correct the student name.';
    end if;
  end if;

  update public.class_students
  set student_id = v_new_id,
      student_name = v_new_name,
      updated_at = now()
  where id = v_student.id;

  if v_normalized_id_changed then
    update public.student_access_tickets
    set expires_at = least(expires_at, now())
    where roster_student_id = v_student.id
      and expires_at > now();
    get diagnostics v_tickets_expired = row_count;
  end if;

  insert into public.teacher_operations_log(operation, entity_type, entity_id, details)
  values (
    'student_identity_updated',
    'roster_student',
    v_student.id,
    jsonb_build_object(
      'old_student_id', v_student.student_id,
      'new_student_id', v_new_id,
      'old_student_name', v_student.student_name,
      'new_student_name', v_new_name,
      'class_id', v_student.class_id,
      'class_name', v_class.name,
      'student_id_changed', v_display_id_changed,
      'access_tickets_expired', v_tickets_expired,
      'pin_preserved', true,
      'roster_uuid_preserved', true
    )
  );

  return jsonb_build_object(
    'updated', true,
    'roster_student_id', v_student.id,
    'student_id', v_new_id,
    'student_name', v_new_name,
    'class_id', v_student.class_id,
    'class_name', v_class.name,
    'student_id_changed', v_display_id_changed,
    'access_tickets_invalidated', v_tickets_expired,
    'pin_preserved', true,
    'roster_uuid_preserved', true
  );
end;
$$;

revoke all on function public.edit_roster_student_identity_v50(uuid,text,text) from public;
revoke all on function public.edit_roster_student_identity_v50(uuid,text,text) from anon;
grant execute on function public.edit_roster_student_identity_v50(uuid,text,text) to authenticated;
