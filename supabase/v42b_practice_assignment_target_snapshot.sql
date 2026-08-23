-- V4.2B follow-up: snapshot the actual logical-question target on each attempt.
-- This prevents question-bank changes from moving the completion requirement mid-session.

alter table public.practice_assignment_attempts
  add column if not exists question_target integer not null default 1
  check (question_target between 1 and 20);

create or replace function public.start_student_practice_assignment(p_access_token text,p_assignment_id uuid)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
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
  limit 1;

  if v_assignment.id is null then raise exception 'Practice assignment is not available for this student'; end if;

  select count(distinct case
    when nullif(trim(q.parent_question_number),'') is not null
     and q.exam_year is not null and nullif(trim(q.paper),'') is not null
    then concat('group|',q.exam_year,'|',lower(regexp_replace(trim(q.paper),'\s+','','g')),'|',lower(regexp_replace(trim(q.parent_question_number),'\s+','','g')))
    else concat('single|',q.id::text) end)::integer
  into v_available
  from public.questions q
  where q.active=true and q.year_level=v_ticket.year_level
    and lower(trim(q.strand))=lower(trim(v_assignment.strand))
    and (v_assignment.topic is null or lower(trim(q.topic))=lower(trim(v_assignment.topic)));

  if coalesce(v_available,0)<1 then raise exception 'No active questions are available for this Practice assignment'; end if;
  v_count:=least(v_assignment.question_count,v_available);

  select a.* into v_attempt from public.practice_assignment_attempts a
  where a.assignment_id=v_assignment.id and a.roster_student_id=v_ticket.roster_student_id limit 1;

  if v_attempt.id is not null and v_attempt.status='completed' then
    return jsonb_build_object('already_completed',true,'attempt_id',v_attempt.id,'assignment_id',v_assignment.id,
      'strand',v_assignment.strand,'topic',v_assignment.topic,'recommended_count',v_attempt.question_target);
  end if;

  if v_attempt.id is null then
    insert into public.practice_assignment_attempts(
      assignment_id,roster_student_id,status,question_target,started_at,updated_at
    ) values(
      v_assignment.id,v_ticket.roster_student_id,'in_progress',v_count,now(),now()
    ) returning * into v_attempt;
  else
    update public.practice_assignment_attempts
    set status='in_progress',question_target=v_count,practice_session_id=null,
        completed_at=null,started_at=now(),updated_at=now()
    where id=v_attempt.id returning * into v_attempt;
  end if;

  return jsonb_build_object('already_completed',false,'attempt_id',v_attempt.id,'assignment_id',v_assignment.id,
    'strand',v_assignment.strand,'topic',v_assignment.topic,'question_count',v_assignment.question_count,
    'available_questions',v_available,'recommended_count',v_attempt.question_target,
    'opens_at',v_assignment.opens_at,'closes_at',v_assignment.closes_at);
end;
$$;

create or replace function public.complete_student_practice_assignment(p_access_token text,p_attempt_id uuid,p_result_code text)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_attempt public.practice_assignment_attempts;
  v_assignment public.practice_assignments;
  v_session public.practice_sessions;
  v_actual integer:=0;
  v_mismatch integer:=0;
  v_required integer:=0;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice' and t.expires_at>now()
  order by t.created_at desc limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select a.* into v_attempt from public.practice_assignment_attempts a
  where a.id=p_attempt_id and a.roster_student_id=v_ticket.roster_student_id limit 1;
  if v_attempt.id is null then raise exception 'Practice assignment attempt could not be verified'; end if;

  select pa.* into v_assignment from public.practice_assignments pa
  where pa.id=v_attempt.assignment_id and pa.class_id=v_ticket.class_id limit 1;
  if v_assignment.id is null then raise exception 'Practice assignment could not be verified'; end if;

  if v_attempt.status='completed' and v_attempt.practice_session_id is not null then
    select ps.* into v_session from public.practice_sessions ps where ps.id=v_attempt.practice_session_id;
    return jsonb_build_object('completed',true,'already_completed',true,'attempt_id',v_attempt.id,
      'assignment_id',v_assignment.id,'practice_session_id',v_attempt.practice_session_id,
      'result_code',v_session.result_code,'mastery_percent',v_session.mastery_percent);
  end if;

  select ps.* into v_session from public.practice_sessions ps
  where lower(trim(coalesce(ps.result_code,'')))=lower(trim(coalesce(p_result_code,'')))
    and ps.roster_student_id=v_ticket.roster_student_id and ps.class_id=v_ticket.class_id
    and ps.practice_mode<>'exam' and ps.completed_at>=v_attempt.started_at
  order by ps.completed_at desc limit 1;

  if v_session.id is null then raise exception 'Completed Practice session could not be verified'; end if;
  if coalesce(v_session.ended_early,false) then
    raise exception 'Finish the full assigned Practice set before completing this assignment';
  end if;

  select count(distinct case
    when nullif(trim(q.parent_question_number),'') is not null
     and q.exam_year is not null and nullif(trim(q.paper),'') is not null
    then concat('group|',q.exam_year,'|',lower(regexp_replace(trim(q.paper),'\s+','','g')),'|',lower(regexp_replace(trim(q.parent_question_number),'\s+','','g')))
    else concat('single|',q.id::text) end)::integer,
    count(*) filter(where lower(trim(q.strand))<>lower(trim(v_assignment.strand))
      or (v_assignment.topic is not null and lower(trim(q.topic))<>lower(trim(v_assignment.topic))))::integer
  into v_actual,v_mismatch
  from public.session_answers sa join public.questions q on q.id=sa.question_id
  where sa.session_id=v_session.id;

  v_required:=greatest(1,coalesce(v_attempt.question_target,1));
  if coalesce(v_mismatch,0)>0 then raise exception 'This Practice session does not match the assigned topic'; end if;
  if coalesce(v_actual,0)<v_required then raise exception 'Complete the full assigned Practice set before completing this assignment'; end if;

  update public.practice_assignment_attempts
  set status='completed',practice_session_id=v_session.id,completed_at=now(),updated_at=now()
  where id=v_attempt.id returning * into v_attempt;

  return jsonb_build_object('completed',true,'already_completed',false,'attempt_id',v_attempt.id,
    'assignment_id',v_assignment.id,'practice_session_id',v_session.id,'result_code',v_session.result_code,
    'mastery_percent',v_session.mastery_percent,'pending_review_count',coalesce(v_session.pending_review_count,0),
    'completed_questions',v_actual,'required_questions',v_required);
end;
$$;
