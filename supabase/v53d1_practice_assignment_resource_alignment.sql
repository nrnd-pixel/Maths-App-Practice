-- Applied to production as migrations:
-- 20260830225657 v53d1_practice_assignment_resource_alignment
-- 20260830225740 v53d1_internal_helper_privilege_alignment
--
-- Versioned Practice-assignment RPCs align assignment availability/targets with
-- questions.practice_eligible while keeping the established V4.3 recipient and
-- question-target snapshot boundaries. Production main does not call these RPCs
-- until the V5.3D1 frontend bridge is accepted.

create or replace function public.practice_logical_item_key_v53d1(
  p_id uuid,
  p_parent_question_number text,
  p_exam_year smallint,
  p_paper text,
  p_source_type text,
  p_source text
)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case
    when nullif(trim(coalesce(p_parent_question_number,'')),'') is null
      then 'single|' || p_id::text
    when p_exam_year is not null and nullif(trim(coalesce(p_paper,'')),'') is not null
      then 'group|exam|' || p_exam_year::text || '|' ||
        lower(regexp_replace(trim(p_paper),'\s+','','g')) || '|' ||
        lower(regexp_replace(trim(p_parent_question_number),'\s+','','g'))
    else 'group|resource|' ||
      lower(regexp_replace(trim(coalesce(p_source_type,'unknown')),'\s+',' ','g')) || '|' ||
      lower(regexp_replace(trim(coalesce(p_source,'unknown')),'\s+',' ','g')) || '|' ||
      lower(regexp_replace(trim(p_parent_question_number),'\s+','','g'))
  end;
$function$;

create or replace function public.get_student_practice_assignments_v53d1(p_access_token text)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_assignments jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice' and t.expires_at>now()
  order by t.created_at desc limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null or v_ticket.class_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  with rows as (
    select pa.id assignment_id,pa.class_id,sc.name class_name,sc.year_level,
      pa.strand,pa.topic,pa.question_count,pa.opens_at,pa.closes_at,pa.created_at,
      att.id attempt_id,att.status attempt_status,att.started_at,att.completed_at,
      att.practice_session_id,ps.result_code,ps.mastery_percent,ps.pending_review_count,
      coalesce(qc.available_items,0)::integer available_items,
      least(pa.question_count,coalesce(qc.available_items,0)::integer) recommended_count,
      exists(select 1 from public.practice_assignment_recipients pr where pr.assignment_id=pa.id) targeted,
      case when pa.opens_at is not null and now()<pa.opens_at then 'upcoming'
           when pa.closes_at is not null and now()>=pa.closes_at then 'due_passed'
           else 'active' end timing_status,
      case when att.id is null then 'not_started'
           when att.status='completed' then 'completed'
           else 'in_progress' end student_status
    from public.practice_assignments pa
    join public.school_classes sc on sc.id=pa.class_id and sc.active=true
    left join public.practice_assignment_attempts att
      on att.assignment_id=pa.id and att.roster_student_id=v_ticket.roster_student_id
    left join public.practice_sessions ps on ps.id=att.practice_session_id
    left join lateral (
      select count(distinct public.practice_logical_item_key_v53d1(
        q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
      )) available_items
      from public.questions q
      where q.practice_eligible=true and q.year_level=sc.year_level
        and lower(trim(q.strand))=lower(trim(pa.strand))
        and (pa.topic is null or lower(trim(q.topic))=lower(trim(pa.topic)))
    ) qc on true
    where pa.class_id=v_ticket.class_id and pa.active=true and sc.year_level=v_ticket.year_level
      and (
        not exists(select 1 from public.practice_assignment_recipients pr where pr.assignment_id=pa.id)
        or exists(
          select 1 from public.practice_assignment_recipients pr
          where pr.assignment_id=pa.id and pr.roster_student_id=v_ticket.roster_student_id
        )
      )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'assignment_id',assignment_id,'class_id',class_id,'class_name',class_name,'year_level',year_level,
    'strand',strand,'topic',topic,'question_count',question_count,
    'available_questions',available_items,'recommended_count',recommended_count,
    'opens_at',opens_at,'closes_at',closes_at,'timing_status',timing_status,'status',student_status,
    'audience',case when targeted then 'individual' else 'class' end,
    'attempt',case when attempt_id is null then null else jsonb_build_object(
      'attempt_id',attempt_id,'status',attempt_status,'started_at',started_at,'completed_at',completed_at,
      'practice_session_id',practice_session_id,'result_code',result_code,
      'mastery_percent',mastery_percent,'pending_review_count',coalesce(pending_review_count,0)) end,
    'primary_action',case when student_status='completed' and result_code is not null then 'view_result'
      when student_status='completed' then 'completed' when student_status='in_progress' then 'continue' else 'start' end
  ) order by case student_status when 'in_progress' then 0 when 'not_started' then 1 else 2 end,
    case timing_status when 'active' then 0 when 'upcoming' then 1 else 2 end,
    closes_at asc nulls last,created_at desc),'[]'::jsonb)
  into v_assignments from rows;

  return jsonb_build_object(
    'student',jsonb_build_object('student_name',v_ticket.student_name,'student_id',v_ticket.student_id,
      'year_level',v_ticket.year_level,'class_name',v_ticket.class_group),
    'assignments',coalesce(v_assignments,'[]'::jsonb));
end;
$function$;

create or replace function public.start_student_practice_assignment_v53d1(p_access_token text,p_assignment_id uuid)
returns jsonb
language plpgsql security definer set search_path to ''
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
    and lower(trim(q.strand))=lower(trim(v_assignment.strand))
    and (v_assignment.topic is null or lower(trim(q.topic))=lower(trim(v_assignment.topic)));

  if coalesce(v_available,0)<1 then raise exception 'No Practice-eligible questions are available for this Practice assignment'; end if;
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
$function$;

create or replace function public.complete_student_practice_assignment_v53d1(p_access_token text,p_attempt_id uuid,p_result_code text)
returns jsonb
language plpgsql security definer set search_path to ''
as $function$
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
  where pa.id=v_attempt.assignment_id and pa.class_id=v_ticket.class_id
    and (
      not exists(select 1 from public.practice_assignment_recipients pr where pr.assignment_id=pa.id)
      or exists(
        select 1 from public.practice_assignment_recipients pr
        where pr.assignment_id=pa.id and pr.roster_student_id=v_ticket.roster_student_id
      )
    )
  limit 1;
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

  select count(distinct public.practice_logical_item_key_v53d1(
      q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
    ))::integer,
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
$function$;

revoke all on function public.practice_logical_item_key_v53d1(uuid,text,smallint,text,text,text) from public;
revoke all on function public.get_student_practice_assignments_v53d1(text) from public;
revoke all on function public.start_student_practice_assignment_v53d1(text,uuid) from public;
revoke all on function public.complete_student_practice_assignment_v53d1(text,uuid,text) from public;

grant execute on function public.get_student_practice_assignments_v53d1(text) to anon,authenticated;
grant execute on function public.start_student_practice_assignment_v53d1(text,uuid) to anon,authenticated;
grant execute on function public.complete_student_practice_assignment_v53d1(text,uuid,text) to anon,authenticated;

-- Follow-up privilege alignment: the pure key helper is internal only.
revoke execute on function public.practice_logical_item_key_v53d1(uuid,text,smallint,text,text,text) from anon,authenticated,service_role;

comment on function public.practice_logical_item_key_v53d1(uuid,text,smallint,text,text,text) is 'Internal V5.3D1 pure logical-item key helper. Client EXECUTE revoked; called only by server assignment functions.';
comment on function public.get_student_practice_assignments_v53d1(text) is 'V5.3D1 student Practice assignment listing aligned to questions.practice_eligible and unified logical multipart identity.';
comment on function public.start_student_practice_assignment_v53d1(text,uuid) is 'V5.3D1 Practice assignment target snapshot aligned to the unified Practice resource bank.';
comment on function public.complete_student_practice_assignment_v53d1(text,uuid,text) is 'V5.3D1 Practice assignment completion uses source-aware logical multipart counting while preserving the attempt target snapshot.';
