-- V5.6B — Teacher-assigned Past Paper Practice
-- Additive assignment metadata + versioned RPCs. Existing targeted assignments and
-- V5.3D1 functions remain intact for rollback.

alter table public.practice_assignments
  add column if not exists assignment_type text not null default 'targeted',
  add column if not exists exam_year smallint,
  add column if not exists paper text,
  add column if not exists selection_mode text not null default 'quick';

alter table public.practice_assignments drop constraint if exists practice_assignments_assignment_type_check;
alter table public.practice_assignments add constraint practice_assignments_assignment_type_check
  check (assignment_type in ('targeted','past_paper'));

alter table public.practice_assignments drop constraint if exists practice_assignments_selection_mode_check;
alter table public.practice_assignments add constraint practice_assignments_selection_mode_check
  check (selection_mode in ('quick','all_available'));

alter table public.practice_assignments drop constraint if exists practice_assignments_strand_check;
alter table public.practice_assignments add constraint practice_assignments_strand_check
  check (strand in ('number','measurement','geometry','statistics','thinking','past_paper'));

alter table public.practice_assignments drop constraint if exists practice_assignments_v56b_shape_check;
alter table public.practice_assignments add constraint practice_assignments_v56b_shape_check
  check (
    (assignment_type='targeted' and strand <> 'past_paper')
    or
    (assignment_type='past_paper'
      and strand='past_paper'
      and exam_year is not null
      and exam_year between 2000 and 2100
      and paper is not null
      and length(trim(paper)) between 1 and 100)
  );

alter table public.practice_assignment_attempts drop constraint if exists practice_assignment_attempts_question_target_check;
alter table public.practice_assignment_attempts add constraint practice_assignment_attempts_question_target_check
  check (question_target >= 1 and question_target <= 500);

create index if not exists practice_assignments_type_paper_idx
  on public.practice_assignments(class_id,assignment_type,exam_year,paper,active);

create or replace function public.create_teacher_past_paper_assignments_v56b(
  p_class_ids uuid[],
  p_exam_year integer,
  p_paper text,
  p_selection_mode text default 'quick',
  p_question_count integer default 5,
  p_opens_at timestamptz default null,
  p_closes_at timestamptz default null,
  p_target_student_ids uuid[] default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_class_ids uuid[];
  v_target_ids uuid[];
  v_class_count integer:=0;
  v_target_count integer:=0;
  v_active_class_count integer:=0;
  v_active_target_count integer:=0;
  v_min_year smallint;
  v_max_year smallint;
  v_paper text:=nullif(trim(coalesce(p_paper,'')),'');
  v_mode text:=lower(trim(coalesce(p_selection_mode,'quick')));
  v_available integer:=0;
  v_recommended integer:=0;
  v_store_count integer:=5;
  v_assignment public.practice_assignments;
  v_class public.school_classes;
  v_created jsonb:='[]'::jsonb;
  v_target_names jsonb:='[]'::jsonb;
  v_audience text;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;

  select coalesce(array_agg(distinct value order by value),'{}'::uuid[])
  into v_class_ids
  from unnest(coalesce(p_class_ids,'{}'::uuid[])) as u(value)
  where value is not null;

  select coalesce(array_agg(distinct value order by value),'{}'::uuid[])
  into v_target_ids
  from unnest(coalesce(p_target_student_ids,'{}'::uuid[])) as u(value)
  where value is not null;

  v_class_count:=cardinality(v_class_ids);
  v_target_count:=cardinality(v_target_ids);
  if v_class_count<1 then raise exception 'Choose at least one class'; end if;
  if coalesce(p_exam_year,0)<2000 or p_exam_year>2100 then raise exception 'Choose a valid past-paper year'; end if;
  if v_paper is null then raise exception 'Choose a past paper'; end if;
  if v_mode not in ('quick','all_available') then raise exception 'Choose Quick Session or All Available Questions'; end if;
  if v_mode='quick' and (coalesce(p_question_count,0)<1 or p_question_count>20) then
    raise exception 'Quick Session target must be between 1 and 20 questions';
  end if;
  if p_opens_at is not null and p_closes_at is not null and p_closes_at<=p_opens_at then
    raise exception 'Target due date must be after the suggested start';
  end if;

  select count(*)::integer,min(sc.year_level),max(sc.year_level)
  into v_active_class_count,v_min_year,v_max_year
  from public.school_classes sc
  where sc.id=any(v_class_ids) and sc.active=true;
  if v_active_class_count<>v_class_count then raise exception 'Every selected class must be active'; end if;
  if v_min_year is distinct from v_max_year then raise exception 'Selected classes must be in the same year level'; end if;

  if v_target_count>0 then
    if v_class_count<>1 then raise exception 'Selected students must belong to one selected class'; end if;
    select count(*)::integer into v_active_target_count
    from public.class_students cs
    where cs.id=any(v_target_ids) and cs.class_id=v_class_ids[1] and cs.active=true;
    if v_active_target_count<>v_target_count then raise exception 'Every selected student must be active in the selected class'; end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'roster_student_id',cs.id,'student_id',cs.student_id,'student_name',cs.student_name
    ) order by cs.student_name,cs.student_id),'[]'::jsonb)
    into v_target_names
    from public.class_students cs
    where cs.id=any(v_target_ids);
  end if;

  select count(distinct public.practice_logical_item_key_v53d1(
    q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
  ))::integer
  into v_available
  from public.questions q
  where q.practice_eligible=true
    and q.year_level=v_min_year
    and lower(trim(coalesce(q.source_type,'')))='past_paper'
    and q.exam_year=p_exam_year
    and lower(trim(coalesce(q.paper,'')))=lower(v_paper);

  if coalesce(v_available,0)<1 then
    raise exception 'No Practice-eligible questions are available for this past paper';
  end if;

  v_recommended:=case when v_mode='all_available' then v_available else least(p_question_count,v_available) end;
  v_store_count:=case when v_mode='all_available' then least(20,greatest(1,v_available)) else p_question_count end;

  for v_class in
    select sc.* from public.school_classes sc
    where sc.id=any(v_class_ids)
    order by sc.name,sc.id
  loop
    insert into public.practice_assignments(
      class_id,strand,topic,question_count,opens_at,closes_at,active,created_by,created_at,updated_at,
      assignment_type,exam_year,paper,selection_mode
    ) values (
      v_class.id,'past_paper',p_exam_year::text||' · '||v_paper,v_store_count,
      p_opens_at,p_closes_at,true,auth.uid(),now(),now(),
      'past_paper',p_exam_year::smallint,v_paper,v_mode
    ) returning * into v_assignment;

    if v_target_count>0 then
      insert into public.practice_assignment_recipients(assignment_id,roster_student_id)
      select v_assignment.id,cs.id
      from public.class_students cs
      where cs.id=any(v_target_ids) and cs.class_id=v_class.id and cs.active=true;
    end if;

    v_created:=v_created||jsonb_build_array(jsonb_build_object(
      'assignment_id',v_assignment.id,'class_id',v_class.id,'class_name',v_class.name,
      'year_level',v_class.year_level,'recommended_count',v_recommended
    ));
  end loop;

  v_audience:=case
    when v_target_count=1 then 'individual'
    when v_target_count>1 then 'students'
    when v_class_count>1 then 'classes'
    else 'class'
  end;

  return jsonb_build_object(
    'created',true,'audience',v_audience,'class_count',v_class_count,'student_count',v_target_count,
    'assignment_type','past_paper','exam_year',p_exam_year,'paper',v_paper,'selection_mode',v_mode,
    'question_count',case when v_mode='all_available' then null else p_question_count end,
    'available_questions',v_available,'recommended_count',v_recommended,
    'assignments',v_created,'students',v_target_names
  );
end;
$$;

create or replace function public.get_student_practice_assignments_v56b(p_access_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
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
      pa.assignment_type,pa.strand,pa.topic,pa.question_count,pa.exam_year,pa.paper,pa.selection_mode,
      pa.opens_at,pa.closes_at,pa.created_at,
      att.id attempt_id,att.status attempt_status,att.started_at,att.completed_at,
      att.practice_session_id,att.question_target,ps.result_code,ps.mastery_percent,ps.first_try_percent,ps.pending_review_count,
      coalesce(qc.available_items,0)::integer available_items,
      case
        when pa.assignment_type='past_paper' and pa.selection_mode='all_available' then coalesce(qc.available_items,0)::integer
        else least(pa.question_count,coalesce(qc.available_items,0)::integer)
      end recommended_count,
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
        and (
          (pa.assignment_type='past_paper'
            and lower(trim(coalesce(q.source_type,'')))='past_paper'
            and q.exam_year=pa.exam_year
            and lower(trim(coalesce(q.paper,'')))=lower(trim(coalesce(pa.paper,''))))
          or
          (pa.assignment_type<>'past_paper'
            and lower(trim(q.strand))=lower(trim(pa.strand))
            and (pa.topic is null or lower(trim(q.topic))=lower(trim(pa.topic))))
        )
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
    'assignment_type',assignment_type,'strand',strand,'topic',topic,'question_count',question_count,
    'exam_year',exam_year,'paper',paper,'selection_mode',selection_mode,
    'available_questions',available_items,'recommended_count',recommended_count,
    'opens_at',opens_at,'closes_at',closes_at,'timing_status',timing_status,'status',student_status,
    'audience',case when targeted then 'individual' else 'class' end,
    'attempt',case when attempt_id is null then null else jsonb_build_object(
      'attempt_id',attempt_id,'status',attempt_status,'started_at',started_at,'completed_at',completed_at,
      'question_target',question_target,'practice_session_id',practice_session_id,'result_code',result_code,
      'mastery_percent',mastery_percent,'first_try_percent',first_try_percent,
      'pending_review_count',coalesce(pending_review_count,0)) end,
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
$$;

create or replace function public.start_student_practice_assignment_v56b(p_access_token text,p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
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
      'recommended_count',v_attempt.question_target);
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
    'assignment_type',v_assignment.assignment_type,'strand',v_assignment.strand,'topic',v_assignment.topic,
    'exam_year',v_assignment.exam_year,'paper',v_assignment.paper,'selection_mode',v_assignment.selection_mode,
    'question_count',v_assignment.question_count,'available_questions',v_available,
    'recommended_count',v_attempt.question_target,'opens_at',v_assignment.opens_at,'closes_at',v_assignment.closes_at);
end;
$$;

create or replace function public.complete_student_practice_assignment_v56b(
  p_access_token text,p_attempt_id uuid,p_result_code text
)
returns jsonb
language plpgsql
security definer
set search_path=''
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
      'result_code',v_session.result_code,'mastery_percent',v_session.mastery_percent,
      'first_try_percent',v_session.first_try_percent);
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
  if v_assignment.assignment_type='past_paper' and v_session.practice_mode<>'past_paper' then
    raise exception 'This Practice result is not from the assigned past paper';
  end if;

  select count(distinct public.practice_logical_item_key_v53d1(
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
          or (v_assignment.topic is not null and lower(trim(q.topic))<>lower(trim(v_assignment.topic)))
      end
    )::integer
  into v_actual,v_mismatch
  from public.session_answers sa join public.questions q on q.id=sa.question_id
  where sa.session_id=v_session.id;

  v_required:=greatest(1,coalesce(v_attempt.question_target,1));
  if coalesce(v_mismatch,0)>0 then
    raise exception 'This Practice session does not match the assigned %',case when v_assignment.assignment_type='past_paper' then 'past paper' else 'topic' end;
  end if;
  if coalesce(v_actual,0)<v_required then raise exception 'Complete the full assigned Practice set before completing this assignment'; end if;

  update public.practice_assignment_attempts
  set status='completed',practice_session_id=v_session.id,completed_at=now(),updated_at=now()
  where id=v_attempt.id returning * into v_attempt;

  return jsonb_build_object('completed',true,'already_completed',false,'attempt_id',v_attempt.id,
    'assignment_id',v_assignment.id,'assignment_type',v_assignment.assignment_type,
    'practice_session_id',v_session.id,'result_code',v_session.result_code,
    'mastery_percent',v_session.mastery_percent,'first_try_percent',v_session.first_try_percent,
    'pending_review_count',coalesce(v_session.pending_review_count,0),
    'completed_questions',v_actual,'required_questions',v_required);
end;
$$;

revoke all on function public.create_teacher_past_paper_assignments_v56b(uuid[],integer,text,text,integer,timestamptz,timestamptz,uuid[]) from public,anon;
grant execute on function public.create_teacher_past_paper_assignments_v56b(uuid[],integer,text,text,integer,timestamptz,timestamptz,uuid[]) to authenticated,service_role;

revoke all on function public.get_student_practice_assignments_v56b(text) from public;
grant execute on function public.get_student_practice_assignments_v56b(text) to anon,authenticated,service_role;

revoke all on function public.start_student_practice_assignment_v56b(text,uuid) from public;
grant execute on function public.start_student_practice_assignment_v56b(text,uuid) to anon,authenticated,service_role;

revoke all on function public.complete_student_practice_assignment_v56b(text,uuid,text) from public;
grant execute on function public.complete_student_practice_assignment_v56b(text,uuid,text) to anon,authenticated,service_role;
