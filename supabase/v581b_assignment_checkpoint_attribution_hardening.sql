-- V5.8.1B — Assignment checkpoint + Past Paper attribution hardening
--
-- Issue #207 fixes four related defects:
-- 1) reopening an in-progress teacher assignment reset attempt.started_at,
--    making a previously valid completed session appear to predate the assignment;
-- 2) legacy/mixed Practice payloads could save genuine Past Paper Practice without
--    exam_year/paper attribution;
-- 3) the active V5.3B Practice submission RPC was cloned before Past Paper
--    attribution existed and therefore still coerced Past Paper Practice to mixed;
-- 4) generic Past Paper checkpoint cleanup could delete assignment-owned state,
--    while completed assignment attempts lacked exact attempt-scoped cleanup.
--
-- This migration is intentionally Supabase-only. Server-side question evidence is
-- authoritative for attribution and assignment completion boundaries.

create or replace function public.start_student_practice_assignment_v56b(
  p_access_token text,
  p_assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_assignment public.practice_assignments;
  v_attempt public.practice_assignment_attempts;
  v_available integer:=0;
  v_count integer:=0;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice' and t.used_at is null and t.expires_at>now()
  order by t.created_at desc limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select pa.* into v_assignment
  from public.practice_assignments pa
  join public.school_classes sc on sc.id=pa.class_id and sc.active=true
  where pa.id=p_assignment_id and pa.active=true and pa.class_id=v_ticket.class_id
    and sc.year_level=v_ticket.year_level
    and (
      not exists(select 1 from public.practice_assignment_recipients pr where pr.assignment_id=pa.id)
      or exists(
        select 1 from public.practice_assignment_recipients pr
        where pr.assignment_id=pa.id and pr.roster_student_id=v_ticket.roster_student_id
      )
    )
  limit 1;

  if v_assignment.id is null then raise exception 'Practice assignment is not available for this student'; end if;

  select count(distinct public.practice_logical_item_key_v53d1(
    q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
  ))::integer
  into v_available
  from public.questions q
  where q.practice_eligible=true and q.year_level=v_ticket.year_level
    and (
      (v_assignment.assignment_type='past_paper'
        and lower(trim(coalesce(q.source_type,'')))='past_paper'
        and q.exam_year=v_assignment.exam_year
        and lower(trim(coalesce(q.paper,'')))=lower(trim(coalesce(v_assignment.paper,''))))
      or
      (v_assignment.assignment_type<>'past_paper'
        and lower(trim(q.strand))=lower(trim(v_assignment.strand))
        and (v_assignment.topic is null or lower(trim(q.topic))=lower(trim(v_assignment.topic))))
    );

  if coalesce(v_available,0)<1 then raise exception 'No Practice-eligible questions are available for this Practice assignment'; end if;
  v_count:=case
    when v_assignment.assignment_type='past_paper' and v_assignment.selection_mode='all_available' then v_available
    else least(v_assignment.question_count,v_available)
  end;

  select a.* into v_attempt from public.practice_assignment_attempts a
  where a.assignment_id=v_assignment.id and a.roster_student_id=v_ticket.roster_student_id limit 1;

  if v_attempt.id is not null and v_attempt.status='completed' then
    return jsonb_build_object('already_completed',true,'attempt_id',v_attempt.id,'assignment_id',v_assignment.id,
      'assignment_type',v_assignment.assignment_type,'strand',v_assignment.strand,'topic',v_assignment.topic,
      'exam_year',v_assignment.exam_year,'paper',v_assignment.paper,'selection_mode',v_assignment.selection_mode,
      'recommended_count',v_attempt.question_target,'started_at',v_attempt.started_at);
  end if;

  if v_attempt.id is null then
    insert into public.practice_assignment_attempts(
      assignment_id,roster_student_id,status,question_target,started_at,updated_at
    ) values(
      v_assignment.id,v_ticket.roster_student_id,'in_progress',v_count,now(),now()
    ) returning * into v_attempt;
  else
    -- Continue the same attempt without moving its original assignment boundary.
    update public.practice_assignment_attempts
    set status='in_progress',question_target=v_count,updated_at=now()
    where id=v_attempt.id returning * into v_attempt;
  end if;

  return jsonb_build_object('already_completed',false,'attempt_id',v_attempt.id,'assignment_id',v_assignment.id,
    'assignment_type',v_assignment.assignment_type,'strand',v_assignment.strand,'topic',v_assignment.topic,
    'exam_year',v_assignment.exam_year,'paper',v_assignment.paper,'selection_mode',v_assignment.selection_mode,
    'question_count',v_assignment.question_count,'available_questions',v_available,
    'recommended_count',v_attempt.question_target,'opens_at',v_assignment.opens_at,'closes_at',v_assignment.closes_at,
    'started_at',v_attempt.started_at);
end;
$function$;

create or replace function public.submit_practice_session_v3(
  p_access_token text,
  p_session jsonb,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_session_id uuid;
  v_result_code text;
  v_key text;
  v_requested integer;
  v_valid integer;
  v_total integer;
  v_auto integer;
  v_first integer;
  v_mastery integer;
  v_hints integer;
  v_second integer;
  v_pending integer;
  v_marks numeric;
  v_auto_marks numeric;
  v_existing uuid;
  v_mode text;
  v_exam_year integer;
  v_paper text;
  v_paper_mismatch integer:=0;
  v_inferred_year integer;
  v_inferred_paper text;
  v_inferred_year_count integer:=0;
  v_inferred_paper_count integer:=0;
  v_non_past_rows integer:=0;
begin
  if jsonb_typeof(coalesce(p_answers,'[]'::jsonb))<>'array' then
    raise exception 'Answers must be an array';
  end if;

  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice'
    and t.expires_at>now()
  limit 1
  for update;

  if v_ticket.id is null then
    raise exception 'Student access could not be verified';
  end if;

  v_key:=trim(coalesce(p_session->>'client_session_key',''));
  if length(v_key)<16 then raise exception 'Invalid session key'; end if;

  if v_ticket.used_at is not null then
    select id into v_existing
    from public.practice_sessions
    where client_session_key=v_key
      and coalesce(roster_student_id,'00000000-0000-0000-0000-000000000000'::uuid)=
          coalesce(v_ticket.roster_student_id,'00000000-0000-0000-0000-000000000000'::uuid)
      and student_name=v_ticket.student_name
    order by completed_at desc
    limit 1;

    if v_existing is null then
      raise exception 'Student access ticket has already been used';
    end if;

    select result_code into v_result_code
    from public.practice_sessions
    where id=v_existing;

    return jsonb_build_object(
      'session_id',v_existing,
      'result_code',v_result_code,
      'already_submitted',true
    );
  end if;

  select count(*),count(distinct x.question_id)
  into v_requested,v_valid
  from jsonb_to_recordset(p_answers) x(question_id text)
  where x.question_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

  if v_requested<>jsonb_array_length(p_answers) or v_valid<>v_requested then
    raise exception 'Answers contain invalid or duplicate question IDs';
  end if;

  select count(*) into v_valid
  from jsonb_to_recordset(p_answers) x(question_id text)
  join public.questions q
    on q.id=x.question_id::uuid
   and q.active
   and q.year_level=v_ticket.year_level
  join public.student_practice_answer_events e
    on e.ticket_id=v_ticket.id
   and e.question_id=q.id
   and e.completed;

  if v_valid<>v_requested then
    raise exception 'Answers contain unavailable or ungraded questions';
  end if;

  v_mode:=case
    when p_session->>'practice_mode' in ('mixed','strand_topic','past_paper')
      then p_session->>'practice_mode'
    else 'mixed'
  end;

  -- Only upgrade legacy/mixed attribution when every submitted question is
  -- Past Paper material from exactly one year + paper and the visible topic
  -- label independently names that same paper.
  select
    min(q.exam_year)::integer,
    min(trim(q.paper)),
    count(distinct q.exam_year)::integer,
    count(distinct lower(trim(q.paper)))::integer,
    count(*) filter(where lower(trim(coalesce(q.source_type,'')))<>'past_paper')::integer
  into v_inferred_year,v_inferred_paper,v_inferred_year_count,v_inferred_paper_count,v_non_past_rows
  from jsonb_to_recordset(p_answers) x(question_id text)
  join public.questions q on q.id=x.question_id::uuid;

  if v_mode<>'past_paper'
     and v_requested>0
     and v_inferred_year_count=1
     and v_inferred_paper_count=1
     and coalesce(v_non_past_rows,0)=0
     and lower(trim(coalesce(p_session->>'topic','')))=
         lower(trim(v_inferred_year::text || ' · ' || v_inferred_paper)) then
    v_mode:='past_paper';
    v_exam_year:=v_inferred_year;
    v_paper:=v_inferred_paper;
  elsif v_mode='past_paper' then
    begin
      v_exam_year:=nullif(trim(coalesce(p_session->>'exam_year','')),'')::integer;
    exception when others then
      raise exception 'Past Paper Practice exam year is invalid';
    end;
    v_paper:=trim(coalesce(p_session->>'paper',''));

    if coalesce(v_exam_year,0)<=0 or v_paper='' then
      raise exception 'Past Paper Practice attribution is incomplete';
    end if;

    select count(*)::integer into v_paper_mismatch
    from jsonb_to_recordset(p_answers) x(question_id text)
    join public.questions q on q.id=x.question_id::uuid
    where lower(trim(coalesce(q.source_type,'')))<>'past_paper'
       or q.exam_year is distinct from v_exam_year
       or lower(trim(coalesce(q.paper,'')))<>lower(v_paper);

    if coalesce(v_paper_mismatch,0)>0 then
      raise exception 'Past Paper Practice answers do not match the selected paper';
    end if;
  else
    v_exam_year:=null;
    v_paper:=null;
  end if;

  with selected as (
    select q.*,e.*
    from jsonb_to_recordset(p_answers) x(question_id text)
    join public.questions q on q.id=x.question_id::uuid
    join public.student_practice_answer_events e
      on e.ticket_id=v_ticket.id
     and e.question_id=q.id
  )
  select
    count(*),
    count(*) filter(where coalesce(response_type,'text') not in ('drawing','manual')),
    count(*) filter(where first_correct),
    count(*) filter(where final_correct),
    count(*) filter(where hint_used),
    count(*) filter(where attempt_count=2 and final_correct and not first_correct),
    count(*) filter(where coalesce(response_type,'text') in ('drawing','manual')),
    coalesce(sum(marks),0),
    coalesce(sum(marks) filter(where coalesce(response_type,'text') not in ('drawing','manual') and final_correct),0)
  into v_total,v_auto,v_first,v_mastery,v_hints,v_second,v_pending,v_marks,v_auto_marks
  from selected;

  insert into public.practice_sessions(
    client_session_key,student_name,student_id,year_level,class_group,
    practice_mode,strand,topic,exam_year,paper,
    first_try_score,mastery_score,total,auto_total,pending_review_count,
    first_try_percent,mastery_percent,hints_used,second_try_successes,
    ended_early,started_at,completed_at,marks_possible,auto_marks_awarded,
    roster_student_id,class_id
  ) values (
    v_key,v_ticket.student_name,v_ticket.student_id,v_ticket.year_level,v_ticket.class_group,
    v_mode,
    left(coalesce(nullif(trim(p_session->>'strand'),''),'mixed'),100),
    left(coalesce(nullif(trim(p_session->>'topic'),''),'Mixed Practice'),200),
    v_exam_year,v_paper,
    v_first,v_mastery,v_total,v_auto,v_pending,
    case when v_auto=0 then 0 else round(v_first*100.0/v_auto)::integer end,
    case when v_auto=0 then 0 else round(v_mastery*100.0/v_auto)::integer end,
    v_hints,v_second,coalesce((p_session->>'ended_early')::boolean,false),
    v_ticket.created_at,now(),v_marks,v_auto_marks,
    v_ticket.roster_student_id,v_ticket.class_id
  ) returning id,result_code into v_session_id,v_result_code;

  insert into public.session_answers(
    session_id,question_id,question_snapshot,strand,topic,subtopic,skill,final_answer,
    correct_answer_snapshot,correct,first_try,attempts,hint_used,explanation_snapshot,
    response_type,response_payload,review_status,marks_possible,marks_awarded
  )
  select
    v_session_id,q.id,q.question_text,q.strand,q.topic,q.subtopic,q.skill,
    coalesce(e.final_response->>'display',''),
    case when coalesce(q.response_type,'text') in ('drawing','manual') then 'Manual review' else q.answer end,
    case when coalesce(q.response_type,'text') in ('drawing','manual') then false else e.final_correct end,
    case when coalesce(q.response_type,'text') in ('drawing','manual') then false else e.first_correct end,
    greatest(1,e.attempt_count),e.hint_used,q.explanation,coalesce(q.response_type,'text'),
    coalesce(e.final_response->'payload','{}'::jsonb),
    case when coalesce(q.response_type,'text') in ('drawing','manual') then 'pending' else 'auto' end,
    q.marks,
    case when coalesce(q.response_type,'text') in ('drawing','manual') then null
         when e.final_correct then q.marks else 0 end
  from jsonb_to_recordset(p_answers) x(question_id text)
  join public.questions q on q.id=x.question_id::uuid
  join public.student_practice_answer_events e
    on e.ticket_id=v_ticket.id
   and e.question_id=q.id;

  update public.student_access_tickets
  set used_at=now()
  where id=v_ticket.id;

  return jsonb_build_object(
    'session_id',v_session_id,
    'result_code',v_result_code,
    'already_submitted',false,
    'practice_mode',v_mode,
    'exam_year',v_exam_year,
    'paper',v_paper,
    'summary',jsonb_build_object(
      'first_try_score',v_first,
      'mastery_score',v_mastery,
      'total',v_total,
      'auto_total',v_auto,
      'pending_review_count',v_pending,
      'first_try_percent',case when v_auto=0 then 0 else round(v_first*100.0/v_auto)::integer end,
      'mastery_percent',case when v_auto=0 then 0 else round(v_mastery*100.0/v_auto)::integer end,
      'hints_used',v_hints,
      'second_try_successes',v_second,
      'marks_possible',v_marks,
      'auto_marks_awarded',v_auto_marks
    )
  );
end;
$function$;

-- The current browser bridge routes ordinary Practice, including Past Paper
-- Practice, through submit_practice_session_v53b. Rebuild that versioned RPC
-- from the corrected V3 contract and retain V5.3B's practice_eligible predicate.
do $v581b_v53b$
declare
  v_def text;
begin
  select pg_get_functiondef('public.submit_practice_session_v3(text,jsonb,jsonb)'::regprocedure)
  into v_def;
  v_def:=replace(v_def,'public.submit_practice_session_v3','public.submit_practice_session_v53b');
  v_def:=replace(v_def,'q.active','q.practice_eligible');
  execute v_def;
end
$v581b_v53b$;

revoke all on function public.submit_practice_session_v53b(text,jsonb,jsonb) from public;
grant execute on function public.submit_practice_session_v53b(text,jsonb,jsonb) to anon,authenticated;

-- Generic Past Paper session cleanup must never delete a teacher-assignment
-- checkpoint. Assignment cleanup is owned by the attempt transition below.
create or replace function public.clear_completed_past_paper_checkpoint_v57a()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.practice_mode = 'past_paper'
     and new.roster_student_id is not null
     and new.exam_year is not null
     and nullif(trim(coalesce(new.paper,'')),'') is not null then
    delete from public.student_past_paper_checkpoints_v57a c
    where c.roster_student_id = new.roster_student_id
      and c.exam_year = new.exam_year
      and c.paper_key = lower(trim(new.paper))
      and c.assignment_id is null;
  end if;
  return new;
end;
$function$;

-- Teacher-assignment cleanup is exact: only the checkpoint owned by the
-- completed and session-linked attempt is removed.
create or replace function public.clear_completed_assignment_checkpoint_v581b()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.status='completed' and new.practice_session_id is not null then
    delete from public.student_past_paper_checkpoints_v57a c
    where c.assignment_attempt_id=new.id;
  end if;
  return new;
end;
$function$;

drop trigger if exists clear_completed_assignment_checkpoint_v581b on public.practice_assignment_attempts;
create trigger clear_completed_assignment_checkpoint_v581b
after insert or update of status,practice_session_id on public.practice_assignment_attempts
for each row execute function public.clear_completed_assignment_checkpoint_v581b();

-- Re-attribute legacy mixed sessions only when server-side question evidence
-- proves every saved answer belongs to exactly one Past Paper and the stored
-- topic independently names that same paper.
with evidence as (
  select ps.id,
         min(q.exam_year)::integer as inferred_year,
         min(trim(q.paper)) as inferred_paper,
         count(distinct q.exam_year)::integer as year_count,
         count(distinct lower(trim(q.paper)))::integer as paper_count,
         count(*) filter(where lower(trim(coalesce(q.source_type,'')))<>'past_paper')::integer as non_past_rows
  from public.practice_sessions ps
  join public.session_answers sa on sa.session_id=ps.id
  join public.questions q on q.id=sa.question_id
  where ps.practice_mode='mixed'
    and ps.topic ~ '^[0-9]{4} · .+'
  group by ps.id
), safe as (
  select e.*
  from evidence e
  join public.practice_sessions ps on ps.id=e.id
  where e.year_count=1 and e.paper_count=1 and e.non_past_rows=0
    and lower(trim(ps.topic))=lower(trim(e.inferred_year::text || ' · ' || e.inferred_paper))
)
update public.practice_sessions ps
set practice_mode='past_paper',exam_year=s.inferred_year,paper=s.inferred_paper
from safe s
where ps.id=s.id;

-- Recover attempts whose original assignment boundary survives in the
-- checkpoint but whose started_at was incorrectly reset by a later Continue.
-- Auto-link only one unambiguous full matching session.
with candidate_sessions as (
  select paa.id as attempt_id,
         c.started_at as original_started_at,
         ps.id as session_id,
         ps.completed_at,
         row_number() over(partition by paa.id order by ps.completed_at desc) as rn,
         count(*) over(partition by paa.id) as candidate_count
  from public.practice_assignment_attempts paa
  join public.practice_assignments pa on pa.id=paa.assignment_id and pa.assignment_type='past_paper'
  join public.student_past_paper_checkpoints_v57a c
    on c.assignment_attempt_id=paa.id and c.assignment_id=paa.assignment_id
  join public.practice_sessions ps
    on ps.roster_student_id=paa.roster_student_id
   and ps.completed_at>=c.started_at
   and coalesce(ps.ended_early,false)=false
  where paa.status='in_progress'
    and c.started_at < paa.started_at
    and not exists(
      select 1
      from public.session_answers sa0
      left join public.questions q0 on q0.id=sa0.question_id
      where sa0.session_id=ps.id
        and (
          q0.id is null
          or lower(trim(coalesce(q0.source_type,'')))<>'past_paper'
          or q0.exam_year is distinct from pa.exam_year
          or lower(trim(coalesce(q0.paper,'')))<>lower(trim(coalesce(pa.paper,'')))
        )
    )
    and (
      select count(distinct public.practice_logical_item_key_v53d1(
        q1.id,q1.parent_question_number,q1.exam_year,q1.paper,q1.source_type,q1.source
      ))::integer
      from public.session_answers sa1
      join public.questions q1 on q1.id=sa1.question_id
      where sa1.session_id=ps.id
    )>=greatest(1,paa.question_target)
), unique_candidates as (
  select * from candidate_sessions where rn=1 and candidate_count=1
)
update public.practice_assignment_attempts paa
set status='completed',
    started_at=least(paa.started_at,uc.original_started_at),
    practice_session_id=uc.session_id,
    completed_at=uc.completed_at,
    updated_at=now()
from unique_candidates uc
where paa.id=uc.attempt_id;

-- Remove checkpoints left behind for assignments already known to be complete.
delete from public.student_past_paper_checkpoints_v57a c
using public.practice_assignment_attempts paa
where c.assignment_attempt_id=paa.id
  and paa.status='completed'
  and paa.practice_session_id is not null;

comment on function public.start_student_practice_assignment_v56b(text,uuid) is
  'V5.8.1B assignment start/continue preserving the original attempt started_at boundary.';
comment on function public.submit_practice_session_v3(text,jsonb,jsonb) is
  'V5.8.1B Practice submission with server-derived Past Paper attribution hardening.';
comment on function public.submit_practice_session_v53b(text,jsonb,jsonb) is
  'V5.8.1B V5.3B Practice submission with practice_eligible validation and server-derived Past Paper attribution.';
comment on function public.clear_completed_past_paper_checkpoint_v57a() is
  'V5.8.1B generic Past Paper checkpoint cleanup excluding teacher-assignment checkpoints.';
comment on function public.clear_completed_assignment_checkpoint_v581b() is
  'V5.8.1B exact teacher-assignment checkpoint cleanup scoped by assignment_attempt_id.';
