-- V5.2C — Topical Practice Hint + Live Publication Guard
-- Applied to production as 20260830111213 v52c_topical_hint_guard.
-- Ordinary Practice hint/grading RPCs remain unchanged.

create or replace function public.request_topical_hint_v52c(
  p_access_token text,
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_question public.questions;
  v_readiness jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice'
    and t.used_at is null
    and t.expires_at>now()
    and nullif(trim(coalesce(t.topical_source,'')),'') is not null
  limit 1;
  if v_ticket.id is null then raise exception 'Student access could not be verified'; end if;

  if not exists (
    select 1 from public.topical_exercise_settings s
    where s.year_level=v_ticket.year_level
      and lower(trim(s.source))=lower(trim(v_ticket.topical_source))
      and s.is_available=true
  ) then raise exception 'This topical exercise is not currently available'; end if;

  v_readiness := public.topical_exercise_readiness_v52c(v_ticket.year_level, v_ticket.topical_source);
  if coalesce((v_readiness->>'ready')::boolean,false) is not true then
    raise exception 'This topical exercise is not currently available';
  end if;

  select q.* into v_question
  from public.questions q
  where q.id=p_question_id
    and q.source_type='topical_exercise'
    and q.active=false
    and q.year_level=v_ticket.year_level
    and coalesce(q.review_status,'none')='reviewed'
    and lower(trim(q.source))=lower(trim(v_ticket.topical_source));
  if v_question.id is null or coalesce(v_question.response_type,'text') in ('drawing','manual') then
    raise exception 'Question is unavailable for automatic practice feedback';
  end if;

  insert into public.student_practice_answer_events(ticket_id,question_id,hint_used)
  values(v_ticket.id,v_question.id,true)
  on conflict(ticket_id,question_id) do update set hint_used=true,updated_at=now();

  return jsonb_build_object('hint',v_question.hint,'hint_used',true);
end;
$$;

create or replace function public.grade_topical_response_v52c(
  p_access_token text,
  p_question_id uuid,
  p_response jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_question public.questions;
  v_event public.student_practice_answer_events;
  v_readiness jsonb;
  v_attempt smallint;
  v_correct boolean;
  v_manual boolean;
  v_complete boolean;
begin
  select t.* into v_ticket from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice' and t.used_at is null and t.expires_at>now()
    and nullif(trim(coalesce(t.topical_source,'')),'') is not null
  limit 1;
  if v_ticket.id is null then raise exception 'Student access could not be verified'; end if;

  if not exists (
    select 1 from public.topical_exercise_settings s
    where s.year_level=v_ticket.year_level
      and lower(trim(s.source))=lower(trim(v_ticket.topical_source))
      and s.is_available=true
  ) then raise exception 'This topical exercise is not currently available'; end if;

  v_readiness := public.topical_exercise_readiness_v52c(v_ticket.year_level, v_ticket.topical_source);
  if coalesce((v_readiness->>'ready')::boolean,false) is not true then
    raise exception 'This topical exercise is not currently available';
  end if;

  select q.* into v_question from public.questions q
  where q.id=p_question_id
    and q.source_type='topical_exercise'
    and q.active=false
    and q.year_level=v_ticket.year_level
    and coalesce(q.review_status,'none')='reviewed'
    and lower(trim(q.source))=lower(trim(v_ticket.topical_source));
  if v_question.id is null then raise exception 'Question is not part of this topical practice session'; end if;
  if public.student_response_is_empty(coalesce(p_response,'{}'::jsonb)) then raise exception 'A response is required'; end if;

  select e.* into v_event from public.student_practice_answer_events e
  where e.ticket_id=v_ticket.id and e.question_id=v_question.id for update;
  if not found then
    insert into public.student_practice_answer_events(ticket_id,question_id)
    values(v_ticket.id,v_question.id) returning * into v_event;
  end if;

  v_manual := coalesce(v_question.response_type,'text') in ('drawing','manual');
  if v_event.completed then
    return jsonb_build_object(
      'question_id',v_question.id,'manual_review',v_manual,'pending_review',v_manual,
      'correct',v_event.final_correct,'first_try',v_event.first_correct,
      'attempt_number',v_event.attempt_count,'completed',true,'hint_used',v_event.hint_used,
      'correct_answer',case when v_manual then null else v_question.answer end,
      'explanation',case when v_manual then null else v_question.explanation end,
      'marks_possible',v_question.marks
    );
  end if;

  if v_manual then
    update public.student_practice_answer_events set attempt_count=1,final_correct=false,
      completed=true,final_response=p_response,updated_at=now()
    where id=v_event.id returning * into v_event;
    return jsonb_build_object('question_id',v_question.id,'manual_review',true,'pending_review',true,
      'correct',false,'first_try',false,'attempt_number',1,'completed',true,'hint_used',false,
      'correct_answer',null,'explanation',null,'marks_possible',v_question.marks);
  end if;

  v_attempt := least(2,(v_event.attempt_count+1)::integer)::smallint;
  v_correct := public.student_response_is_correct(v_question,p_response);
  v_complete := v_correct or v_attempt>=2;
  update public.student_practice_answer_events set
    attempt_count=v_attempt,
    first_correct=(v_attempt=1 and v_correct),
    final_correct=v_correct,
    hint_used=hint_used or (v_attempt=1 and not v_correct),
    completed=v_complete,
    final_response=p_response,
    updated_at=now()
  where id=v_event.id returning * into v_event;

  return jsonb_build_object(
    'question_id',v_question.id,'manual_review',false,'pending_review',false,
    'correct',v_correct,'first_try',v_event.first_correct,'attempt_number',v_attempt,
    'completed',v_complete,'hint_used',v_event.hint_used,
    'hint',case when not v_correct and v_attempt=1 then v_question.hint else null end,
    'correct_answer',case when v_complete then v_question.answer else null end,
    'explanation',case when v_complete then v_question.explanation else null end,
    'marks_possible',v_question.marks
  );
end;
$$;

revoke execute on function public.request_topical_hint_v52c(text,uuid) from public;
grant execute on function public.request_topical_hint_v52c(text,uuid) to anon, authenticated;
