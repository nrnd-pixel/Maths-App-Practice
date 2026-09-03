-- V5.7.6 — Classroom Feedback + Support
-- Students can submit short in-app feedback with safe diagnostic context.
-- Teachers can review, acknowledge and resolve feedback for their classes.
-- No grading, answer-key, Practice retrieval or Exam behavior changes.

create table if not exists public.app_feedback_v576 (
  id uuid primary key default extensions.gen_random_uuid(),
  roster_student_id uuid not null references public.class_students(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  feedback_type text not null check (feedback_type in ('problem','suggestion','question')),
  message text not null check (char_length(trim(message)) between 5 and 1500),
  context jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new','acknowledged','resolved')),
  teacher_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  resolved_at timestamptz
);

create index if not exists app_feedback_v576_class_status_created_idx
  on public.app_feedback_v576(class_id,status,created_at desc);
create index if not exists app_feedback_v576_student_created_idx
  on public.app_feedback_v576(roster_student_id,created_at desc);

alter table public.app_feedback_v576 enable row level security;
revoke all on table public.app_feedback_v576 from public, anon, authenticated;

create or replace function public.submit_student_feedback_v576(
  p_access_token text,
  p_feedback_type text,
  p_message text,
  p_context jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_ticket public.student_access_tickets;
  v_class_id uuid;
  v_type text := lower(trim(coalesce(p_feedback_type,'')));
  v_message text := trim(coalesce(p_message,''));
  v_context jsonb := coalesce(p_context,'{}'::jsonb);
  v_row public.app_feedback_v576;
begin
  select t.*
  into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.expires_at > now()
    and t.roster_student_id is not null
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null then
    raise exception 'Registered student access could not be verified';
  end if;

  select cs.class_id
  into v_class_id
  from public.class_students cs
  join public.school_classes sc on sc.id=cs.class_id
  where cs.id=v_ticket.roster_student_id
    and cs.active=true
    and sc.active=true
  limit 1;

  if v_class_id is null then raise exception 'Active class could not be verified'; end if;
  if v_type not in ('problem','suggestion','question') then
    raise exception 'Choose Problem, Suggestion or Question';
  end if;
  if char_length(v_message) < 5 then raise exception 'Please add a little more detail'; end if;
  if char_length(v_message) > 1500 then raise exception 'Feedback must be 1500 characters or fewer'; end if;
  if jsonb_typeof(v_context) <> 'object' then v_context := '{}'::jsonb; end if;
  if octet_length(v_context::text) > 6000 then raise exception 'Feedback context is too large'; end if;

  insert into public.app_feedback_v576(
    roster_student_id,class_id,feedback_type,message,context,status,created_at,updated_at
  ) values (
    v_ticket.roster_student_id,v_class_id,v_type,v_message,v_context,'new',now(),now()
  )
  returning * into v_row;

  return jsonb_build_object(
    'id',v_row.id,
    'status',v_row.status,
    'created_at',v_row.created_at,
    'message','Feedback sent to your teacher.'
  );
end;
$$;

create or replace function public.get_teacher_feedback_v576(
  p_class_id uuid default null,
  p_status text default 'open'
)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_status text := lower(trim(coalesce(p_status,'open')));
  v_rows jsonb;
  v_new integer := 0;
  v_ack integer := 0;
  v_resolved integer := 0;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if v_status not in ('open','new','acknowledged','resolved','all') then
    raise exception 'Choose a valid feedback status';
  end if;

  if p_class_id is not null and not exists(
    select 1 from public.school_classes sc where sc.id=p_class_id and sc.active=true
  ) then raise exception 'Choose a valid active class'; end if;

  select
    count(*) filter (where f.status='new')::integer,
    count(*) filter (where f.status='acknowledged')::integer,
    count(*) filter (where f.status='resolved')::integer
  into v_new,v_ack,v_resolved
  from public.app_feedback_v576 f
  where p_class_id is null or f.class_id=p_class_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,
    'feedback_type',q.feedback_type,
    'message',q.message,
    'context',q.context,
    'status',q.status,
    'teacher_note',q.teacher_note,
    'created_at',q.created_at,
    'updated_at',q.updated_at,
    'resolved_at',q.resolved_at,
    'student',jsonb_build_object(
      'roster_student_id',q.roster_student_id,
      'student_id',q.student_id,
      'student_name',q.student_name
    ),
    'class',jsonb_build_object(
      'class_id',q.class_id,
      'class_name',q.class_name,
      'year_level',q.year_level
    )
  ) order by q.sort_bucket,q.created_at desc),'[]'::jsonb)
  into v_rows
  from (
    select
      f.*,
      cs.student_id,
      cs.student_name,
      sc.name class_name,
      sc.year_level,
      case when f.status='new' then 0 when f.status='acknowledged' then 1 else 2 end sort_bucket
    from public.app_feedback_v576 f
    join public.class_students cs on cs.id=f.roster_student_id
    join public.school_classes sc on sc.id=f.class_id
    where (p_class_id is null or f.class_id=p_class_id)
      and (
        v_status='all'
        or (v_status='open' and f.status in ('new','acknowledged'))
        or f.status=v_status
      )
    order by sort_bucket,f.created_at desc
    limit 300
  ) q;

  return jsonb_build_object(
    'summary',jsonb_build_object(
      'new',coalesce(v_new,0),
      'acknowledged',coalesce(v_ack,0),
      'open',coalesce(v_new,0)+coalesce(v_ack,0),
      'resolved',coalesce(v_resolved,0),
      'total',coalesce(v_new,0)+coalesce(v_ack,0)+coalesce(v_resolved,0)
    ),
    'feedback',coalesce(v_rows,'[]'::jsonb)
  );
end;
$$;

create or replace function public.update_teacher_feedback_v576(
  p_feedback_id uuid,
  p_status text,
  p_teacher_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_status text := lower(trim(coalesce(p_status,'')));
  v_note text := nullif(trim(coalesce(p_teacher_note,'')),'');
  v_row public.app_feedback_v576;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if v_status not in ('new','acknowledged','resolved') then raise exception 'Choose a valid feedback status'; end if;
  if v_note is not null and char_length(v_note)>1000 then raise exception 'Teacher note must be 1000 characters or fewer'; end if;

  update public.app_feedback_v576 f
  set status=v_status,
      teacher_note=v_note,
      updated_by=auth.uid(),
      updated_at=now(),
      resolved_at=case when v_status='resolved' then coalesce(f.resolved_at,now()) else null end
  where f.id=p_feedback_id
  returning * into v_row;

  if v_row.id is null then raise exception 'Feedback item not found'; end if;

  return jsonb_build_object(
    'id',v_row.id,
    'status',v_row.status,
    'teacher_note',v_row.teacher_note,
    'updated_at',v_row.updated_at,
    'resolved_at',v_row.resolved_at
  );
end;
$$;

revoke all on function public.submit_student_feedback_v576(text,text,text,jsonb) from public;
revoke all on function public.get_teacher_feedback_v576(uuid,text) from public,anon;
revoke all on function public.update_teacher_feedback_v576(uuid,text,text) from public,anon;

grant execute on function public.submit_student_feedback_v576(text,text,text,jsonb) to anon,authenticated;
grant execute on function public.get_teacher_feedback_v576(uuid,text) to authenticated,service_role;
grant execute on function public.update_teacher_feedback_v576(uuid,text,text) to authenticated,service_role;
