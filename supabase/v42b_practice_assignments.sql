-- Maths Practice V4.2B — Targeted Practice Assignments
-- Additive migration. Existing Practice grading/question selection remains unchanged.

create table if not exists public.practice_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.school_classes(id) on delete cascade,
  strand text not null check (strand = any (array['number'::text,'measurement'::text,'geometry'::text,'statistics'::text,'thinking'::text])),
  topic text null,
  question_count integer not null default 5 check (question_count between 1 and 20),
  opens_at timestamptz null,
  closes_at timestamptz null,
  active boolean not null default true,
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (topic is null or length(trim(topic)) between 1 and 200),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create index if not exists practice_assignments_class_active_idx
  on public.practice_assignments(class_id, active, created_at desc);

create table if not exists public.practice_assignment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.practice_assignments(id) on delete cascade,
  roster_student_id uuid not null references public.class_students(id) on delete cascade,
  status text not null default 'in_progress' check (status = any (array['in_progress'::text,'completed'::text,'cancelled'::text])),
  practice_session_id uuid null unique references public.practice_sessions(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, roster_student_id)
);

create index if not exists practice_assignment_attempts_assignment_idx
  on public.practice_assignment_attempts(assignment_id, status, started_at desc);

create index if not exists practice_assignment_attempts_student_idx
  on public.practice_assignment_attempts(roster_student_id, status, started_at desc);

alter table public.practice_assignments enable row level security;
alter table public.practice_assignment_attempts enable row level security;

drop policy if exists "teachers manage practice assignments" on public.practice_assignments;
create policy "teachers manage practice assignments"
  on public.practice_assignments
  for all
  to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

drop policy if exists "teachers read practice assignment attempts" on public.practice_assignment_attempts;
create policy "teachers read practice assignment attempts"
  on public.practice_assignment_attempts
  for select
  to authenticated
  using (public.is_teacher());

revoke all on public.practice_assignments from anon;
revoke all on public.practice_assignment_attempts from anon;
grant select, insert, update, delete on public.practice_assignments to authenticated;
grant select on public.practice_assignment_attempts to authenticated;

create or replace function public.get_student_practice_assignments(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_assignments jsonb;
begin
  select t.*
  into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')), 'sha256')
    and t.purpose = 'practice'
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  with assignment_rows as (
    select
      pa.id as assignment_id,
      pa.class_id,
      sc.name as class_name,
      sc.year_level,
      pa.strand,
      pa.topic,
      pa.question_count,
      pa.opens_at,
      pa.closes_at,
      pa.created_at,
      att.id as attempt_id,
      att.status as attempt_status,
      att.started_at,
      att.completed_at,
      att.practice_session_id,
      ps.result_code,
      ps.mastery_percent,
      ps.pending_review_count,
      coalesce(qc.available_items,0)::integer as available_items,
      least(pa.question_count, coalesce(qc.available_items,0)::integer) as recommended_count,
      case
        when pa.opens_at is not null and now() < pa.opens_at then 'upcoming'
        when pa.closes_at is not null and now() >= pa.closes_at then 'due_passed'
        else 'active'
      end as timing_status,
      case
        when att.id is null then 'not_started'
        when att.status = 'completed' then 'completed'
        else 'in_progress'
      end as student_status
    from public.practice_assignments pa
    join public.school_classes sc
      on sc.id = pa.class_id
     and sc.active = true
    left join public.practice_assignment_attempts att
      on att.assignment_id = pa.id
     and att.roster_student_id = v_ticket.roster_student_id
    left join public.practice_sessions ps
      on ps.id = att.practice_session_id
    left join lateral (
      select count(distinct (
        case
          when nullif(trim(q.parent_question_number),'') is not null
               and q.exam_year is not null
               and nullif(trim(q.paper),'') is not null
            then concat(
              'group|', q.exam_year, '|',
              lower(regexp_replace(trim(q.paper), '\s+', '', 'g')), '|',
              lower(regexp_replace(trim(q.parent_question_number), '\s+', '', 'g'))
            )
          else concat('single|', q.id::text)
        end
      )) as available_items
      from public.questions q
      where q.active = true
        and q.year_level = sc.year_level
        and lower(trim(q.strand)) = lower(trim(pa.strand))
        and (pa.topic is null or lower(trim(q.topic)) = lower(trim(pa.topic)))
    ) qc on true
    where pa.class_id = v_ticket.class_id
      and pa.active = true
      and sc.year_level = v_ticket.year_level
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'assignment_id', assignment_id,
        'class_id', class_id,
        'class_name', class_name,
        'year_level', year_level,
        'strand', strand,
        'topic', topic,
        'question_count', question_count,
        'available_questions', available_items,
        'recommended_count', recommended_count,
        'opens_at', opens_at,
        'closes_at', closes_at,
        'timing_status', timing_status,
        'status', student_status,
        'attempt', case
          when attempt_id is null then null
          else jsonb_build_object(
            'attempt_id', attempt_id,
            'status', attempt_status,
            'started_at', started_at,
            'completed_at', completed_at,
            'practice_session_id', practice_session_id,
            'result_code', result_code,
            'mastery_percent', mastery_percent,
            'pending_review_count', coalesce(pending_review_count,0)
          )
        end,
        'primary_action', case
          when student_status = 'completed' and result_code is not null then 'view_result'
          when student_status = 'completed' then 'completed'
          when student_status = 'in_progress' then 'continue'
          else 'start'
        end
      )
      order by
        case student_status when 'in_progress' then 0 when 'not_started' then 1 else 2 end,
        case timing_status when 'active' then 0 when 'upcoming' then 1 else 2 end,
        closes_at asc nulls last,
        created_at desc
    ),
    '[]'::jsonb
  )
  into v_assignments
  from assignment_rows;

  return jsonb_build_object(
    'student', jsonb_build_object(
      'student_name', v_ticket.student_name,
      'student_id', v_ticket.student_id,
      'year_level', v_ticket.year_level,
      'class_name', v_ticket.class_group
    ),
    'assignments', coalesce(v_assignments,'[]'::jsonb)
  );
end;
$$;

create or replace function public.start_student_practice_assignment(
  p_access_token text,
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_assignment public.practice_assignments;
  v_class public.school_classes;
  v_attempt public.practice_assignment_attempts;
  v_available integer := 0;
  v_count integer := 0;
begin
  select t.*
  into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')), 'sha256')
    and t.purpose = 'practice'
    and t.used_at is null
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select pa.*, sc.*
  into v_assignment, v_class
  from public.practice_assignments pa
  join public.school_classes sc on sc.id = pa.class_id and sc.active = true
  where pa.id = p_assignment_id
    and pa.active = true
    and pa.class_id = v_ticket.class_id
    and sc.year_level = v_ticket.year_level
  limit 1;

  if v_assignment.id is null then
    raise exception 'Practice assignment is not available for this student';
  end if;

  select count(distinct (
    case
      when nullif(trim(q.parent_question_number),'') is not null
           and q.exam_year is not null
           and nullif(trim(q.paper),'') is not null
        then concat(
          'group|', q.exam_year, '|',
          lower(regexp_replace(trim(q.paper), '\s+', '', 'g')), '|',
          lower(regexp_replace(trim(q.parent_question_number), '\s+', '', 'g'))
        )
      else concat('single|', q.id::text)
    end
  ))::integer
  into v_available
  from public.questions q
  where q.active = true
    and q.year_level = v_ticket.year_level
    and lower(trim(q.strand)) = lower(trim(v_assignment.strand))
    and (v_assignment.topic is null or lower(trim(q.topic)) = lower(trim(v_assignment.topic)));

  if coalesce(v_available,0) < 1 then
    raise exception 'No active questions are available for this Practice assignment';
  end if;

  v_count := least(v_assignment.question_count, v_available);

  select a.*
  into v_attempt
  from public.practice_assignment_attempts a
  where a.assignment_id = v_assignment.id
    and a.roster_student_id = v_ticket.roster_student_id
  limit 1;

  if v_attempt.id is not null and v_attempt.status = 'completed' then
    return jsonb_build_object(
      'already_completed', true,
      'attempt_id', v_attempt.id,
      'assignment_id', v_assignment.id,
      'strand', v_assignment.strand,
      'topic', v_assignment.topic,
      'recommended_count', v_count
    );
  end if;

  if v_attempt.id is null then
    insert into public.practice_assignment_attempts(
      assignment_id, roster_student_id, status, started_at, updated_at
    ) values (
      v_assignment.id, v_ticket.roster_student_id, 'in_progress', now(), now()
    )
    returning * into v_attempt;
  elsif v_attempt.status <> 'in_progress' then
    update public.practice_assignment_attempts
    set status = 'in_progress',
        practice_session_id = null,
        completed_at = null,
        started_at = now(),
        updated_at = now()
    where id = v_attempt.id
    returning * into v_attempt;
  end if;

  return jsonb_build_object(
    'already_completed', false,
    'attempt_id', v_attempt.id,
    'assignment_id', v_assignment.id,
    'strand', v_assignment.strand,
    'topic', v_assignment.topic,
    'question_count', v_assignment.question_count,
    'available_questions', v_available,
    'recommended_count', v_count,
    'opens_at', v_assignment.opens_at,
    'closes_at', v_assignment.closes_at
  );
end;
$$;

create or replace function public.complete_student_practice_assignment(
  p_access_token text,
  p_attempt_id uuid,
  p_result_code text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_attempt public.practice_assignment_attempts;
  v_assignment public.practice_assignments;
  v_session public.practice_sessions;
  v_available integer := 0;
  v_required integer := 0;
  v_actual integer := 0;
  v_mismatch integer := 0;
begin
  select t.*
  into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')), 'sha256')
    and t.purpose = 'practice'
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select a.*
  into v_attempt
  from public.practice_assignment_attempts a
  where a.id = p_attempt_id
    and a.roster_student_id = v_ticket.roster_student_id
  limit 1;

  if v_attempt.id is null then
    raise exception 'Practice assignment attempt could not be verified';
  end if;

  select pa.*
  into v_assignment
  from public.practice_assignments pa
  where pa.id = v_attempt.assignment_id
    and pa.class_id = v_ticket.class_id
  limit 1;

  if v_assignment.id is null then
    raise exception 'Practice assignment could not be verified';
  end if;

  if v_attempt.status = 'completed' and v_attempt.practice_session_id is not null then
    select ps.* into v_session
    from public.practice_sessions ps
    where ps.id = v_attempt.practice_session_id;

    return jsonb_build_object(
      'completed', true,
      'already_completed', true,
      'attempt_id', v_attempt.id,
      'assignment_id', v_assignment.id,
      'practice_session_id', v_attempt.practice_session_id,
      'result_code', v_session.result_code,
      'mastery_percent', v_session.mastery_percent
    );
  end if;

  select ps.*
  into v_session
  from public.practice_sessions ps
  where lower(trim(coalesce(ps.result_code,''))) = lower(trim(coalesce(p_result_code,'')))
    and ps.roster_student_id = v_ticket.roster_student_id
    and ps.class_id = v_ticket.class_id
    and ps.practice_mode <> 'exam'
    and ps.completed_at >= v_attempt.started_at
  order by ps.completed_at desc
  limit 1;

  if v_session.id is null then
    raise exception 'Completed Practice session could not be verified';
  end if;

  if coalesce(v_session.ended_early,false) then
    raise exception 'Finish the full assigned Practice set before completing this assignment';
  end if;

  select count(distinct (
    case
      when nullif(trim(q.parent_question_number),'') is not null
           and q.exam_year is not null
           and nullif(trim(q.paper),'') is not null
        then concat(
          'group|', q.exam_year, '|',
          lower(regexp_replace(trim(q.paper), '\s+', '', 'g')), '|',
          lower(regexp_replace(trim(q.parent_question_number), '\s+', '', 'g'))
        )
      else concat('single|', q.id::text)
    end
  ))::integer,
  count(*) filter (
    where lower(trim(q.strand)) <> lower(trim(v_assignment.strand))
       or (v_assignment.topic is not null and lower(trim(q.topic)) <> lower(trim(v_assignment.topic)))
  )::integer
  into v_actual, v_mismatch
  from public.session_answers sa
  join public.questions q on q.id = sa.question_id
  where sa.session_id = v_session.id;

  select count(distinct (
    case
      when nullif(trim(q.parent_question_number),'') is not null
           and q.exam_year is not null
           and nullif(trim(q.paper),'') is not null
        then concat(
          'group|', q.exam_year, '|',
          lower(regexp_replace(trim(q.paper), '\s+', '', 'g')), '|',
          lower(regexp_replace(trim(q.parent_question_number), '\s+', '', 'g'))
        )
      else concat('single|', q.id::text)
    end
  ))::integer
  into v_available
  from public.questions q
  where q.active = true
    and q.year_level = v_ticket.year_level
    and lower(trim(q.strand)) = lower(trim(v_assignment.strand))
    and (v_assignment.topic is null or lower(trim(q.topic)) = lower(trim(v_assignment.topic)));

  v_required := least(v_assignment.question_count, coalesce(v_available,0));

  if v_required < 1 then
    raise exception 'No active questions are available for this Practice assignment';
  end if;

  if coalesce(v_mismatch,0) > 0 then
    raise exception 'This Practice session does not match the assigned topic';
  end if;

  if coalesce(v_actual,0) < v_required then
    raise exception 'Complete the full assigned Practice set before completing this assignment';
  end if;

  update public.practice_assignment_attempts
  set status = 'completed',
      practice_session_id = v_session.id,
      completed_at = now(),
      updated_at = now()
  where id = v_attempt.id
  returning * into v_attempt;

  return jsonb_build_object(
    'completed', true,
    'already_completed', false,
    'attempt_id', v_attempt.id,
    'assignment_id', v_assignment.id,
    'practice_session_id', v_session.id,
    'result_code', v_session.result_code,
    'mastery_percent', v_session.mastery_percent,
    'pending_review_count', coalesce(v_session.pending_review_count,0),
    'completed_questions', v_actual,
    'required_questions', v_required
  );
end;
$$;

revoke all on function public.get_student_practice_assignments(text) from public;
revoke all on function public.start_student_practice_assignment(text,uuid) from public;
revoke all on function public.complete_student_practice_assignment(text,uuid,text) from public;

grant execute on function public.get_student_practice_assignments(text) to anon, authenticated;
grant execute on function public.start_student_practice_assignment(text,uuid) to anon, authenticated;
grant execute on function public.complete_student_practice_assignment(text,uuid,text) to anon, authenticated;
