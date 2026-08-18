-- Maths Practice V3.2F.3: optional student access controls for Practice and Exam Mode
-- Backward-compatible default: open access remains enabled until a teacher changes it.

begin;

create table if not exists public.app_access_settings (
  id boolean primary key default true check (id),
  access_mode text not null default 'open' check (access_mode in ('open','student_id','student_pin')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.app_access_settings(id,access_mode) values(true,'open') on conflict (id) do nothing;

alter table public.class_students
  add column if not exists pin_hash text,
  add column if not exists pin_updated_at timestamptz;

alter table public.practice_sessions
  add column if not exists roster_student_id uuid references public.class_students(id) on delete set null,
  add column if not exists class_id uuid references public.school_classes(id) on delete set null;

alter table public.exam_attempts
  add column if not exists class_id uuid references public.school_classes(id) on delete set null;

create index if not exists practice_sessions_roster_idx
  on public.practice_sessions(roster_student_id,completed_at desc);
create index if not exists exam_attempts_roster_idx
  on public.exam_attempts(roster_student_id,started_at desc);

create table if not exists public.student_access_tickets (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  purpose text not null check (purpose in ('practice','exam')),
  access_mode text not null check (access_mode in ('open','student_id','student_pin')),
  roster_student_id uuid references public.class_students(id) on delete cascade,
  class_id uuid references public.school_classes(id) on delete cascade,
  student_name text not null,
  student_id text,
  year_level smallint not null check (year_level between 1 and 6),
  class_group text not null,
  expires_at timestamptz not null default (now()+interval '24 hours'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists student_access_tickets_expiry_idx
  on public.student_access_tickets(expires_at,used_at);

create table if not exists public.student_access_failures (
  id bigint generated always as identity primary key,
  identifier_hash bytea not null,
  attempted_at timestamptz not null default now()
);
create index if not exists student_access_failures_lookup_idx
  on public.student_access_failures(identifier_hash,attempted_at desc);

alter table public.app_access_settings enable row level security;
alter table public.student_access_tickets enable row level security;
alter table public.student_access_failures enable row level security;

grant select on public.app_access_settings to authenticated;
revoke all on public.student_access_tickets from anon,authenticated;
revoke all on public.student_access_failures from anon,authenticated;

drop policy if exists "teachers manage student access settings" on public.app_access_settings;
create policy "teachers manage student access settings" on public.app_access_settings
for all to authenticated using (public.is_teacher()) with check (public.is_teacher());

create or replace function public.get_student_access_policy()
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'access_mode',coalesce((select access_mode from public.app_access_settings where id=true),'open'),
    'student_id_required',coalesce((select access_mode from public.app_access_settings where id=true),'open')<>'open',
    'pin_required',coalesce((select access_mode from public.app_access_settings where id=true),'open')='student_pin'
  );
$$;

create or replace function public.save_student_access_mode(p_access_mode text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if p_access_mode not in ('open','student_id','student_pin') then raise exception 'Invalid access mode'; end if;
  insert into public.app_access_settings(id,access_mode,updated_at,updated_by)
  values(true,p_access_mode,now(),auth.uid())
  on conflict (id) do update set access_mode=excluded.access_mode,updated_at=now(),updated_by=auth.uid();
  return jsonb_build_object('saved',true,'access_mode',p_access_mode);
end;
$$;

create or replace function public.set_student_pin(p_student_uuid uuid,p_pin text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if coalesce(p_pin,'') !~ '^[0-9]{4,8}$' then raise exception 'PIN must contain 4 to 8 digits'; end if;
  update public.class_students
  set pin_hash=extensions.crypt(p_pin,extensions.gen_salt('bf')),pin_updated_at=now(),updated_at=now()
  where id=p_student_uuid;
  if not found then raise exception 'Student was not found'; end if;
  return jsonb_build_object('saved',true,'student_id',p_student_uuid,'pin_set',true);
end;
$$;

create or replace function public.validate_student_access(
  p_student_id text,p_pin text,p_purpose text,p_display_name text,
  p_selected_year smallint,p_class_group text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_mode text;
  v_student public.class_students;
  v_class public.school_classes;
  v_matches integer := 0;
  v_identifier_hash bytea;
  v_failures integer := 0;
  v_token text;
begin
  if p_purpose not in ('practice','exam') then raise exception 'Invalid access purpose'; end if;
  if p_selected_year is null or p_selected_year not between 1 and 6 then
    return jsonb_build_object('allowed',false,'message','Student access could not be verified.');
  end if;

  delete from public.student_access_tickets where expires_at<now()-interval '1 day';
  delete from public.student_access_failures where attempted_at<now()-interval '1 day';
  select access_mode into v_mode from public.app_access_settings where id=true;
  v_mode:=coalesce(v_mode,'open');

  if trim(coalesce(p_student_id,''))<>'' then
    select count(*) into v_matches
    from public.class_students cs join public.school_classes sc on sc.id=cs.class_id
    where cs.active and sc.active and lower(trim(cs.student_id))=lower(trim(p_student_id));
    if v_matches=1 then
      select cs.* into v_student
      from public.class_students cs join public.school_classes sc on sc.id=cs.class_id
      where cs.active and sc.active and lower(trim(cs.student_id))=lower(trim(p_student_id)) limit 1;
      select sc.* into v_class from public.school_classes sc where sc.id=v_student.class_id and sc.active limit 1;
    end if;
  end if;

  if v_mode<>'open' then
    v_identifier_hash:=extensions.digest(lower(trim(coalesce(p_student_id,''))),'sha256');
    select count(*) into v_failures from public.student_access_failures
    where identifier_hash=v_identifier_hash and attempted_at>now()-interval '10 minutes';
    if v_failures>=10 then
      return jsonb_build_object('allowed',false,'message','Student access could not be verified. Please wait and try again.');
    end if;
    if v_matches<>1 or v_student.id is null or (v_mode='student_pin' and
      (v_student.pin_hash is null or extensions.crypt(coalesce(p_pin,''),v_student.pin_hash)<>v_student.pin_hash)) then
      insert into public.student_access_failures(identifier_hash) values(v_identifier_hash);
      return jsonb_build_object('allowed',false,'message','Student ID or PIN is incorrect, inactive, or not registered.');
    end if;
    delete from public.student_access_failures where identifier_hash=v_identifier_hash;
  elsif v_student.id is null and trim(coalesce(p_display_name,''))='' then
    return jsonb_build_object('allowed',false,'message','Enter the student name.');
  end if;

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.student_access_tickets(
    token_hash,purpose,access_mode,roster_student_id,class_id,student_name,student_id,
    year_level,class_group
  ) values (
    extensions.digest(v_token,'sha256'),p_purpose,v_mode,v_student.id,v_class.id,
    coalesce(v_student.student_name,trim(p_display_name)),
    coalesce(v_student.student_id,nullif(trim(p_student_id),'')),
    coalesce(v_class.year_level,p_selected_year),coalesce(v_class.name,p_class_group,'Other')
  );

  return jsonb_build_object(
    'allowed',true,'access_token',v_token,'access_mode',v_mode,
    'roster_student_id',v_student.id,'class_id',v_class.id,
    'student_name',coalesce(v_student.student_name,trim(p_display_name)),
    'student_id',coalesce(v_student.student_id,nullif(trim(p_student_id),'')),
    'year_level',coalesce(v_class.year_level,p_selected_year),
    'class_name',coalesce(v_class.name,p_class_group,'Other'),
    'registered',(v_student.id is not null)
  );
end;
$$;

create or replace function public.get_available_exam_papers(p_year_level smallint)
returns table(exam_year smallint,paper text,question_number text,parent_question_number text,marks numeric)
language sql stable security definer set search_path='' as $$
  select q.exam_year::smallint,q.paper::text,q.question_number::text,
    q.parent_question_number::text,q.marks::numeric
  from public.questions q
  where q.active and q.year_level=p_year_level and q.exam_year is not null and trim(coalesce(q.paper,''))<>'';
$$;

create or replace function public.get_student_questions(
  p_access_token text,p_year_level smallint,p_exam_year smallint default null,p_paper text default null
) returns setof public.questions language plpgsql stable security definer set search_path='' as $$
declare v_ticket public.student_access_tickets;
begin
  select t.* into v_ticket from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.used_at is null and t.expires_at>now() limit 1;
  if v_ticket.id is null or v_ticket.year_level<>p_year_level then
    raise exception 'Student access could not be verified';
  end if;
  return query select q.* from public.questions q
  where q.active and q.year_level=p_year_level
    and (p_exam_year is null or q.exam_year=p_exam_year)
    and (p_paper is null or lower(trim(q.paper))=lower(trim(p_paper)));
end;
$$;

create or replace function public.submit_practice_session_v3(
  p_access_token text,p_session jsonb,p_answers jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_ticket public.student_access_tickets;
  v_session_id uuid;
  v_result_code text;
begin
  select t.* into v_ticket from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice' and t.used_at is null and t.expires_at>now()
  limit 1 for update;
  if v_ticket.id is null then raise exception 'Student access could not be verified'; end if;

  insert into public.practice_sessions(
    client_session_key,student_name,student_id,year_level,class_group,practice_mode,strand,topic,
    first_try_score,mastery_score,total,auto_total,pending_review_count,first_try_percent,
    mastery_percent,hints_used,second_try_successes,ended_early,started_at,completed_at,
    roster_student_id,class_id
  ) values (
    p_session->>'client_session_key',v_ticket.student_name,v_ticket.student_id,v_ticket.year_level,
    v_ticket.class_group,case when p_session->>'practice_mode' in ('mixed','strand_topic') then p_session->>'practice_mode' else 'mixed' end,
    coalesce(p_session->>'strand','mixed'),coalesce(p_session->>'topic','Mixed Practice'),
    greatest(0,coalesce((p_session->>'first_try_score')::integer,0)),
    greatest(0,coalesce((p_session->>'mastery_score')::integer,0)),
    greatest(0,coalesce((p_session->>'total')::integer,0)),
    greatest(0,coalesce((p_session->>'auto_total')::integer,0)),
    greatest(0,coalesce((p_session->>'pending_review_count')::integer,0)),
    least(100,greatest(0,coalesce((p_session->>'first_try_percent')::integer,0))),
    least(100,greatest(0,coalesce((p_session->>'mastery_percent')::integer,0))),
    greatest(0,coalesce((p_session->>'hints_used')::integer,0)),
    greatest(0,coalesce((p_session->>'second_try_successes')::integer,0)),
    coalesce((p_session->>'ended_early')::boolean,false),
    coalesce((p_session->>'started_at')::timestamptz,now()),now(),
    v_ticket.roster_student_id,v_ticket.class_id
  ) returning id,result_code into v_session_id,v_result_code;

  insert into public.session_answers(
    session_id,question_id,question_snapshot,strand,topic,subtopic,skill,final_answer,
    correct_answer_snapshot,correct,first_try,attempts,hint_used,explanation_snapshot,
    response_type,response_payload,review_status,marks_possible,marks_awarded
  ) select v_session_id,
    case when x.question_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then x.question_id::uuid else null end,
    x.question_snapshot,coalesce(x.strand,''),coalesce(x.topic,''),coalesce(x.subtopic,''),coalesce(x.skill,''),x.final_answer,
    coalesce(x.correct_answer_snapshot,'Manual review'),coalesce(x.correct,false),coalesce(x.first_try,false),
    least(2,greatest(1,coalesce(x.attempts,1)))::smallint,coalesce(x.hint_used,false),
    coalesce(x.explanation_snapshot,''),coalesce(x.response_type,'text'),coalesce(x.response_payload,'{}'::jsonb),
    coalesce(x.review_status,'auto'),coalesce(x.marks_possible,1),x.marks_awarded
  from jsonb_to_recordset(coalesce(p_answers,'[]'::jsonb)) as x(
    question_id text,question_snapshot text,strand text,topic text,subtopic text,skill text,
    final_answer text,correct_answer_snapshot text,correct boolean,first_try boolean,attempts integer,
    hint_used boolean,explanation_snapshot text,response_type text,response_payload jsonb,
    review_status text,marks_possible numeric,marks_awarded numeric
  );

  update public.student_access_tickets set used_at=now() where id=v_ticket.id;
  return jsonb_build_object('session_id',v_session_id,'result_code',v_result_code);
end;
$$;

create or replace function public.start_or_resume_exam_attempt_v3(
  p_access_token text,p_client_attempt_key text,p_resume_token text,p_student_name text,p_student_id text,
  p_year_level smallint,p_class_group text,p_exam_year smallint,p_paper text,
  p_duration_minutes integer,p_answer_release_rule text,p_question_count integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_existing public.exam_attempts;
  v_attempt public.exam_attempts;
  v_ticket public.student_access_tickets;
  v_result jsonb;
  v_access jsonb;
begin
  select a.* into v_existing from public.exam_attempts a
  where a.client_attempt_key=trim(p_client_attempt_key) limit 1;
  if v_existing.id is not null then
    return public.start_or_resume_exam_attempt(
      p_client_attempt_key,p_resume_token,p_student_name,p_student_id,p_year_level,p_class_group,
      p_exam_year,p_paper,p_duration_minutes,p_answer_release_rule,p_question_count
    );
  end if;

  select t.* into v_ticket from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='exam' and t.used_at is null and t.expires_at>now()
  limit 1 for update;
  if v_ticket.id is null then raise exception 'Student access could not be verified'; end if;

  v_result:=public.start_or_resume_exam_attempt(
    p_client_attempt_key,p_resume_token,v_ticket.student_name,v_ticket.student_id,v_ticket.year_level,
    v_ticket.class_group,p_exam_year,p_paper,p_duration_minutes,p_answer_release_rule,p_question_count
  );
  if coalesce((v_result->>'duplicate')::boolean,false) or v_result->>'id' is null then return v_result; end if;

  update public.exam_attempts set roster_student_id=coalesce(v_ticket.roster_student_id,roster_student_id),
    class_id=coalesce(v_ticket.class_id,class_id),student_name=v_ticket.student_name,
    student_id=v_ticket.student_id,year_level=v_ticket.year_level,class_group=v_ticket.class_group,
    updated_at=now() where id=(v_result->>'id')::uuid returning * into v_attempt;
  update public.student_access_tickets set used_at=now() where id=v_ticket.id;
  v_access:=coalesce(v_result->'access','{}'::jsonb)||jsonb_build_object(
    'student_name',v_ticket.student_name,'student_id',v_ticket.student_id,
    'class_name',v_ticket.class_group,'year_level',v_ticket.year_level,
    'roster_student_id',v_ticket.roster_student_id,'registered',(v_ticket.roster_student_id is not null)
  );
  return public.exam_attempt_json(v_attempt,false)||jsonb_build_object('access',v_access);
end;
$$;

create or replace function public.apply_exam_roster_identity()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_roster_student_id uuid; v_class_id uuid;
begin
  if new.exam_attempt_id is not null then
    select a.roster_student_id,a.class_id into v_roster_student_id,v_class_id
    from public.exam_attempts a where a.id=new.exam_attempt_id;
    new.roster_student_id:=v_roster_student_id;
    new.class_id:=v_class_id;
  end if;
  return new;
end;
$$;
drop trigger if exists practice_sessions_apply_exam_roster on public.practice_sessions;
create trigger practice_sessions_apply_exam_roster before insert on public.practice_sessions
for each row execute function public.apply_exam_roster_identity();

-- Student content and submissions now go through access-ticket RPCs.
revoke select on public.questions from anon;
revoke insert on public.practice_sessions from anon,authenticated;
revoke insert on public.session_answers from anon,authenticated;
revoke execute on function public.start_or_resume_exam_attempt(text,text,text,text,smallint,text,smallint,text,integer,text,integer) from anon,authenticated;

revoke all on function public.get_student_access_policy() from public;
revoke all on function public.save_student_access_mode(text) from public;
revoke all on function public.set_student_pin(uuid,text) from public;
revoke all on function public.validate_student_access(text,text,text,text,smallint,text) from public;
revoke all on function public.get_available_exam_papers(smallint) from public;
revoke all on function public.get_student_questions(text,smallint,smallint,text) from public;
revoke all on function public.submit_practice_session_v3(text,jsonb,jsonb) from public;
revoke all on function public.start_or_resume_exam_attempt_v3(text,text,text,text,text,smallint,text,smallint,text,integer,text,integer) from public;

grant execute on function public.get_student_access_policy() to anon,authenticated;
grant execute on function public.validate_student_access(text,text,text,text,smallint,text) to anon,authenticated;
grant execute on function public.get_available_exam_papers(smallint) to anon,authenticated;
grant execute on function public.get_student_questions(text,smallint,smallint,text) to anon,authenticated;
grant execute on function public.submit_practice_session_v3(text,jsonb,jsonb) to anon,authenticated;
grant execute on function public.start_or_resume_exam_attempt_v3(text,text,text,text,text,smallint,text,smallint,text,integer,text,integer) to anon,authenticated;
grant execute on function public.save_student_access_mode(text) to authenticated;
grant execute on function public.set_student_pin(uuid,text) to authenticated;

commit;

select access_mode from public.app_access_settings where id=true;
