-- Maths Practice V3.2F.1: recoverable exam attempts
-- Backward compatible. Existing results and papers are unchanged.

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  client_attempt_key text not null unique,
  resume_token_hash bytea not null,
  student_name text not null,
  student_id text,
  year_level smallint not null check (year_level between 1 and 6),
  class_group text not null,
  exam_year smallint not null check (exam_year between 2000 and 2100),
  paper text not null,
  status text not null default 'in_progress'
    check (status in ('in_progress','submitted','time_expired','incomplete','cancelled')),
  submission_type text check (submission_type is null or submission_type in ('manual','time_expired')),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 1 and 600),
  answer_release_rule text not null default 'immediate'
    check (answer_release_rule in ('immediate','after_manual_review','never')),
  question_count integer not null default 0,
  answered_item_count integer not null default 0,
  answered_part_count integer not null default 0,
  flagged_count integer not null default 0,
  current_question_index integer not null default 0,
  response_state jsonb not null default '{}'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  deadline_at timestamptz,
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  practice_session_id uuid unique references public.practice_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.practice_sessions
  add column if not exists exam_attempt_id uuid references public.exam_attempts(id) on delete set null,
  add column if not exists exam_submission_type text;

create unique index if not exists practice_sessions_exam_attempt_uidx
  on public.practice_sessions(exam_attempt_id) where exam_attempt_id is not null;
create index if not exists exam_attempts_teacher_idx
  on public.exam_attempts(exam_year, paper, class_group, status, started_at desc);
create index if not exists exam_attempts_student_idx
  on public.exam_attempts(lower(coalesce(student_id,'')), exam_year, paper, status);

alter table public.exam_attempts enable row level security;
grant select, update on public.exam_attempts to authenticated;

drop policy if exists "teachers can read exam attempts" on public.exam_attempts;
create policy "teachers can read exam attempts" on public.exam_attempts
for select to authenticated using (public.is_teacher());
drop policy if exists "teachers can update exam attempts" on public.exam_attempts;
create policy "teachers can update exam attempts" on public.exam_attempts
for update to authenticated using (public.is_teacher()) with check (public.is_teacher());

create or replace function public.exam_attempt_json(a public.exam_attempts, p_resumed boolean default false)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id',a.id,'client_attempt_key',a.client_attempt_key,'student_name',a.student_name,
    'student_id',a.student_id,'year_level',a.year_level,'class_group',a.class_group,
    'exam_year',a.exam_year,'paper',a.paper,'status',a.status,
    'duration_minutes',a.duration_minutes,'answer_release_rule',a.answer_release_rule,
    'question_count',a.question_count,'answered_item_count',a.answered_item_count,
    'answered_part_count',a.answered_part_count,'flagged_count',a.flagged_count,
    'current_question_index',a.current_question_index,'response_state',a.response_state,
    'flags',a.flags,'started_at',a.started_at,'deadline_at',a.deadline_at,
    'last_saved_at',a.last_saved_at,'submitted_at',a.submitted_at,
    'practice_session_id',a.practice_session_id,'resumed',p_resumed,'duplicate',false
  );
$$;

create or replace function public.start_or_resume_exam_attempt(
  p_client_attempt_key text, p_resume_token text, p_student_name text, p_student_id text,
  p_year_level smallint, p_class_group text, p_exam_year smallint, p_paper text,
  p_duration_minutes integer, p_answer_release_rule text, p_question_count integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.exam_attempts; v_duplicate public.exam_attempts;
begin
  if length(trim(coalesce(p_client_attempt_key,''))) < 16 or length(trim(coalesce(p_resume_token,''))) < 16 then
    raise exception 'Invalid attempt credentials';
  end if;
  select * into v from public.exam_attempts where client_attempt_key=trim(p_client_attempt_key) limit 1;
  if found then
    if v.resume_token_hash <> extensions.digest(trim(p_resume_token),'sha256') then raise exception 'Attempt credentials do not match'; end if;
    if v.status <> 'in_progress' then
      return jsonb_build_object('duplicate',false,'closed',true,'status',v.status);
    end if;
    return public.exam_attempt_json(v,true);
  end if;
  if trim(coalesce(p_student_id,'')) <> '' then
    select * into v_duplicate from public.exam_attempts
    where lower(trim(student_id))=lower(trim(p_student_id)) and year_level=p_year_level
      and exam_year=p_exam_year and lower(trim(paper))=lower(trim(p_paper)) and status='in_progress'
    order by started_at desc limit 1;
    if found then
      return jsonb_build_object('duplicate',true,'status',v_duplicate.status,
        'started_at',v_duplicate.started_at,'last_saved_at',v_duplicate.last_saved_at);
    end if;
  end if;
  insert into public.exam_attempts(
    client_attempt_key,resume_token_hash,student_name,student_id,year_level,class_group,
    exam_year,paper,duration_minutes,answer_release_rule,question_count,deadline_at
  ) values (
    trim(p_client_attempt_key),extensions.digest(trim(p_resume_token),'sha256'),trim(p_student_name),nullif(trim(p_student_id),''),
    p_year_level,p_class_group,p_exam_year,trim(p_paper),p_duration_minutes,
    coalesce(p_answer_release_rule,'immediate'),greatest(0,p_question_count),
    case when p_duration_minutes is null then null else now()+make_interval(mins=>p_duration_minutes) end
  ) returning * into v;
  return public.exam_attempt_json(v,false);
end;
$$;

create or replace function public.save_exam_attempt(
  p_attempt_id uuid, p_resume_token text, p_response_state jsonb, p_flags jsonb,
  p_current_question_index integer, p_answered_item_count integer,
  p_answered_part_count integer, p_flagged_count integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.exam_attempts;
begin
  update public.exam_attempts a set
    response_state=coalesce(p_response_state,'{}'::jsonb), flags=coalesce(p_flags,'[]'::jsonb),
    current_question_index=greatest(0,p_current_question_index),
    answered_item_count=greatest(0,p_answered_item_count),
    answered_part_count=greatest(0,p_answered_part_count), flagged_count=greatest(0,p_flagged_count),
    last_saved_at=now(), updated_at=now()
  where a.id=p_attempt_id and a.resume_token_hash=extensions.digest(trim(p_resume_token),'sha256')
    and a.status='in_progress' returning * into v;
  if not found then raise exception 'Attempt is unavailable or already submitted'; end if;
  return public.exam_attempt_json(v,true);
end;
$$;

create or replace function public.finalize_exam_attempt(
  p_attempt_id uuid, p_resume_token text, p_submission_type text,
  p_session jsonb, p_answers jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_attempt public.exam_attempts; v_session_id uuid; v_result_code text;
begin
  select * into v_attempt from public.exam_attempts where id=p_attempt_id for update;
  if not found or v_attempt.resume_token_hash<>extensions.digest(trim(p_resume_token),'sha256') then
    raise exception 'Attempt credentials do not match';
  end if;
  if v_attempt.practice_session_id is not null then
    select result_code into v_result_code from public.practice_sessions where id=v_attempt.practice_session_id;
    return jsonb_build_object('session_id',v_attempt.practice_session_id,'result_code',v_result_code,'already_submitted',true);
  end if;
  if p_submission_type not in ('manual','time_expired') then raise exception 'Invalid submission type'; end if;

  insert into public.practice_sessions(
    client_session_key,student_name,student_id,year_level,class_group,practice_mode,strand,topic,
    first_try_score,mastery_score,total,auto_total,pending_review_count,first_try_percent,
    mastery_percent,hints_used,second_try_successes,ended_early,started_at,completed_at,
    exam_year,paper,marks_possible,auto_marks_awarded,duration_seconds,exam_question_count,
    exam_duration_limit_minutes,answer_release_rule,exam_attempt_id,exam_submission_type
  ) values (
    p_session->>'client_session_key',v_attempt.student_name,v_attempt.student_id,v_attempt.year_level,
    v_attempt.class_group,'exam','mixed',v_attempt.exam_year||' · '||v_attempt.paper,
    coalesce((p_session->>'first_try_score')::integer,0),coalesce((p_session->>'mastery_score')::integer,0),
    coalesce((p_session->>'total')::integer,0),coalesce((p_session->>'auto_total')::integer,0),
    coalesce((p_session->>'pending_review_count')::integer,0),coalesce((p_session->>'first_try_percent')::integer,0),
    coalesce((p_session->>'mastery_percent')::integer,0),0,0,false,v_attempt.started_at,now(),
    v_attempt.exam_year,v_attempt.paper,coalesce((p_session->>'marks_possible')::numeric,0),
    coalesce((p_session->>'auto_marks_awarded')::numeric,0),coalesce((p_session->>'duration_seconds')::integer,0),
    v_attempt.question_count,v_attempt.duration_minutes,v_attempt.answer_release_rule,v_attempt.id,p_submission_type
  ) returning id,result_code into v_session_id,v_result_code;

  insert into public.session_answers(
    session_id,question_id,question_snapshot,strand,topic,subtopic,skill,final_answer,
    correct_answer_snapshot,correct,first_try,attempts,hint_used,explanation_snapshot,
    response_type,response_payload,review_status,marks_possible,marks_awarded
  ) select v_session_id,
    case when x.question_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then x.question_id::uuid else null end,
    x.question_snapshot,x.strand,x.topic,coalesce(x.subtopic,''),coalesce(x.skill,''),x.final_answer,
    coalesce(x.correct_answer_snapshot,'Manual review'),coalesce(x.correct,false),coalesce(x.first_try,false),
    1,false,coalesce(x.explanation_snapshot,''),coalesce(x.response_type,'text'),
    coalesce(x.response_payload,'{}'::jsonb),coalesce(x.review_status,'auto'),
    coalesce(x.marks_possible,1),x.marks_awarded
  from jsonb_to_recordset(coalesce(p_answers,'[]'::jsonb)) as x(
    question_id text,question_snapshot text,strand text,topic text,subtopic text,skill text,
    final_answer text,correct_answer_snapshot text,correct boolean,first_try boolean,
    explanation_snapshot text,response_type text,response_payload jsonb,review_status text,
    marks_possible numeric,marks_awarded numeric
  );

  update public.exam_attempts set status=case when p_submission_type='time_expired' then 'time_expired' else 'submitted' end,
    submission_type=p_submission_type,submitted_at=now(),last_saved_at=now(),updated_at=now(),
    practice_session_id=v_session_id where id=v_attempt.id;
  return jsonb_build_object('session_id',v_session_id,'result_code',v_result_code,'already_submitted',false);
end;
$$;

revoke all on function public.exam_attempt_json(public.exam_attempts,boolean) from public;
revoke all on function public.start_or_resume_exam_attempt(text,text,text,text,smallint,text,smallint,text,integer,text,integer) from public;
revoke all on function public.save_exam_attempt(uuid,text,jsonb,jsonb,integer,integer,integer,integer) from public;
revoke all on function public.finalize_exam_attempt(uuid,text,text,jsonb,jsonb) from public;
grant execute on function public.start_or_resume_exam_attempt(text,text,text,text,smallint,text,smallint,text,integer,text,integer) to anon,authenticated;
grant execute on function public.save_exam_attempt(uuid,text,jsonb,jsonb,integer,integer,integer,integer) to anon,authenticated;
grant execute on function public.finalize_exam_attempt(uuid,text,text,jsonb,jsonb) to anon,authenticated;

select table_name from information_schema.tables
where table_schema='public' and table_name='exam_attempts';
