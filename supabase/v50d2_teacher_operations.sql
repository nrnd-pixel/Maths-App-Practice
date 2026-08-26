-- Maths Practice V5.0D2 — Teacher Operational Tools
-- Teacher-only roster/assignment operations with preflight safeguards.
-- Does not alter grading, question content, reports, or historical class attribution.

create table if not exists public.teacher_operations_log (
  id uuid primary key default gen_random_uuid(),
  executed_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  operation text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  executed_at timestamptz not null default now()
);

alter table public.teacher_operations_log enable row level security;

drop policy if exists "teachers read own operations log" on public.teacher_operations_log;
create policy "teachers read own operations log"
on public.teacher_operations_log
for select
to authenticated
using (public.is_teacher() and executed_by = (select auth.uid()));

revoke all on table public.teacher_operations_log from anon;
revoke all on table public.teacher_operations_log from authenticated;
grant select on table public.teacher_operations_log to authenticated;

create index if not exists teacher_operations_log_teacher_time_idx
  on public.teacher_operations_log(executed_by, executed_at desc);

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
    'practice_sessions', (select count(*) from public.practice_sessions ps where ps.roster_student_id = cs.id),
    'exam_attempts', (select count(*) from public.exam_attempts ea where ea.roster_student_id = cs.id),
    'in_progress_exam_attempts', (select count(*) from public.exam_attempts ea where ea.roster_student_id = cs.id and ea.status = 'in_progress'),
    'in_progress_practice_assignments', (select count(*) from public.practice_assignment_attempts paa where paa.roster_student_id = cs.id and paa.status = 'in_progress')
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
      case when pa.topic is null or trim(pa.topic) = ''
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

  select count(*) filter (where cs.active)::integer,
         count(*) filter (where not cs.active)::integer,
         count(*) filter (where cs.active and cs.pin_hash is null)::integer
  into v_active_students, v_inactive_students, v_pin_missing
  from public.class_students cs
  join public.school_classes sc on sc.id = cs.class_id
  where sc.active = true;

  select count(*) filter (where active)::integer into v_active_exam_assignments
  from public.exam_assignments;
  select count(*) filter (where active)::integer into v_active_practice_assignments
  from public.practice_assignments;
  select count(*) filter (where status = 'in_progress')::integer into v_in_progress_exam_attempts
  from public.exam_attempts;
  select count(*) filter (where status = 'in_progress')::integer into v_in_progress_practice_attempts
  from public.practice_assignment_attempts;
  select count(*) filter (where review_status = 'pending')::integer into v_pending_review_answers
  from public.session_answers;
  select count(*)::integer into v_report_archives from public.report_archives;

  select
    (select count(*) from public.practice_sessions) +
    (select count(*) from public.session_answers) +
    (select count(*) from public.exam_attempts) +
    (select count(*) from public.student_learning_activity_days) +
    (select count(*) from public.student_ai_help_interactions) +
    (select count(*) from public.student_motivation_messages)
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
        v_active_exam_assignments + v_active_practice_assignments +
        v_in_progress_exam_attempts + v_in_progress_practice_attempts +
        v_pending_review_answers
    )
  );
end;
$$;

revoke all on function public.get_teacher_operations_v50d2() from public;
revoke all on function public.get_teacher_operations_v50d2() from anon;
grant execute on function public.get_teacher_operations_v50d2() to authenticated;

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

  select sc.* into v_class from public.school_classes sc where sc.id = v_student.class_id;

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
    delete from public.student_access_tickets
    where roster_student_id = v_student.id;
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
      'access_tickets_invalidated', v_tickets
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
  v_in_progress_exam integer := 0;
  v_in_progress_practice integer := 0;
  v_practice_sessions integer := 0;
  v_exam_attempts integer := 0;
  v_learning_days integer := 0;
  v_assignment_attempts integer := 0;
  v_assignment_recipients integer := 0;
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

  select sc.* into v_source from public.school_classes sc where sc.id = v_student.class_id;
  select sc.* into v_target from public.school_classes sc where sc.id = p_target_class_id;

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
      'message', 'V5.0D2 only allows transfers between classes in the same year level. Use rollover preparation for year-to-year changes.',
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

  select count(*)::integer into v_in_progress_exam
  from public.exam_attempts ea
  where ea.roster_student_id = v_student.id and ea.status = 'in_progress';

  select count(*)::integer into v_in_progress_practice
  from public.practice_assignment_attempts paa
  where paa.roster_student_id = v_student.id and paa.status = 'in_progress';

  select count(*)::integer into v_practice_sessions
  from public.practice_sessions ps where ps.roster_student_id = v_student.id;
  select count(*)::integer into v_exam_attempts
  from public.exam_attempts ea where ea.roster_student_id = v_student.id;
  select count(*)::integer into v_learning_days
  from public.student_learning_activity_days d where d.roster_student_id = v_student.id;
  select count(*)::integer into v_assignment_attempts
  from public.practice_assignment_attempts a where a.roster_student_id = v_student.id;
  select count(*)::integer into v_assignment_recipients
  from public.practice_assignment_recipients r where r.roster_student_id = v_student.id;
  select count(*)::integer into v_tickets
  from public.student_access_tickets t where t.roster_student_id = v_student.id;

  if v_in_progress_exam + v_in_progress_practice > 0 then
    return jsonb_build_object(
      'can_transfer', false,
      'transferred', false,
      'message', 'Finish or close the student''s in-progress assigned work before transferring classes.',
      'in_progress_exam_attempts', v_in_progress_exam,
      'in_progress_practice_assignments', v_in_progress_practice,
      'source_class', jsonb_build_object('id', v_source.id, 'name', v_source.name, 'year_level', v_source.year_level),
      'target_class', jsonb_build_object('id', v_target.id, 'name', v_target.name, 'year_level', v_target.year_level)
    );
  end if;

  if not coalesce(p_confirm,false) then
    return jsonb_build_object(
      'can_transfer', true,
      'transferred', false,
      'message', 'Transfer is safe to confirm. Historical activity will keep its original class attribution.',
      'student', jsonb_build_object('id', v_student.id, 'student_id', v_student.student_id, 'student_name', v_student.student_name, 'active', v_student.active),
      'source_class', jsonb_build_object('id', v_source.id, 'name', v_source.name, 'year_level', v_source.year_level),
      'target_class', jsonb_build_object('id', v_target.id, 'name', v_target.name, 'year_level', v_target.year_level),
      'history', jsonb_build_object(
        'practice_sessions', v_practice_sessions,
        'exam_attempts', v_exam_attempts,
        'learning_days', v_learning_days,
        'practice_assignment_attempts', v_assignment_attempts,
        'practice_assignment_recipients', v_assignment_recipients
      ),
      'access_tickets_to_invalidate', v_tickets
    );
  end if;

  update public.class_students
  set class_id = v_target.id, updated_at = now()
  where id = v_student.id;

  delete from public.student_access_tickets
  where roster_student_id = v_student.id;
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
      'access_tickets_invalidated', v_tickets,
      'historical_class_attribution_preserved', true
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
    'history_preserved', true,
    'historical_class_attribution_preserved', true,
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
    select ea.class_id, sc.name, concat(ea.exam_year, ' · ', ea.paper), ea.active
    into v_class_id, v_class_name, v_title, v_active
    from public.exam_assignments ea
    join public.school_classes sc on sc.id = ea.class_id
    where ea.id = p_assignment_id;

    if v_class_id is null then raise exception 'Exam assignment was not found'; end if;

    select count(*)::integer into v_attempts
    from public.exam_attempts at where at.assignment_id = p_assignment_id;
  else
    select pa.class_id, sc.name,
      case when pa.topic is null or trim(pa.topic) = ''
        then concat(initcap(pa.strand), ' · all topics')
        else concat(initcap(pa.strand), ' · ', pa.topic)
      end,
      pa.active
    into v_class_id, v_class_name, v_title, v_active
    from public.practice_assignments pa
    join public.school_classes sc on sc.id = pa.class_id
    where pa.id = p_assignment_id;

    if v_class_id is null then raise exception 'Practice assignment was not found'; end if;

    select count(*)::integer into v_attempts
    from public.practice_assignment_attempts at where at.assignment_id = p_assignment_id;
    select count(*)::integer into v_recipients
    from public.practice_assignment_recipients pr where pr.assignment_id = p_assignment_id;
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

    if v_kind = 'exam' then
      delete from public.exam_assignments where id = p_assignment_id;
    else
      delete from public.practice_assignments where id = p_assignment_id;
    end if;

    insert into public.teacher_operations_log(operation, entity_type, entity_id, details)
    values ('assignment_deleted', concat(v_kind,'_assignment'), p_assignment_id,
      jsonb_build_object('title', v_title, 'class_id', v_class_id, 'class_name', v_class_name, 'attempt_count', v_attempts, 'recipient_count', v_recipients));

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
    jsonb_build_object('title', v_title, 'class_id', v_class_id, 'class_name', v_class_name, 'attempt_count', v_attempts, 'recipient_count', v_recipients)
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

comment on table public.teacher_operations_log is
  'V5.0D2 teacher-owned audit trail for roster and assignment operations. No PIN values or student answers are stored.';
comment on function public.transfer_roster_student_v50d2(uuid,uuid,boolean) is
  'Teacher-only same-year class transfer with preflight; blocks in-progress assigned work, invalidates access tickets and preserves historical class attribution.';
comment on function public.manage_teacher_assignment_v50d2(text,uuid,text,boolean) is
  'Teacher-only assignment activation/deactivation and safe unused-assignment deletion; student attempt history is never deleted.';
