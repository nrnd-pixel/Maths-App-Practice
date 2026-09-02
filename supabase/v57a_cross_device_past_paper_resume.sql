-- V5.7A — Cross-device Past Paper Practice resume
-- Additive, token-gated checkpoint storage for registered students.
-- Stores only question order, student response/outcome evidence and assignment context.
-- It never stores PINs, access tokens, correct answers, hints or explanations.

create table if not exists public.student_past_paper_checkpoints_v57a (
  id uuid primary key default gen_random_uuid(),
  roster_student_id uuid not null references public.class_students(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  year_level smallint not null,
  exam_year smallint not null,
  paper text not null,
  paper_key text generated always as (lower(btrim(paper))) stored,
  scope text not null default 'quick' check (scope in ('quick','all')),
  question_ids jsonb not null default '[]'::jsonb,
  next_index integer not null default 0 check (next_index >= 0),
  first_try_count integer not null default 0 check (first_try_count >= 0),
  mastered_count integer not null default 0 check (mastered_count >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  second_try_successes integer not null default 0 check (second_try_successes >= 0),
  answers jsonb not null default '[]'::jsonb,
  assignment_id uuid references public.practice_assignments(id) on delete set null,
  assignment_attempt_id uuid references public.practice_assignment_attempts(id) on delete set null,
  assignment_selection_mode text,
  assignment_question_target integer,
  started_at timestamptz not null default now(),
  saved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_past_paper_checkpoints_v57a_question_ids_array
    check (jsonb_typeof(question_ids) = 'array'),
  constraint student_past_paper_checkpoints_v57a_answers_array
    check (jsonb_typeof(answers) = 'array'),
  constraint student_past_paper_checkpoints_v57a_student_paper_key
    unique (roster_student_id, exam_year, paper_key)
);

create index if not exists student_past_paper_checkpoints_v57a_expiry_idx
  on public.student_past_paper_checkpoints_v57a(expires_at);

alter table public.student_past_paper_checkpoints_v57a enable row level security;
revoke all on table public.student_past_paper_checkpoints_v57a from anon, authenticated;

create or replace function public.get_student_past_paper_checkpoints_v57a(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_rows jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose = 'practice'
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'checkpointId', c.id,
      'version', 1,
      'studentId', v_ticket.student_id,
      'studentName', v_ticket.student_name,
      'yearLevel', c.year_level,
      'examYear', c.exam_year,
      'paper', c.paper,
      'scope', c.scope,
      'questionIds', c.question_ids,
      'nextIndex', c.next_index,
      'first', c.first_try_count,
      'mastered', c.mastered_count,
      'hints', c.hints_used,
      'second', c.second_try_successes,
      'answers', c.answers,
      'startedAt', c.started_at,
      'savedAt', c.saved_at,
      'expiresAt', c.expires_at,
      'assignmentContext', case
        when c.assignment_id is not null
         and c.assignment_attempt_id is not null
         and exists (
           select 1
           from public.practice_assignment_attempts att
           join public.practice_assignments pa on pa.id = att.assignment_id
           where att.id = c.assignment_attempt_id
             and att.assignment_id = c.assignment_id
             and att.roster_student_id = v_ticket.roster_student_id
             and att.status = 'in_progress'
             and pa.class_id = v_ticket.class_id
             and pa.active = true
             and pa.assignment_type = 'past_paper'
             and pa.exam_year = c.exam_year
             and lower(trim(coalesce(pa.paper,''))) = c.paper_key
         )
        then jsonb_build_object(
          'assignmentId', c.assignment_id,
          'attemptId', c.assignment_attempt_id,
          'studentId', v_ticket.student_id,
          'examYear', c.exam_year,
          'paper', c.paper,
          'selectionMode', coalesce(c.assignment_selection_mode,'quick'),
          'target', c.assignment_question_target,
          'savedAt', c.saved_at
        )
        else null
      end
    ) order by c.saved_at desc
  ), '[]'::jsonb)
  into v_rows
  from public.student_past_paper_checkpoints_v57a c
  where c.roster_student_id = v_ticket.roster_student_id
    and c.class_id = v_ticket.class_id
    and c.year_level = v_ticket.year_level
    and c.expires_at > now();

  return jsonb_build_object(
    'student', jsonb_build_object(
      'student_name', v_ticket.student_name,
      'student_id', v_ticket.student_id,
      'year_level', v_ticket.year_level,
      'class_name', v_ticket.class_group
    ),
    'checkpoints', coalesce(v_rows,'[]'::jsonb)
  );
end;
$$;

create or replace function public.save_student_past_paper_checkpoint_v57a(
  p_access_token text,
  p_snapshot jsonb,
  p_assignment_id uuid default null,
  p_assignment_attempt_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_existing public.student_past_paper_checkpoints_v57a;
  v_saved public.student_past_paper_checkpoints_v57a;
  v_assignment public.practice_assignments;
  v_attempt public.practice_assignment_attempts;
  v_exam_year integer;
  v_paper text;
  v_scope text;
  v_question_ids jsonb;
  v_answers jsonb := '[]'::jsonb;
  v_ordered_answers jsonb := '[]'::jsonb;
  v_item text;
  v_item_text text;
  v_part text;
  v_qid uuid;
  v_question public.questions;
  v_physical_ids uuid[] := '{}'::uuid[];
  v_logical_count integer := 0;
  v_available_count integer := 0;
  v_contiguous integer := 0;
  v_item_complete boolean;
  v_has_hint boolean;
  v_first integer := 0;
  v_mastered integer := 0;
  v_hints integer := 0;
  v_second integer := 0;
  v_started_at timestamptz := now();
  v_answer jsonb;
  v_event record;
  v_current_priority integer;
begin
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'A valid Practice checkpoint is required';
  end if;
  if pg_column_size(p_snapshot) > 524288 then
    raise exception 'Practice checkpoint is too large';
  end if;

  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose = 'practice'
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  begin
    v_exam_year := (p_snapshot->>'examYear')::integer;
  exception when others then
    v_exam_year := 0;
  end;
  v_paper := trim(coalesce(p_snapshot->>'paper',''));
  v_scope := case when lower(trim(coalesce(p_snapshot->>'scope',''))) = 'all' then 'all' else 'quick' end;
  v_question_ids := coalesce(p_snapshot->'questionIds','[]'::jsonb);

  if v_exam_year < 1900 or v_exam_year > 2200 or v_paper = '' then
    raise exception 'Past Paper checkpoint metadata is invalid';
  end if;
  if jsonb_typeof(v_question_ids) <> 'array' then
    raise exception 'Past Paper question order is invalid';
  end if;
  v_logical_count := jsonb_array_length(v_question_ids);
  if v_logical_count < 1 or v_logical_count > 100 then
    raise exception 'Past Paper checkpoint question count is invalid';
  end if;
  if (select count(distinct value) from jsonb_array_elements_text(v_question_ids)) <> v_logical_count then
    raise exception 'Past Paper checkpoint contains duplicate question items';
  end if;

  begin
    v_started_at := (p_snapshot->>'startedAt')::timestamptz;
  exception when others then
    v_started_at := now();
  end;
  if v_started_at > now() + interval '5 minutes'
     or v_started_at < now() - interval '7 days' then
    v_started_at := now();
  end if;

  -- Validate every physical UUID inside the logical item order against the
  -- currently Practice-eligible Past Paper bank for this student's year.
  for v_item in select value from jsonb_array_elements_text(v_question_ids)
  loop
    v_item_text := case
      when v_item like 'multipart:%' then substring(v_item from length('multipart:') + 1)
      else v_item
    end;
    if trim(v_item_text) = '' then
      raise exception 'Past Paper checkpoint contains an invalid question item';
    end if;

    foreach v_part in array string_to_array(v_item_text, ',')
    loop
      begin
        v_qid := trim(v_part)::uuid;
      exception when others then
        raise exception 'Past Paper checkpoint contains an invalid question id';
      end;

      if v_qid = any(v_physical_ids) then
        raise exception 'Past Paper checkpoint contains a duplicate question id';
      end if;

      select q.* into v_question
      from public.questions q
      where q.id = v_qid
        and q.practice_eligible = true
        and q.year_level = v_ticket.year_level
        and lower(trim(coalesce(q.source_type,''))) = 'past_paper'
        and q.exam_year = v_exam_year
        and lower(trim(coalesce(q.paper,''))) = lower(trim(v_paper))
      limit 1;

      if v_question.id is null then
        raise exception 'Past Paper checkpoint contains a question that is no longer available';
      end if;
      v_physical_ids := array_append(v_physical_ids, v_qid);
    end loop;
  end loop;

  select count(distinct public.practice_logical_item_key_v53d1(
    q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
  ))::integer
  into v_available_count
  from public.questions q
  where q.practice_eligible = true
    and q.year_level = v_ticket.year_level
    and lower(trim(coalesce(q.source_type,''))) = 'past_paper'
    and q.exam_year = v_exam_year
    and lower(trim(coalesce(q.paper,''))) = lower(trim(v_paper));

  if v_scope = 'all' and v_logical_count <> v_available_count then
    raise exception 'All Available Practice no longer matches the current paper bank';
  end if;
  if v_scope = 'quick' and v_logical_count > least(20, v_available_count) then
    raise exception 'Quick Session checkpoint contains too many questions';
  end if;

  -- Assignment context is optional. It is retained only after server validation.
  if p_assignment_id is not null and p_assignment_attempt_id is not null then
    select att.* into v_attempt
    from public.practice_assignment_attempts att
    where att.id = p_assignment_attempt_id
      and att.assignment_id = p_assignment_id
      and att.roster_student_id = v_ticket.roster_student_id
      and att.status = 'in_progress'
    limit 1;

    if v_attempt.id is not null then
      select pa.* into v_assignment
      from public.practice_assignments pa
      where pa.id = v_attempt.assignment_id
        and pa.class_id = v_ticket.class_id
        and pa.active = true
        and pa.assignment_type = 'past_paper'
        and pa.exam_year = v_exam_year
        and lower(trim(coalesce(pa.paper,''))) = lower(trim(v_paper))
      limit 1;
    end if;

    if v_assignment.id is null then
      p_assignment_id := null;
      p_assignment_attempt_id := null;
    elsif v_logical_count <> greatest(1,coalesce(v_attempt.question_target,1)) then
      raise exception 'Saved Practice does not match the assigned question target';
    end if;
  else
    p_assignment_id := null;
    p_assignment_attempt_id := null;
  end if;

  select c.* into v_existing
  from public.student_past_paper_checkpoints_v57a c
  where c.roster_student_id = v_ticket.roster_student_id
    and c.exam_year = v_exam_year
    and c.paper_key = lower(trim(v_paper))
  limit 1;

  -- A changed question order means the student intentionally started a new
  -- session for this paper. Do not merge outcome evidence from the old order.
  if v_existing.id is not null and v_existing.question_ids = v_question_ids then
    v_answers := coalesce(v_existing.answers,'[]'::jsonb);
  else
    v_answers := '[]'::jsonb;
  end if;

  -- Merge authoritative completed answer-event evidence from the current
  -- Practice ticket. No correct answer, hint text or explanation is copied.
  for v_event in
    select e.*, q.response_type, q.marks
    from public.student_practice_answer_events e
    join public.questions q on q.id = e.question_id
    where e.ticket_id = v_ticket.id
      and e.completed = true
      and e.question_id = any(v_physical_ids)
  loop
    v_answer := jsonb_build_object(
      'questionId', v_event.question_id::text,
      'responseType', coalesce(v_event.response_type,'text'),
      'finalAnswer', coalesce(v_event.final_response->>'display',''),
      'correct', coalesce(v_event.final_correct,false),
      'firstTry', coalesce(v_event.first_correct,false),
      'attempts', greatest(1,coalesce(v_event.attempt_count,1)),
      'hintUsed', coalesce(v_event.hint_used,false),
      'manualReview', coalesce(v_event.response_type,'text') in ('drawing','manual'),
      'responsePayload', case
        when coalesce(v_event.response_type,'text') in ('drawing','manual')
          then coalesce(v_event.final_response->'payload','{}'::jsonb)
        else '{}'::jsonb
      end,
      'marksPossible', greatest(1,coalesce(v_event.marks,1))
    );

    select coalesce(jsonb_agg(x order by priority, ord), '[]'::jsonb)
    into v_answers
    from (
      select elem as x, 1 as priority, ordinality as ord
      from jsonb_array_elements(v_answers) with ordinality a(elem,ordinality)
      where coalesce(elem->>'questionId','') <> v_event.question_id::text
      union all
      select v_answer, 0, 0
    ) merged;
  end loop;

  -- Reorder stored answer evidence to match the paper order and determine the
  -- next resumable logical item only from completed server grading evidence.
  v_contiguous := 0;
  v_hints := 0;
  for v_item in select value from jsonb_array_elements_text(v_question_ids)
  loop
    v_item_text := case
      when v_item like 'multipart:%' then substring(v_item from length('multipart:') + 1)
      else v_item
    end;
    v_item_complete := true;
    v_has_hint := false;

    foreach v_part in array string_to_array(v_item_text, ',')
    loop
      v_qid := trim(v_part)::uuid;
      select elem into v_answer
      from jsonb_array_elements(v_answers) elem
      where elem->>'questionId' = v_qid::text
      limit 1;

      if v_answer is null then
        v_item_complete := false;
      else
        v_ordered_answers := v_ordered_answers || jsonb_build_array(v_answer);
        if coalesce((v_answer->>'hintUsed')::boolean,false) then v_has_hint := true; end if;
      end if;
      v_answer := null;
    end loop;

    if v_has_hint then v_hints := v_hints + 1; end if;
    if v_item_complete and v_contiguous + 1 <= v_logical_count then
      v_contiguous := v_contiguous + 1;
    else
      exit;
    end if;
  end loop;

  if v_contiguous < 1 then
    raise exception 'No completed Practice question is available to checkpoint yet';
  end if;
  if v_contiguous >= v_logical_count then
    -- A completed session should flow through normal Practice result saving,
    -- not remain as an unfinished cross-device checkpoint.
    delete from public.student_past_paper_checkpoints_v57a
    where roster_student_id = v_ticket.roster_student_id
      and exam_year = v_exam_year
      and paper_key = lower(trim(v_paper));
    return jsonb_build_object('saved',false,'completed',true,'nextIndex',v_contiguous);
  end if;

  v_answers := v_ordered_answers;
  select
    count(*) filter (where coalesce((elem->>'firstTry')::boolean,false))::integer,
    count(*) filter (where coalesce((elem->>'correct')::boolean,false))::integer,
    count(*) filter (
      where coalesce((elem->>'correct')::boolean,false)
        and not coalesce((elem->>'firstTry')::boolean,false)
        and coalesce((elem->>'attempts')::integer,1) >= 2
    )::integer
  into v_first,v_mastered,v_second
  from jsonb_array_elements(v_answers) elem;

  insert into public.student_past_paper_checkpoints_v57a(
    roster_student_id,class_id,year_level,exam_year,paper,scope,
    question_ids,next_index,first_try_count,mastered_count,hints_used,second_try_successes,
    answers,assignment_id,assignment_attempt_id,assignment_selection_mode,assignment_question_target,
    started_at,saved_at,expires_at,updated_at
  ) values (
    v_ticket.roster_student_id,v_ticket.class_id,v_ticket.year_level,v_exam_year,v_paper,v_scope,
    v_question_ids,v_contiguous,coalesce(v_first,0),coalesce(v_mastered,0),v_hints,coalesce(v_second,0),
    v_answers,p_assignment_id,p_assignment_attempt_id,
    case when v_assignment.id is not null then v_assignment.selection_mode else null end,
    case when v_attempt.id is not null then v_attempt.question_target else null end,
    v_started_at,now(),now()+interval '7 days',now()
  )
  on conflict on constraint student_past_paper_checkpoints_v57a_student_paper_key
  do update set
    class_id = excluded.class_id,
    year_level = excluded.year_level,
    paper = excluded.paper,
    scope = excluded.scope,
    question_ids = excluded.question_ids,
    next_index = excluded.next_index,
    first_try_count = excluded.first_try_count,
    mastered_count = excluded.mastered_count,
    hints_used = excluded.hints_used,
    second_try_successes = excluded.second_try_successes,
    answers = excluded.answers,
    assignment_id = excluded.assignment_id,
    assignment_attempt_id = excluded.assignment_attempt_id,
    assignment_selection_mode = excluded.assignment_selection_mode,
    assignment_question_target = excluded.assignment_question_target,
    started_at = excluded.started_at,
    saved_at = excluded.saved_at,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at
  returning * into v_saved;

  return jsonb_build_object(
    'saved', true,
    'completed', false,
    'checkpointId', v_saved.id,
    'examYear', v_saved.exam_year,
    'paper', v_saved.paper,
    'nextIndex', v_saved.next_index,
    'questionCount', jsonb_array_length(v_saved.question_ids),
    'savedAt', v_saved.saved_at,
    'expiresAt', v_saved.expires_at,
    'assignmentLinked', v_saved.assignment_attempt_id is not null
  );
end;
$$;

create or replace function public.delete_student_past_paper_checkpoint_v57a(
  p_access_token text,
  p_exam_year integer,
  p_paper text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_deleted integer := 0;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose = 'practice'
    and t.expires_at > now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  delete from public.student_past_paper_checkpoints_v57a c
  where c.roster_student_id = v_ticket.roster_student_id
    and c.exam_year = p_exam_year
    and c.paper_key = lower(trim(coalesce(p_paper,'')));
  get diagnostics v_deleted = row_count;

  return jsonb_build_object('deleted',v_deleted > 0,'count',v_deleted);
end;
$$;

revoke all on function public.get_student_past_paper_checkpoints_v57a(text) from public;
revoke all on function public.save_student_past_paper_checkpoint_v57a(text,jsonb,uuid,uuid) from public;
revoke all on function public.delete_student_past_paper_checkpoint_v57a(text,integer,text) from public;
grant execute on function public.get_student_past_paper_checkpoints_v57a(text) to anon, authenticated;
grant execute on function public.save_student_past_paper_checkpoint_v57a(text,jsonb,uuid,uuid) to anon, authenticated;
grant execute on function public.delete_student_past_paper_checkpoint_v57a(text,integer,text) to anon, authenticated;
