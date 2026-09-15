-- Science V0.2 standalone student authentication.
-- Target: SR Lumapas Science Dev only (rojetehazryfpcxlwtbi).
-- This intentionally does not depend on the production Maths database.
-- Prerequisite: existing private.science_access_tickets and published-content RPCs.

create table if not exists private.science_v02_students (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id text not null,
  student_name text not null,
  year_level smallint not null check (year_level between 1 and 6),
  class_name text,
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists science_v02_students_student_id_lower_uidx
  on private.science_v02_students (lower(trim(student_id)));

create table if not exists private.science_v02_login_failures (
  identifier_hash bytea not null,
  attempted_at timestamptz not null default now()
);

create index if not exists science_v02_login_failures_identifier_time_idx
  on private.science_v02_login_failures (identifier_hash, attempted_at desc);

revoke all on table private.science_v02_students from public, anon, authenticated;
revoke all on table private.science_v02_login_failures from public, anon, authenticated;

create or replace function public.science_v02_sign_in(
  p_student_id text,
  p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_identifier text := lower(trim(coalesce(p_student_id,'')));
  v_identifier_hash bytea;
  v_student private.science_v02_students;
  v_failures integer := 0;
  v_token text;
  v_expires_at timestamptz;
begin
  if v_identifier = '' or coalesce(p_pin,'') !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('allowed',false,'code','invalid_credentials');
  end if;

  v_identifier_hash := extensions.digest(pg_catalog.convert_to(v_identifier,'UTF8'),'sha256');

  delete from private.science_v02_login_failures
  where attempted_at < now() - interval '1 day';

  select count(*) into v_failures
  from private.science_v02_login_failures
  where identifier_hash=v_identifier_hash
    and attempted_at > now()-interval '10 minutes';

  if v_failures >= 10 then
    return jsonb_build_object('allowed',false,'code','try_later');
  end if;

  select s.* into v_student
  from private.science_v02_students s
  where lower(trim(s.student_id))=v_identifier
    and s.active
  limit 1;

  if v_student.id is null
     or extensions.crypt(coalesce(p_pin,''),v_student.pin_hash) <> v_student.pin_hash then
    insert into private.science_v02_login_failures(identifier_hash)
    values(v_identifier_hash);
    return jsonb_build_object('allowed',false,'code','invalid_credentials');
  end if;

  delete from private.science_v02_login_failures
  where identifier_hash=v_identifier_hash;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_expires_at := now()+interval '8 hours';

  insert into private.science_access_tickets(
    token_hash,year_level,expires_at,student_name,student_id,class_name,source
  ) values (
    extensions.digest(pg_catalog.convert_to(v_token,'UTF8'),'sha256'),
    v_student.year_level,
    v_expires_at,
    v_student.student_name,
    v_student.student_id,
    v_student.class_name,
    'science_v02_direct_login'
  );

  update private.science_v02_students
  set updated_at=now()
  where id=v_student.id;

  return jsonb_build_object(
    'allowed',true,
    'access_token',v_token,
    'expires_at',v_expires_at,
    'student',jsonb_build_object(
      'student_name',v_student.student_name,
      'student_id',v_student.student_id,
      'year_level',v_student.year_level,
      'class_name',v_student.class_name
    )
  );
end;
$$;

revoke all on function public.science_v02_sign_in(text,text) from public, authenticated;
grant execute on function public.science_v02_sign_in(text,text) to anon, service_role;

create or replace function public.science_v02_session(p_token text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_ticket private.science_access_tickets;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('allowed',false);
  end if;

  select t.* into v_ticket
  from private.science_access_tickets t
  where t.token_hash=extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256')
    and t.revoked_at is null
    and t.expires_at>now()
    and t.source='science_v02_direct_login'
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null then
    return jsonb_build_object('allowed',false);
  end if;

  update private.science_access_tickets
  set last_used_at=now()
  where id=v_ticket.id;

  return jsonb_build_object(
    'allowed',true,
    'expires_at',v_ticket.expires_at,
    'student',jsonb_build_object(
      'student_name',v_ticket.student_name,
      'student_id',v_ticket.student_id,
      'year_level',v_ticket.year_level,
      'class_name',v_ticket.class_name
    )
  );
end;
$$;

revoke all on function public.science_v02_session(text) from public, authenticated;
grant execute on function public.science_v02_session(text) to anon, service_role;

create or replace function public.science_v02_sign_out(p_token text)
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_count integer := 0;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  update private.science_access_tickets
  set revoked_at=coalesce(revoked_at,now())
  where token_hash=extensions.digest(pg_catalog.convert_to(p_token,'UTF8'),'sha256')
    and source='science_v02_direct_login'
    and revoked_at is null;

  get diagnostics v_count = row_count;
  return v_count>0;
end;
$$;

revoke all on function public.science_v02_sign_out(text) from public, authenticated;
grant execute on function public.science_v02_sign_out(text) to anon, service_role;
