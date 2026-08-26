-- Maths Practice V5.0D2 safety follow-up
-- Final operational semantics:
-- 1. deactivation expires access tickets instead of deleting them, preserving ticket-linked evidence;
-- 2. class transfer is permitted only for a clean, unassigned roster record with no learning history;
-- 3. assignment activation is blocked when its class is inactive.

create or replace function public.set_roster_student_active_v50d2(
  p_roster_student_id uuid,
  p_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_student public.class_students;
  v_class public.school_classes;
  v_conflicts integer := 0;
  v_tickets integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
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

  if coalesce(p_active,false) then
    if v_class.id is null or not v_class.active then
      raise exception 'Student cannot be activated in an inactive class';
    end if;

    select count(*)::integer into v_conflicts
    from public.class_students other
    join public.school_classes osc on osc.id = other.class_id
    where other.id <> v_student.id
      and other.active = true
      and osc.active = true
      and lower(trim(other.student_id)) = lower(trim(v_student.student_id));

    if v_conflicts > 0 then
      raise exception 'Another active roster record already uses this Student ID';
    end if;
  end if;

  update public.class_students
  set active = coalesce(p_active,false), updated_at = now()
  where id = v_student.id;

  if not coalesce(p_active,false) then
    -- Expire instead of DELETE so student_practice_answer_events and
    -- student_ai_help_interactions linked through tickets remain preserved.
    update public.student_access_tickets
    set expires_at = least(expires_at, now())
    where roster_student_id = v_student.id
      and expires_at > now();
    get diagnostics v_tickets = row_count;
  end if;

  insert into public.teacher_operations_log(operation, entity_type, entity_id, details)
  values (
    case when coalesce(p_active,false) then 'student_reactivated' else 'student_deactivated' end,
    'roster_student', v_student.id,
    jsonb_build_object(
      'student_id', v_student.student_id,
      'student_name', v_student.student_name,
      'class_id', v_student.class_id,
      'class_name', v_class.name,
      'access_tickets_expired', v_tickets,
      'history_preserved', true,
      'pin_preserved', true
    )
  );

  return jsonb_build_object(
    'updated', true,
    'active', coalesce(p_active,false),
    'roster_student_id', v_student.id,
    'student_id', v_student.student_id,
    'student_name', v_student.student_name,
    'class_id', v_student.class_id,
    'class_name', v_class.name,
    'access_tickets_invalidated', v_tickets,
    'history_preserved', true,
    'pin_preserved', true
  );
end;
$$;

revoke all on function public.set_roster_student_active_v50d2(uuid,boolean) from public;
revoke all on function public.set_roster_student_active_v50d2(uuid,boolean) from anon;
grant execute on function public.set_roster_student_active_v50d2(uuid,boolean) to authenticated;

create or replace function public.transfer_roster_student_v50d2(
  p_roster_student_id uuid,
  p_target_class_id uuid,
  p_confirm boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_student public.class_students;
  v_source public.school_classes;
  v_target public.school_classes;
  v_conflicts integer := 0;
  v_practice_sessions integer := 0;
  v_exam_attempts integer := 0;
  v_learning_days integer := 0;
  v_assignment_attempts integer := 0;
  v_assignment_recipients integer := 0;
  v_ai_help integer := 0;
  v_messages integer := 0;
  v_practice_answer_events integer := 0;
  v_history_total integer := 0;
  v_tickets integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select cs.* into v_student
  from public.class_students cs
  where cs.id = p_roster_student_id
  for update;

  if v_student.id is null then
    raise exception 'Student record was not found';
  end if;

  select sc.* into v_source
  from public.school_classes sc
  where sc.id = v_student.class_id;

  select sc.* into v_target
  from public.school_classes sc
  where sc.id = p_target_class_id;

  if v_target.id is null or not v_target.active then
    raise exception 'Target class must be active';
  end if;

  if v_source.id = v_target.id then
    return jsonb_build_object(
      'can_transfer', false,
      'transferred', false,
      'message', 'Student is already in the selected class.'
    );
  end if;

  if v_source.year_level is distinct from v_target.year_level then
    return jsonb_build_object(
      'can_transfer', false,
      'transferred', false,
      'message', 'V5.0D2 only allows transfers between classes in the same year level. Year-to-year movement belongs in a separate rollover workflow.',
      'source_year_level', v_source.year_level,
      'target_year_level', v_target.year_level
    );
  end if;

  select count(*)::integer into v_conflicts
  from public.class_students other
  join public.school_classes osc on osc.id = other.class_id
  where other.id <> v_student.id
    and other.active = true
    and osc.active = true
    and lower(trim(other.student_id)) = lower(trim(v_student.student_id));

  if v_conflicts > 0 then
    return jsonb_build_object(
      'can_transfer', false,
      'transferred', false,
      'message', 'Another active roster record already uses this Student ID.'
    );
  end if;

  -- Include both roster-linked history and older Student-ID history that may
  -- predate roster foreign keys. This prevents Analytics from visually moving
  -- old learning evidence to a new current roster class.
  select count(*)::integer into v_practice_sessions
  from public.practice_sessions ps
  where ps.roster_student_id = v_student.id
     or (
       nullif(trim(v_student.student_id),'') is not null
       and lower(trim(coalesce(ps.student_id,''))) = lower(trim(v_student.student_id))
       and (ps.class_id = v_source.id or ps.class_id is null)
     );

  select count(*)::integer into v_exam_attempts
  from public.exam_attempts ea
  where ea.roster_student_id = v_student.id
     or (
       nullif(trim(v_student.student_id),'') is not null
       and lower(trim(coalesce(ea.student_id,''))) = lower(trim(v_student.student_id))
       and (ea.class_id = v_source.id or ea.class_id is null)
     );

  select count(*)::integer into v_learning_days
  from public.student_learning_activity_days d
  where d.roster_student_id = v_student.id;

  select count(*)::integer into v_assignment_attempts
  from public.practice_assignment_attempts a
  where a.roster_student_id = v_student.id;

  select count(*)::integer into v_assignment_recipients
  from public.practice_assignment_recipients r
  where r.roster_student_id = v_student.id;

  select count(*)::integer into v_ai_help
  from public.student_ai_help_interactions h
  where h.roster_student_id = v_student.id;

  select count(*)::integer into v_messages
  from public.student_motivation_messages m
  where m.roster_student_id = v_student.id;

  select count(*)::integer into v_practice_answer_events
  from public.student_practice_answer_events e
  join public.student_access_tickets t on t.id = e.ticket_id
  where t.roster_student_id = v_student.id;

  v_history_total :=
      v_practice_sessions
    + v_exam_attempts
    + v_learning_days
    + v_assignment_attempts
    + v_assignment_recipients
    + v_ai_help
    + v_messages
    + v_practice_answer_events;

  select count(*)::integer into v_tickets
  from public.student_access_tickets t
  where t.roster_student_id = v_student.id and t.expires_at > now();

  if v_history_total > 0 then
    return jsonb_build_object(
      'can_transfer', false,
      'transferred', false,
      'message', 'This student already has learning history or assigned work. To keep historical Analytics attached to the correct class, V5.0D2 does not move this roster record. Class transfer is limited to clean/new roster records.',
      'source_class', jsonb_build_object('id', v_source.id, 'name', v_source.name, 'year_level', v_source.year_level),
      'target_class', jsonb_build_object('id', v_target.id, 'name', v_target.name, 'year_level', v_target.year_level),
      'history', jsonb_build_object(
        'practice_sessions', v_practice_sessions,
        'exam_attempts', v_exam_attempts,
        'learning_days', v_learning_days,
        'practice_assignment_attempts', v_assignment_attempts,
        'practice_assignment_recipients', v_assignment_recipients,
        'ai_help_interactions', v_ai_help,
        'teacher_messages', v_messages,
        'practice_answer_events', v_practice_answer_events
      )
    );
  end if;

  if not coalesce(p_confirm,false) then
    return jsonb_build_object(
      'can_transfer', true,
      'transferred', false,
      'message', 'This clean roster record can be transferred safely. No historical learning evidence or assigned work is attached.',
      'student', jsonb_build_object(
        'id', v_student.id,
        'student_id', v_student.student_id,
        'student_name', v_student.student_name,
        'active', v_student.active
      ),
      'source_class', jsonb_build_object('id', v_source.id, 'name', v_source.name, 'year_level', v_source.year_level),
      'target_class', jsonb_build_object('id', v_target.id, 'name', v_target.name, 'year_level', v_target.year_level),
      'history', jsonb_build_object(
        'practice_sessions', 0,
        'exam_attempts', 0,
        'learning_days', 0,
        'practice_assignment_attempts', 0,
        'practice_assignment_recipients', 0,
        'ai_help_interactions', 0,
        'teacher_messages', 0,
        'practice_answer_events', 0
      ),
      'access_tickets_to_invalidate', v_tickets
    );
  end if;

  -- Re-check under the locked roster row before mutation. Counts are repeated
  -- to avoid a stale preflight silently moving a record after new activity.
  if exists (
    select 1 from public.practice_sessions ps
    where ps.roster_student_id = v_student.id
       or (lower(trim(coalesce(ps.student_id,''))) = lower(trim(v_student.student_id)) and (ps.class_id = v_source.id or ps.class_id is null))
  ) or exists (
    select 1 from public.exam_attempts ea
    where ea.roster_student_id = v_student.id
       or (lower(trim(coalesce(ea.student_id,''))) = lower(trim(v_student.student_id)) and (ea.class_id = v_source.id or ea.class_id is null))
  ) or exists (
    select 1 from public.student_learning_activity_days d where d.roster_student_id = v_student.id
  ) or exists (
    select 1 from public.practice_assignment_attempts a where a.roster_student_id = v_student.id
  ) or exists (
    select 1 from public.practice_assignment_recipients r where r.roster_student_id = v_student.id
  ) or exists (
    select 1 from public.student_ai_help_interactions h where h.roster_student_id = v_student.id
  ) or exists (
    select 1 from public.student_motivation_messages m where m.roster_student_id = v_student.id
  ) or exists (
    select 1
    from public.student_practice_answer_events e
    join public.student_access_tickets t on t.id = e.ticket_id
    where t.roster_student_id = v_student.id
  ) then
    raise exception 'Student activity changed after preflight. Refresh and check the transfer again.';
  end if;

  update public.class_students
  set class_id = v_target.id, updated_at = now()
  where id = v_student.id;

  update public.student_access_tickets
  set expires_at = least(expires_at, now())
  where roster_student_id = v_student.id
    and expires_at > now();
  get diagnostics v_tickets = row_count;

  insert into public.teacher_operations_log(operation, entity_type, entity_id, details)
  values (
    'student_class_transfer', 'roster_student', v_student.id,
    jsonb_build_object(
      'student_id', v_student.student_id,
      'student_name', v_student.student_name,
      'source_class_id', v_source.id,
      'source_class_name', v_source.name,
      'target_class_id', v_target.id,
      'target_class_name', v_target.name,
      'access_tickets_expired', v_tickets,
      'clean_record_transfer', true,
      'pin_preserved', true
    )
  );

  return jsonb_build_object(
    'can_transfer', true,
    'transferred', true,
    'roster_student_id', v_student.id,
    'student_id', v_student.student_id,
    'student_name', v_student.student_name,
    'source_class', jsonb_build_object('id', v_source.id, 'name', v_source.name, 'year_level', v_source.year_level),
    'target_class', jsonb_build_object('id', v_target.id, 'name', v_target.name, 'year_level', v_target.year_level),
    'access_tickets_invalidated', v_tickets,
    'clean_record_transfer', true,
    'history_preserved', true,
    'pin_preserved', true
  );
end;
$$;

revoke all on function public.transfer_roster_student_v50d2(uuid,uuid,boolean) from public;
revoke all on function public.transfer_roster_student_v50d2(uuid,uuid,boolean) from anon;
grant execute on function public.transfer_roster_student_v50d2(uuid,uuid,boolean) to authenticated;

create or replace function public.manage_teacher_assignment_v50d2(
  p_kind text,
  p_assignment_id uuid,
  p_action text,
  p_confirm boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_kind text := lower(trim(coalesce(p_kind,'')));
  v_action text := lower(trim(coalesce(p_action,'')));
  v_class_id uuid;
  v_class_name text;
  v_class_active boolean;
  v_title text;
  v_active boolean;
  v_attempts integer := 0;
  v_recipients integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  if v_kind not in ('exam','practice') then
    raise exception 'Assignment kind must be exam or practice';
  end if;
  if v_action not in ('activate','deactivate','delete') then
    raise exception 'Assignment action must be activate, deactivate or delete';
  end if;

  if v_kind = 'exam' then
    select ea.class_id, sc.name, sc.active, concat(ea.exam_year, ' · ', ea.paper), ea.active
    into v_class_id, v_class_name, v_class_active, v_title, v_active
    from public.exam_assignments ea
    join public.school_classes sc on sc.id = ea.class_id
    where ea.id = p_assignment_id;

    if v_class_id is null then raise exception 'Exam assignment was not found'; end if;

    select count(*)::integer into v_attempts
    from public.exam_attempts at
    where at.assignment_id = p_assignment_id;
  else
    select pa.class_id, sc.name, sc.active,
      case when pa.topic is null or trim(pa.topic) = ''
        then concat(initcap(pa.strand), ' · all topics')
        else concat(initcap(pa.strand), ' · ', pa.topic)
      end,
      pa.active
    into v_class_id, v_class_name, v_class_active, v_title, v_active
    from public.practice_assignments pa
    join public.school_classes sc on sc.id = pa.class_id
    where pa.id = p_assignment_id;

    if v_class_id is null then raise exception 'Practice assignment was not found'; end if;

    select count(*)::integer into v_attempts
    from public.practice_assignment_attempts at
    where at.assignment_id = p_assignment_id;

    select count(*)::integer into v_recipients
    from public.practice_assignment_recipients pr
    where pr.assignment_id = p_assignment_id;
  end if;

  if v_action = 'activate' and not coalesce(v_class_active,false) then
    raise exception 'Assignment cannot be activated for an inactive class';
  end if;

  if v_action = 'delete' then
    if v_attempts > 0 then
      return jsonb_build_object(
        'can_delete', false,
        'deleted', false,
        'kind', v_kind,
        'assignment_id', p_assignment_id,
        'title', v_title,
        'class_name', v_class_name,
        'attempt_count', v_attempts,
        'recipient_count', v_recipients,
        'message', 'This assignment has student attempt history and cannot be deleted. Deactivate it instead.'
      );
    end if;

    if not coalesce(p_confirm,false) then
      return jsonb_build_object(
        'can_delete', true,
        'deleted', false,
        'kind', v_kind,
        'assignment_id', p_assignment_id,
        'title', v_title,
        'class_name', v_class_name,
        'attempt_count', v_attempts,
        'recipient_count', v_recipients,
        'message', 'This unused assignment can be permanently deleted.'
      );
    end if;

    -- Re-check at execution time so a student attempt created after preflight
    -- prevents deletion rather than being cascaded or detached.
    if v_kind = 'exam' then
      if exists(select 1 from public.exam_attempts at where at.assignment_id = p_assignment_id) then
        raise exception 'Student attempt history appeared after preflight. Deactivate this assignment instead.';
      end if;
      delete from public.exam_assignments where id = p_assignment_id;
    else
      if exists(select 1 from public.practice_assignment_attempts at where at.assignment_id = p_assignment_id) then
        raise exception 'Student attempt history appeared after preflight. Deactivate this assignment instead.';
      end if;
      delete from public.practice_assignments where id = p_assignment_id;
    end if;

    insert into public.teacher_operations_log(operation, entity_type, entity_id, details)
    values (
      'assignment_deleted', concat(v_kind,'_assignment'), p_assignment_id,
      jsonb_build_object(
        'title', v_title,
        'class_id', v_class_id,
        'class_name', v_class_name,
        'attempt_count', v_attempts,
        'recipient_count', v_recipients
      )
    );

    return jsonb_build_object(
      'can_delete', true,
      'deleted', true,
      'kind', v_kind,
      'assignment_id', p_assignment_id,
      'title', v_title,
      'class_name', v_class_name
    );
  end if;

  if v_kind = 'exam' then
    update public.exam_assignments
    set active = (v_action = 'activate'), updated_at = now()
    where id = p_assignment_id;
  else
    update public.practice_assignments
    set active = (v_action = 'activate'), updated_at = now()
    where id = p_assignment_id;
  end if;

  insert into public.teacher_operations_log(operation, entity_type, entity_id, details)
  values (
    case when v_action = 'activate' then 'assignment_activated' else 'assignment_deactivated' end,
    concat(v_kind,'_assignment'), p_assignment_id,
    jsonb_build_object(
      'title', v_title,
      'class_id', v_class_id,
      'class_name', v_class_name,
      'attempt_count', v_attempts,
      'recipient_count', v_recipients
    )
  );

  return jsonb_build_object(
    'updated', true,
    'kind', v_kind,
    'assignment_id', p_assignment_id,
    'active', (v_action = 'activate'),
    'title', v_title,
    'class_name', v_class_name,
    'attempt_count', v_attempts,
    'history_preserved', true
  );
end;
$$;

revoke all on function public.manage_teacher_assignment_v50d2(text,uuid,text,boolean) from public;
revoke all on function public.manage_teacher_assignment_v50d2(text,uuid,text,boolean) from anon;
grant execute on function public.manage_teacher_assignment_v50d2(text,uuid,text,boolean) to authenticated;
