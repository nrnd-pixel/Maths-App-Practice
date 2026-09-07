-- V5.8.1 — Past Paper assignment completion hotfix
--
-- Fixes two production contract issues:
-- 1) submit_practice_session_v3 previously coerced Past Paper Practice to "mixed"
--    and discarded exam_year/paper attribution.
-- 2) complete_student_practice_assignment_v56b depended on an exact result-code
--    lookup and then rejected legacy Past Paper sessions whose practice_mode had
--    already been coerced to "mixed".
--
-- The completion function remains server-enforced. Question-level evidence is
-- authoritative: every saved answer must belong to the assigned paper/topic and
-- the number of distinct logical questions must meet the assignment target.

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

  if v_mode='past_paper' then
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

create or replace function public.complete_student_practice_assignment_v56b(
  p_access_token text,
  p_attempt_id uuid,
  p_result_code text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_attempt public.practice_assignment_attempts;
  v_assignment public.practice_assignments;
  v_session public.practice_sessions;
  v_actual integer:=0;
  v_mismatch integer:=0;
  v_required integer:=0;
  v_candidate_count integer:=0;
  v_candidate_session_id uuid;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice'
    and t.expires_at>now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select a.* into v_attempt
  from public.practice_assignment_attempts a
  where a.id=p_attempt_id
    and a.roster_student_id=v_ticket.roster_student_id
  limit 1;

  if v_attempt.id is null then
    raise exception 'Practice assignment attempt could not be verified';
  end if;

  select pa.* into v_assignment
  from public.practice_assignments pa
  where pa.id=v_attempt.assignment_id
    and pa.class_id=v_ticket.class_id
    and (
      not exists(
        select 1 from public.practice_assignment_recipients pr
        where pr.assignment_id=pa.id
      )
      or exists(
        select 1 from public.practice_assignment_recipients pr
        where pr.assignment_id=pa.id
          and pr.roster_student_id=v_ticket.roster_student_id
      )
    )
  limit 1;

  if v_assignment.id is null then
    raise exception 'Practice assignment could not be verified';
  end if;

  if v_attempt.status='completed' and v_attempt.practice_session_id is not null then
    select ps.* into v_session
    from public.practice_sessions ps
    where ps.id=v_attempt.practice_session_id;

    return jsonb_build_object(
      'completed',true,
      'already_completed',true,
      'attempt_id',v_attempt.id,
      'assignment_id',v_assignment.id,
      'practice_session_id',v_attempt.practice_session_id,
      'result_code',v_session.result_code,
      'mastery_percent',v_session.mastery_percent,
      'first_try_percent',v_session.first_try_percent
    );
  end if;

  v_required:=greatest(1,coalesce(v_attempt.question_target,1));

  -- Preferred path: exact result-code match from the Results screen.
  if trim(coalesce(p_result_code,''))<>'' then
    select ps.* into v_session
    from public.practice_sessions ps
    where lower(trim(coalesce(ps.result_code,'')))=lower(trim(p_result_code))
      and ps.roster_student_id=v_ticket.roster_student_id
      and ps.class_id=v_ticket.class_id
      and ps.practice_mode<>'exam'
      and ps.completed_at>=v_attempt.started_at
    order by ps.completed_at desc
    limit 1;
  end if;

  -- Recovery path for legacy/stale result-code bridges. Only auto-link when
  -- exactly one completed session can be proven from question-level evidence.
  if v_session.id is null then
    select
      count(*)::integer,
      (array_agg(ps.id order by ps.completed_at desc))[1]
    into v_candidate_count,v_candidate_session_id
    from public.practice_sessions ps
    where ps.roster_student_id=v_ticket.roster_student_id
      and ps.class_id=v_ticket.class_id
      and ps.practice_mode<>'exam'
      and coalesce(ps.ended_early,false)=false
      and ps.completed_at>=v_attempt.started_at
      and not exists(
        select 1
        from public.session_answers sa0
        left join public.questions q0 on q0.id=sa0.question_id
        where sa0.session_id=ps.id
          and (
            q0.id is null
            or case
              when v_assignment.assignment_type='past_paper' then
                lower(trim(coalesce(q0.source_type,'')))<>'past_paper'
                or q0.exam_year is distinct from v_assignment.exam_year
                or lower(trim(coalesce(q0.paper,'')))<>lower(trim(coalesce(v_assignment.paper,'')))
              else
                lower(trim(q0.strand))<>lower(trim(v_assignment.strand))
                or (
                  v_assignment.topic is not null
                  and lower(trim(q0.topic))<>lower(trim(v_assignment.topic))
                )
            end
          )
      )
      and (
        select count(distinct public.practice_logical_item_key_v53d1(
          q1.id,q1.parent_question_number,q1.exam_year,q1.paper,q1.source_type,q1.source
        ))::integer
        from public.session_answers sa1
        join public.questions q1 on q1.id=sa1.question_id
        where sa1.session_id=ps.id
      )>=v_required;

    if v_candidate_count=1 and v_candidate_session_id is not null then
      select ps.* into v_session
      from public.practice_sessions ps
      where ps.id=v_candidate_session_id;
    elsif v_candidate_count>1 then
      raise exception 'Multiple completed Practice sessions matched this assignment; teacher review is required';
    end if;
  end if;

  if v_session.id is null then
    raise exception 'Completed Practice session could not be verified';
  end if;

  if coalesce(v_session.ended_early,false) then
    raise exception 'Finish the full assigned Practice set before completing this assignment';
  end if;

  -- Do not trust the legacy practice_mode label as the sole proof of a Past
  -- Paper assignment. V5.8.1 verifies the saved question IDs below instead.
  select
    count(distinct public.practice_logical_item_key_v53d1(
      q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
    ))::integer,
    count(*) filter(where
      case
        when v_assignment.assignment_type='past_paper' then
          lower(trim(coalesce(q.source_type,'')))<>'past_paper'
          or q.exam_year is distinct from v_assignment.exam_year
          or lower(trim(coalesce(q.paper,'')))<>lower(trim(coalesce(v_assignment.paper,'')))
        else
          lower(trim(q.strand))<>lower(trim(v_assignment.strand))
          or (
            v_assignment.topic is not null
            and lower(trim(q.topic))<>lower(trim(v_assignment.topic))
          )
      end
    )::integer
  into v_actual,v_mismatch
  from public.session_answers sa
  join public.questions q on q.id=sa.question_id
  where sa.session_id=v_session.id;

  if coalesce(v_mismatch,0)>0 then
    raise exception 'This Practice session does not match the assigned %',
      case when v_assignment.assignment_type='past_paper' then 'past paper' else 'topic' end;
  end if;

  if coalesce(v_actual,0)<v_required then
    raise exception 'Complete the full assigned Practice set before completing this assignment';
  end if;

  update public.practice_assignment_attempts
  set status='completed',
      practice_session_id=v_session.id,
      completed_at=now(),
      updated_at=now()
  where id=v_attempt.id
  returning * into v_attempt;

  return jsonb_build_object(
    'completed',true,
    'already_completed',false,
    'attempt_id',v_attempt.id,
    'assignment_id',v_assignment.id,
    'assignment_type',v_assignment.assignment_type,
    'practice_session_id',v_session.id,
    'result_code',v_session.result_code,
    'mastery_percent',v_session.mastery_percent,
    'first_try_percent',v_session.first_try_percent,
    'pending_review_count',coalesce(v_session.pending_review_count,0),
    'completed_questions',v_actual,
    'required_questions',v_required
  );
end;
$function$;
