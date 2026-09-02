-- Platform Subject Access V0.1 — deployed migration snapshot
--
-- This file records the additive platform subject-access database changes already
-- applied to the SR Lumapas Math Practice Supabase project on 2026-09-02.
-- It is kept in Git for reproducibility; adding this file does not apply it again.
--
-- Deployed migration history:
--   20260902085041 platform_subject_access_v01
--   20260902085110 math_access_subject_guard_v01
--   20260902085329 platform_session_existing_math_exchange_v01
--
-- Safe defaults: Mathematics = ON, Science = OFF.

-- ============================================================================
-- 20260902085041 platform_subject_access_v01
-- ============================================================================

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.platform_subject_defaults (
  subject text primary key check (subject in ('maths','science')),
  is_enabled boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

create table if not exists public.class_subject_access (
  class_id uuid not null references public.school_classes(id) on delete cascade,
  subject text not null check (subject in ('maths','science')),
  is_enabled boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  primary key (class_id, subject)
);

create table if not exists public.student_subject_access_overrides (
  roster_student_id uuid not null references public.class_students(id) on delete cascade,
  subject text not null check (subject in ('maths','science')),
  is_enabled boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null,
  primary key (roster_student_id, subject)
);

alter table public.platform_subject_defaults enable row level security;
alter table public.class_subject_access enable row level security;
alter table public.student_subject_access_overrides enable row level security;

revoke all on table public.platform_subject_defaults from anon, authenticated;
revoke all on table public.class_subject_access from anon, authenticated;
revoke all on table public.student_subject_access_overrides from anon, authenticated;

grant all on table public.platform_subject_defaults to service_role;
grant all on table public.class_subject_access to service_role;
grant all on table public.student_subject_access_overrides to service_role;

insert into public.platform_subject_defaults(subject,is_enabled)
values ('maths',true),('science',false)
on conflict (subject) do nothing;

create table if not exists private.platform_student_access_tickets (
  id uuid primary key default gen_random_uuid(),
  token_hash bytea not null unique,
  access_mode text not null check (access_mode in ('open','student_id','student_pin')),
  roster_student_id uuid null references public.class_students(id) on delete cascade,
  class_id uuid null references public.school_classes(id) on delete cascade,
  student_name text not null,
  student_id text null,
  year_level smallint not null check (year_level between 1 and 6),
  class_group text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz null
);

create index if not exists platform_student_access_tickets_active_idx
  on private.platform_student_access_tickets(expires_at)
  where revoked_at is null;

revoke all on table private.platform_student_access_tickets from public, anon, authenticated;

create or replace function private.platform_resolve_subject_access(
  p_roster_student_id uuid,
  p_class_id uuid,
  p_subject text
)
returns table(is_allowed boolean, access_source text)
language sql
stable
set search_path=''
as $$
  select
    coalesce(so.is_enabled, ca.is_enabled, pd.is_enabled, false) as is_allowed,
    case
      when so.roster_student_id is not null then 'student_override'
      when ca.class_id is not null then 'class'
      when pd.subject is not null then 'platform_default'
      else 'deny_default'
    end as access_source
  from (select lower(trim(coalesce(p_subject,''))) as subject_name) q
  left join public.student_subject_access_overrides so
    on so.roster_student_id = p_roster_student_id
   and so.subject = q.subject_name
  left join public.class_subject_access ca
    on ca.class_id = p_class_id
   and ca.subject = q.subject_name
  left join public.platform_subject_defaults pd
    on pd.subject = q.subject_name;
$$;

revoke all on function private.platform_resolve_subject_access(uuid,uuid,text) from public, anon, authenticated;

create or replace function public.validate_platform_student_access(
  p_student_id text,
  p_pin text,
  p_display_name text,
  p_selected_year smallint,
  p_class_group text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_mode text;
  v_student public.class_students;
  v_class public.school_classes;
  v_matches integer := 0;
  v_identifier_hash bytea;
  v_failures integer := 0;
  v_token text;
  v_expires_at timestamptz := now() + interval '8 hours';
  v_maths_allowed boolean;
  v_maths_source text;
  v_science_allowed boolean;
  v_science_source text;
begin
  if p_selected_year is null or p_selected_year not between 1 and 6 then
    return jsonb_build_object('allowed',false,'message','Student access could not be verified.');
  end if;

  delete from private.platform_student_access_tickets
   where expires_at < now() - interval '1 day';
  delete from public.student_access_failures
   where attempted_at < now() - interval '1 day';

  select access_mode into v_mode
  from public.app_access_settings
  where id=true;
  v_mode := coalesce(v_mode,'open');

  if trim(coalesce(p_student_id,'')) <> '' then
    select count(*) into v_matches
    from public.class_students cs
    join public.school_classes sc on sc.id=cs.class_id
    where cs.active
      and sc.active
      and lower(trim(cs.student_id))=lower(trim(p_student_id));

    if v_matches=1 then
      select cs.* into v_student
      from public.class_students cs
      join public.school_classes sc on sc.id=cs.class_id
      where cs.active
        and sc.active
        and lower(trim(cs.student_id))=lower(trim(p_student_id))
      limit 1;

      select sc.* into v_class
      from public.school_classes sc
      where sc.id=v_student.class_id
        and sc.active
      limit 1;
    end if;
  end if;

  if v_mode <> 'open' then
    v_identifier_hash := extensions.digest(lower(trim(coalesce(p_student_id,''))),'sha256');

    select count(*) into v_failures
    from public.student_access_failures
    where identifier_hash=v_identifier_hash
      and attempted_at > now()-interval '10 minutes';

    if v_failures >= 10 then
      return jsonb_build_object('allowed',false,'message','Student access could not be verified. Please wait and try again.');
    end if;

    if v_matches<>1
       or v_student.id is null
       or (v_mode='student_pin' and (
         v_student.pin_hash is null
         or extensions.crypt(coalesce(p_pin,''),v_student.pin_hash)<>v_student.pin_hash
       )) then
      insert into public.student_access_failures(identifier_hash) values(v_identifier_hash);
      return jsonb_build_object('allowed',false,'message','Student ID or PIN is incorrect, inactive, or not registered.');
    end if;

    delete from public.student_access_failures where identifier_hash=v_identifier_hash;
  elsif v_student.id is null and trim(coalesce(p_display_name,''))='' then
    return jsonb_build_object('allowed',false,'message','Enter the student name.');
  end if;

  select is_allowed,access_source
  into v_maths_allowed,v_maths_source
  from private.platform_resolve_subject_access(v_student.id,v_class.id,'maths');

  select is_allowed,access_source
  into v_science_allowed,v_science_source
  from private.platform_resolve_subject_access(v_student.id,v_class.id,'science');

  v_token := encode(extensions.gen_random_bytes(32),'hex');

  insert into private.platform_student_access_tickets(
    token_hash,access_mode,roster_student_id,class_id,student_name,student_id,
    year_level,class_group,expires_at
  ) values (
    extensions.digest(v_token,'sha256'),v_mode,v_student.id,v_class.id,
    coalesce(v_student.student_name,trim(p_display_name)),
    coalesce(v_student.student_id,nullif(trim(p_student_id),'')),
    coalesce(v_class.year_level,p_selected_year),
    coalesce(v_class.name,p_class_group,'Other'),
    v_expires_at
  );

  return jsonb_build_object(
    'allowed',true,
    'platform_access_token',v_token,
    'access_mode',v_mode,
    'roster_student_id',v_student.id,
    'class_id',v_class.id,
    'student_name',coalesce(v_student.student_name,trim(p_display_name)),
    'student_id',coalesce(v_student.student_id,nullif(trim(p_student_id),'')),
    'year_level',coalesce(v_class.year_level,p_selected_year),
    'class_name',coalesce(v_class.name,p_class_group,'Other'),
    'registered',(v_student.id is not null),
    'expires_at',v_expires_at,
    'subjects',jsonb_build_object(
      'maths',jsonb_build_object('allowed',coalesce(v_maths_allowed,false),'source',coalesce(v_maths_source,'deny_default')),
      'science',jsonb_build_object('allowed',coalesce(v_science_allowed,false),'source',coalesce(v_science_source,'deny_default'))
    )
  );
end;
$$;

revoke all on function public.validate_platform_student_access(text,text,text,smallint,text) from public;
grant execute on function public.validate_platform_student_access(text,text,text,smallint,text) to anon, authenticated;

create or replace function public.get_student_subject_access(p_platform_access_token text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_ticket private.platform_student_access_tickets;
  v_maths_allowed boolean;
  v_maths_source text;
  v_science_allowed boolean;
  v_science_source text;
begin
  select t.* into v_ticket
  from private.platform_student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_platform_access_token,'')),'sha256')
    and t.revoked_at is null
    and t.expires_at>now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null then
    raise exception 'Platform student access could not be verified';
  end if;

  update private.platform_student_access_tickets
  set last_used_at=now()
  where id=v_ticket.id;

  select is_allowed,access_source
  into v_maths_allowed,v_maths_source
  from private.platform_resolve_subject_access(v_ticket.roster_student_id,v_ticket.class_id,'maths');

  select is_allowed,access_source
  into v_science_allowed,v_science_source
  from private.platform_resolve_subject_access(v_ticket.roster_student_id,v_ticket.class_id,'science');

  return jsonb_build_object(
    'allowed',true,
    'student',jsonb_build_object(
      'roster_student_id',v_ticket.roster_student_id,
      'class_id',v_ticket.class_id,
      'student_name',v_ticket.student_name,
      'student_id',v_ticket.student_id,
      'year_level',v_ticket.year_level,
      'class_name',v_ticket.class_group
    ),
    'expires_at',v_ticket.expires_at,
    'subjects',jsonb_build_object(
      'maths',jsonb_build_object('allowed',coalesce(v_maths_allowed,false),'source',coalesce(v_maths_source,'deny_default')),
      'science',jsonb_build_object('allowed',coalesce(v_science_allowed,false),'source',coalesce(v_science_source,'deny_default'))
    )
  );
end;
$$;

revoke all on function public.get_student_subject_access(text) from public;
grant execute on function public.get_student_subject_access(text) to anon, authenticated;

create or replace function public.issue_student_math_access(
  p_platform_access_token text,
  p_purpose text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_ticket private.platform_student_access_tickets;
  v_math_allowed boolean;
  v_math_source text;
  v_token text;
  v_expires_at timestamptz;
begin
  if p_purpose not in ('practice','exam') then
    raise exception 'Invalid access purpose';
  end if;

  select t.* into v_ticket
  from private.platform_student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_platform_access_token,'')),'sha256')
    and t.revoked_at is null
    and t.expires_at>now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null then
    raise exception 'Platform student access could not be verified';
  end if;

  select is_allowed,access_source
  into v_math_allowed,v_math_source
  from private.platform_resolve_subject_access(v_ticket.roster_student_id,v_ticket.class_id,'maths');

  if not coalesce(v_math_allowed,false) then
    return jsonb_build_object(
      'allowed',false,
      'message','Mathematics is not enabled for this student.',
      'subject','maths',
      'source',coalesce(v_math_source,'deny_default')
    );
  end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_expires_at := least(v_ticket.expires_at,now()+interval '8 hours');

  insert into public.student_access_tickets(
    token_hash,purpose,access_mode,roster_student_id,class_id,student_name,student_id,
    year_level,class_group,expires_at
  ) values (
    extensions.digest(v_token,'sha256'),p_purpose,v_ticket.access_mode,
    v_ticket.roster_student_id,v_ticket.class_id,v_ticket.student_name,v_ticket.student_id,
    v_ticket.year_level,v_ticket.class_group,v_expires_at
  );

  return jsonb_build_object(
    'allowed',true,
    'access_token',v_token,
    'purpose',p_purpose,
    'access_mode',v_ticket.access_mode,
    'roster_student_id',v_ticket.roster_student_id,
    'class_id',v_ticket.class_id,
    'student_name',v_ticket.student_name,
    'student_id',v_ticket.student_id,
    'year_level',v_ticket.year_level,
    'class_name',v_ticket.class_group,
    'registered',(v_ticket.roster_student_id is not null),
    'expires_at',v_expires_at
  );
end;
$$;

revoke all on function public.issue_student_math_access(text,text) from public;
grant execute on function public.issue_student_math_access(text,text) to anon, authenticated;

create or replace function public.teacher_subject_access_overview()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_defaults jsonb;
  v_classes jsonb;
  v_students jsonb;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select coalesce(jsonb_object_agg(subject,is_enabled),'{}'::jsonb)
  into v_defaults
  from public.platform_subject_defaults;

  with rows as (
    select
      sc.id,sc.name,sc.year_level,sc.active,
      cm.is_enabled as maths_setting,
      cs.is_enabled as science_setting,
      rm.is_allowed as maths_allowed,rm.access_source as maths_source,
      rs.is_allowed as science_allowed,rs.access_source as science_source
    from public.school_classes sc
    left join public.class_subject_access cm on cm.class_id=sc.id and cm.subject='maths'
    left join public.class_subject_access cs on cs.class_id=sc.id and cs.subject='science'
    cross join lateral private.platform_resolve_subject_access(null,sc.id,'maths') rm
    cross join lateral private.platform_resolve_subject_access(null,sc.id,'science') rs
    where sc.active
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'name',name,'year_level',year_level,'active',active,
    'maths_setting',maths_setting,'science_setting',science_setting,
    'maths_allowed',maths_allowed,'maths_source',maths_source,
    'science_allowed',science_allowed,'science_source',science_source
  ) order by year_level,name),'[]'::jsonb)
  into v_classes
  from rows;

  with rows as (
    select
      st.id,st.class_id,st.student_id,st.student_name,st.active,
      sc.name as class_name,sc.year_level,
      om.is_enabled as maths_override,
      os.is_enabled as science_override,
      rm.is_allowed as maths_allowed,rm.access_source as maths_source,
      rs.is_allowed as science_allowed,rs.access_source as science_source
    from public.class_students st
    join public.school_classes sc on sc.id=st.class_id and sc.active
    left join public.student_subject_access_overrides om on om.roster_student_id=st.id and om.subject='maths'
    left join public.student_subject_access_overrides os on os.roster_student_id=st.id and os.subject='science'
    cross join lateral private.platform_resolve_subject_access(st.id,st.class_id,'maths') rm
    cross join lateral private.platform_resolve_subject_access(st.id,st.class_id,'science') rs
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'class_id',class_id,'student_id',student_id,'student_name',student_name,
    'active',active,'class_name',class_name,'year_level',year_level,
    'maths_override',maths_override,'science_override',science_override,
    'maths_allowed',maths_allowed,'maths_source',maths_source,
    'science_allowed',science_allowed,'science_source',science_source
  ) order by year_level,class_name,student_name),'[]'::jsonb)
  into v_students
  from rows;

  return jsonb_build_object(
    'defaults',coalesce(v_defaults,'{}'::jsonb),
    'classes',coalesce(v_classes,'[]'::jsonb),
    'students',coalesce(v_students,'[]'::jsonb)
  );
end;
$$;

revoke all on function public.teacher_subject_access_overview() from public, anon;
grant execute on function public.teacher_subject_access_overview() to authenticated;

create or replace function public.teacher_set_class_subject_access(
  p_class_id uuid,
  p_subject text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_subject text := lower(trim(coalesce(p_subject,'')));
  v_class public.school_classes;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if v_subject not in ('maths','science') then raise exception 'Invalid subject'; end if;

  select * into v_class from public.school_classes where id=p_class_id and active limit 1;
  if v_class.id is null then raise exception 'Class not found'; end if;

  if p_enabled is null then
    delete from public.class_subject_access where class_id=p_class_id and subject=v_subject;
  else
    insert into public.class_subject_access(class_id,subject,is_enabled,updated_at,updated_by)
    values(p_class_id,v_subject,p_enabled,now(),auth.uid())
    on conflict(class_id,subject) do update
      set is_enabled=excluded.is_enabled,updated_at=now(),updated_by=auth.uid();
  end if;

  if v_subject='maths' then
    update public.student_access_tickets
    set expires_at=least(expires_at,now())
    where class_id=p_class_id and expires_at>now();
  end if;

  insert into public.teacher_operations_log(operation,entity_type,entity_id,details)
  values('set_class_subject_access','school_class',p_class_id,
    jsonb_build_object('subject',v_subject,'enabled',p_enabled));

  return jsonb_build_object('ok',true,'class_id',p_class_id,'subject',v_subject,'enabled',p_enabled);
end;
$$;

revoke all on function public.teacher_set_class_subject_access(uuid,text,boolean) from public, anon;
grant execute on function public.teacher_set_class_subject_access(uuid,text,boolean) to authenticated;

create or replace function public.teacher_set_student_subject_access_override(
  p_roster_student_id uuid,
  p_subject text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_subject text := lower(trim(coalesce(p_subject,'')));
  v_student public.class_students;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if v_subject not in ('maths','science') then raise exception 'Invalid subject'; end if;

  select * into v_student from public.class_students where id=p_roster_student_id limit 1;
  if v_student.id is null then raise exception 'Student not found'; end if;

  if p_enabled is null then
    delete from public.student_subject_access_overrides
    where roster_student_id=p_roster_student_id and subject=v_subject;
  else
    insert into public.student_subject_access_overrides(roster_student_id,subject,is_enabled,updated_at,updated_by)
    values(p_roster_student_id,v_subject,p_enabled,now(),auth.uid())
    on conflict(roster_student_id,subject) do update
      set is_enabled=excluded.is_enabled,updated_at=now(),updated_by=auth.uid();
  end if;

  if v_subject='maths' then
    update public.student_access_tickets
    set expires_at=least(expires_at,now())
    where roster_student_id=p_roster_student_id and expires_at>now();
  end if;

  insert into public.teacher_operations_log(operation,entity_type,entity_id,details)
  values('set_student_subject_access','class_student',p_roster_student_id,
    jsonb_build_object('subject',v_subject,'enabled',p_enabled));

  return jsonb_build_object('ok',true,'roster_student_id',p_roster_student_id,'subject',v_subject,'enabled',p_enabled);
end;
$$;

revoke all on function public.teacher_set_student_subject_access_override(uuid,text,boolean) from public, anon;
grant execute on function public.teacher_set_student_subject_access_override(uuid,text,boolean) to authenticated;

create or replace function public.teacher_set_year_subject_access(
  p_year_level smallint,
  p_subject text,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_subject text := lower(trim(coalesce(p_subject,'')));
  v_count integer := 0;
begin
  if not public.is_teacher() then raise exception 'Teacher access required'; end if;
  if p_year_level not between 1 and 6 then raise exception 'Invalid year level'; end if;
  if v_subject not in ('maths','science') then raise exception 'Invalid subject'; end if;
  if p_enabled is null then raise exception 'Year bulk setting requires enabled true or false'; end if;

  insert into public.class_subject_access(class_id,subject,is_enabled,updated_at,updated_by)
  select sc.id,v_subject,p_enabled,now(),auth.uid()
  from public.school_classes sc
  where sc.active and sc.year_level=p_year_level
  on conflict(class_id,subject) do update
    set is_enabled=excluded.is_enabled,updated_at=now(),updated_by=auth.uid();

  get diagnostics v_count = row_count;

  if v_subject='maths' then
    update public.student_access_tickets t
    set expires_at=least(t.expires_at,now())
    where t.expires_at>now()
      and exists(
        select 1 from public.school_classes sc
        where sc.id=t.class_id and sc.active and sc.year_level=p_year_level
      );
  end if;

  insert into public.teacher_operations_log(operation,entity_type,details)
  values('set_year_subject_access','year_level',
    jsonb_build_object('year_level',p_year_level,'subject',v_subject,'enabled',p_enabled,'classes_updated',v_count));

  return jsonb_build_object('ok',true,'year_level',p_year_level,'subject',v_subject,'enabled',p_enabled,'classes_updated',v_count);
end;
$$;

revoke all on function public.teacher_set_year_subject_access(smallint,text,boolean) from public, anon;
grant execute on function public.teacher_set_year_subject_access(smallint,text,boolean) to authenticated;

-- ============================================================================
-- 20260902085110 math_access_subject_guard_v01
-- ============================================================================

create or replace function public.validate_student_access(
  p_student_id text,
  p_pin text,
  p_purpose text,
  p_display_name text,
  p_selected_year smallint,
  p_class_group text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_mode text;
  v_student public.class_students;
  v_class public.school_classes;
  v_matches integer := 0;
  v_identifier_hash bytea;
  v_failures integer := 0;
  v_token text;
  v_math_allowed boolean;
  v_math_source text;
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

  select is_allowed,access_source
  into v_math_allowed,v_math_source
  from private.platform_resolve_subject_access(v_student.id,v_class.id,'maths');

  if not coalesce(v_math_allowed,false) then
    return jsonb_build_object(
      'allowed',false,
      'message','Mathematics is not enabled for this student.',
      'subject','maths',
      'source',coalesce(v_math_source,'deny_default')
    );
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

-- ============================================================================
-- 20260902085329 platform_session_existing_math_exchange_v01
-- ============================================================================

create or replace function public.exchange_math_access_for_platform(p_math_access_token text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_math_ticket public.student_access_tickets;
  v_token text;
  v_expires_at timestamptz;
  v_maths_allowed boolean;
  v_maths_source text;
  v_science_allowed boolean;
  v_science_source text;
begin
  select t.* into v_math_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_math_access_token,'')),'sha256')
    and t.purpose='practice'
    and t.expires_at>now()
    and t.roster_student_id is not null
    and t.class_id is not null
  order by t.created_at desc
  limit 1;

  if v_math_ticket.id is null then
    raise exception 'Maths student access could not be verified';
  end if;

  select is_allowed,access_source
  into v_maths_allowed,v_maths_source
  from private.platform_resolve_subject_access(v_math_ticket.roster_student_id,v_math_ticket.class_id,'maths');

  if not coalesce(v_maths_allowed,false) then
    raise exception 'Maths student access is no longer enabled';
  end if;

  select is_allowed,access_source
  into v_science_allowed,v_science_source
  from private.platform_resolve_subject_access(v_math_ticket.roster_student_id,v_math_ticket.class_id,'science');

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_expires_at:=least(v_math_ticket.expires_at,now()+interval '8 hours');

  insert into private.platform_student_access_tickets(
    token_hash,access_mode,roster_student_id,class_id,student_name,student_id,
    year_level,class_group,expires_at
  ) values (
    extensions.digest(v_token,'sha256'),v_math_ticket.access_mode,
    v_math_ticket.roster_student_id,v_math_ticket.class_id,v_math_ticket.student_name,v_math_ticket.student_id,
    v_math_ticket.year_level,v_math_ticket.class_group,v_expires_at
  );

  return jsonb_build_object(
    'allowed',true,
    'platform_access_token',v_token,
    'access_mode',v_math_ticket.access_mode,
    'roster_student_id',v_math_ticket.roster_student_id,
    'class_id',v_math_ticket.class_id,
    'student_name',v_math_ticket.student_name,
    'student_id',v_math_ticket.student_id,
    'year_level',v_math_ticket.year_level,
    'class_name',v_math_ticket.class_group,
    'registered',true,
    'expires_at',v_expires_at,
    'subjects',jsonb_build_object(
      'maths',jsonb_build_object('allowed',coalesce(v_maths_allowed,false),'source',coalesce(v_maths_source,'deny_default')),
      'science',jsonb_build_object('allowed',coalesce(v_science_allowed,false),'source',coalesce(v_science_source,'deny_default'))
    )
  );
end;
$$;

revoke all on function public.exchange_math_access_for_platform(text) from public;
grant execute on function public.exchange_math_access_for_platform(text) to anon, authenticated;
