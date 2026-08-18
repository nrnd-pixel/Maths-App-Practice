-- Maths Practice V3.2F.2: classes, assignments and participation
-- Backward compatible: papers without an active assignment remain openly available.
-- Hotfix: composite assignment, student and class rows are loaded separately for PostgreSQL compatibility.

create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  year_level smallint not null check (year_level between 1 and 6),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (year_level,name)
);

create table if not exists public.class_students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.school_classes(id) on delete cascade,
  student_id text not null check (length(trim(student_id)) between 1 and 40),
  student_name text not null check (length(trim(student_name)) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists class_students_class_student_uidx
  on public.class_students(class_id,lower(trim(student_id)));

create table if not exists public.exam_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.school_classes(id) on delete cascade,
  exam_year smallint not null check (exam_year between 2000 and 2100),
  paper text not null check (length(trim(paper)) > 0),
  opens_at timestamptz,
  closes_at timestamptz,
  attempt_limit integer not null default 1 check (attempt_limit between 1 and 10),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at),
  unique (class_id,exam_year,paper)
);

alter table public.exam_attempts
  add column if not exists assignment_id uuid references public.exam_assignments(id) on delete set null,
  add column if not exists roster_student_id uuid references public.class_students(id) on delete set null,
  add column if not exists assignment_closes_at timestamptz;

create index if not exists exam_assignments_paper_idx on public.exam_assignments(exam_year,paper,active);
create index if not exists exam_attempts_assignment_idx on public.exam_attempts(assignment_id,roster_student_id,status);

alter table public.school_classes enable row level security;
alter table public.class_students enable row level security;
alter table public.exam_assignments enable row level security;
grant select,insert,update,delete on public.school_classes,public.class_students,public.exam_assignments to authenticated;

drop policy if exists "teachers manage school classes" on public.school_classes;
create policy "teachers manage school classes" on public.school_classes for all to authenticated
using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage class students" on public.class_students;
create policy "teachers manage class students" on public.class_students for all to authenticated
using (public.is_teacher()) with check (public.is_teacher());
drop policy if exists "teachers manage exam assignments" on public.exam_assignments;
create policy "teachers manage exam assignments" on public.exam_assignments for all to authenticated
using (public.is_teacher()) with check (public.is_teacher());

create or replace function public.get_student_exam_access(
  p_student_id text,p_year_level smallint,p_exam_year smallint,p_paper text
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_total integer; v_assignment public.exam_assignments; v_student public.class_students;
  v_class public.school_classes; v_used integer;
begin
  select count(*) into v_total from public.exam_assignments ea
  join public.school_classes sc on sc.id=ea.class_id
  where ea.active and sc.active and sc.year_level=p_year_level and ea.exam_year=p_exam_year
    and lower(trim(ea.paper))=lower(trim(p_paper));
  if v_total=0 then return jsonb_build_object('status','open_access','allowed',true); end if;
  if trim(coalesce(p_student_id,''))='' then
    return jsonb_build_object('status','student_id_required','allowed',false,'message','Enter your Student ID for this assigned paper.');
  end if;
  select ea.* into v_assignment
  from public.exam_assignments ea
  join public.school_classes sc on sc.id=ea.class_id and sc.active
  where ea.active and sc.year_level=p_year_level and ea.exam_year=p_exam_year
    and lower(trim(ea.paper))=lower(trim(p_paper))
    and exists (
      select 1 from public.class_students cs
      where cs.class_id=sc.id and cs.active
        and lower(trim(cs.student_id))=lower(trim(p_student_id))
    )
  order by ea.created_at desc limit 1;
  if not found then return jsonb_build_object('status','not_assigned','allowed',false,'message','This Student ID is not assigned to the selected paper.'); end if;
  select cs.* into v_student from public.class_students cs
  where cs.class_id=v_assignment.class_id and cs.active
    and lower(trim(cs.student_id))=lower(trim(p_student_id)) limit 1;
  select sc.* into v_class from public.school_classes sc
  where sc.id=v_assignment.class_id and sc.active limit 1;
  if v_assignment.opens_at is not null and now()<v_assignment.opens_at then
    return jsonb_build_object('status','not_open','allowed',false,'message','This paper is not open yet.','opens_at',v_assignment.opens_at,'closes_at',v_assignment.closes_at,'class_name',v_class.name);
  end if;
  if v_assignment.closes_at is not null and now()>=v_assignment.closes_at then
    return jsonb_build_object('status','closed','allowed',false,'message','This paper is closed.','closes_at',v_assignment.closes_at,'class_name',v_class.name);
  end if;
  select count(*) into v_used from public.exam_attempts a
  where a.assignment_id=v_assignment.id and a.roster_student_id=v_student.id
    and a.status not in ('incomplete','cancelled');
  if v_used>=v_assignment.attempt_limit then
    return jsonb_build_object('status','attempt_limit','allowed',false,'message','The attempt limit has been reached.','attempts_used',v_used,'attempt_limit',v_assignment.attempt_limit,'class_name',v_class.name);
  end if;
  return jsonb_build_object('status','available','allowed',true,'assignment_id',v_assignment.id,
    'roster_student_id',v_student.id,'class_id',v_class.id,'class_name',v_class.name,
    'student_name',v_student.student_name,'opens_at',v_assignment.opens_at,'closes_at',v_assignment.closes_at,
    'attempts_used',v_used,'attempt_limit',v_assignment.attempt_limit);
end;
$$;

create or replace function public.exam_attempt_json(a public.exam_attempts,p_resumed boolean default false)
returns jsonb language sql stable security definer set search_path='' as $$
  select jsonb_build_object(
    'id',a.id,'client_attempt_key',a.client_attempt_key,'student_name',a.student_name,
    'student_id',a.student_id,'year_level',a.year_level,'class_group',a.class_group,
    'exam_year',a.exam_year,'paper',a.paper,'status',a.status,'duration_minutes',a.duration_minutes,
    'answer_release_rule',a.answer_release_rule,'question_count',a.question_count,
    'answered_item_count',a.answered_item_count,'answered_part_count',a.answered_part_count,
    'flagged_count',a.flagged_count,'current_question_index',a.current_question_index,
    'response_state',a.response_state,'flags',a.flags,'started_at',a.started_at,
    'deadline_at',a.deadline_at,'last_saved_at',a.last_saved_at,'submitted_at',a.submitted_at,
    'practice_session_id',a.practice_session_id,'assignment_id',a.assignment_id,
    'roster_student_id',a.roster_student_id,'assignment_closes_at',a.assignment_closes_at,
    'resumed',p_resumed,'duplicate',false
  );
$$;

create or replace function public.start_or_resume_exam_attempt(
  p_client_attempt_key text,p_resume_token text,p_student_name text,p_student_id text,
  p_year_level smallint,p_class_group text,p_exam_year smallint,p_paper text,
  p_duration_minutes integer,p_answer_release_rule text,p_question_count integer
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.exam_attempts; v_duplicate public.exam_attempts; v_access jsonb;
  v_assignment_id uuid; v_roster_id uuid; v_close timestamptz; v_duration_deadline timestamptz; v_deadline timestamptz;
begin
  if length(trim(coalesce(p_client_attempt_key,'')))<16 or length(trim(coalesce(p_resume_token,'')))<16 then raise exception 'Invalid attempt credentials'; end if;
  select * into v from public.exam_attempts where client_attempt_key=trim(p_client_attempt_key) limit 1;
  if found then
    if v.resume_token_hash<>extensions.digest(trim(p_resume_token),'sha256') then raise exception 'Attempt credentials do not match'; end if;
    if v.status<>'in_progress' then return jsonb_build_object('duplicate',false,'closed',true,'status',v.status); end if;
    return public.exam_attempt_json(v,true);
  end if;
  v_access:=public.get_student_exam_access(p_student_id,p_year_level,p_exam_year,p_paper);
  if not coalesce((v_access->>'allowed')::boolean,false) then return v_access||jsonb_build_object('access_denied',true,'duplicate',false); end if;
  if trim(coalesce(p_student_id,''))<>'' then
    select * into v_duplicate from public.exam_attempts where lower(trim(student_id))=lower(trim(p_student_id))
      and year_level=p_year_level and exam_year=p_exam_year and lower(trim(paper))=lower(trim(p_paper))
      and status='in_progress' order by started_at desc limit 1;
    if found then return jsonb_build_object('duplicate',true,'status',v_duplicate.status,'started_at',v_duplicate.started_at,'last_saved_at',v_duplicate.last_saved_at); end if;
  end if;
  v_assignment_id:=nullif(v_access->>'assignment_id','')::uuid;
  v_roster_id:=nullif(v_access->>'roster_student_id','')::uuid;
  v_close:=nullif(v_access->>'closes_at','')::timestamptz;
  v_duration_deadline:=case when p_duration_minutes is null then null else now()+make_interval(mins=>p_duration_minutes) end;
  v_deadline:=case when v_duration_deadline is null then v_close when v_close is null then v_duration_deadline else least(v_duration_deadline,v_close) end;
  insert into public.exam_attempts(client_attempt_key,resume_token_hash,student_name,student_id,year_level,class_group,
    exam_year,paper,duration_minutes,answer_release_rule,question_count,deadline_at,assignment_id,roster_student_id,assignment_closes_at)
  values(trim(p_client_attempt_key),extensions.digest(trim(p_resume_token),'sha256'),trim(p_student_name),nullif(trim(p_student_id),''),
    p_year_level,coalesce(v_access->>'class_name',p_class_group),p_exam_year,trim(p_paper),p_duration_minutes,
    coalesce(p_answer_release_rule,'immediate'),greatest(0,p_question_count),v_deadline,v_assignment_id,v_roster_id,v_close)
  returning * into v;
  return public.exam_attempt_json(v,false)||jsonb_build_object('access',v_access);
end;
$$;

revoke all on function public.get_student_exam_access(text,smallint,smallint,text) from public;
grant execute on function public.get_student_exam_access(text,smallint,smallint,text) to anon,authenticated;

select table_name from information_schema.tables where table_schema='public'
and table_name in ('school_classes','class_students','exam_assignments') order by table_name;
