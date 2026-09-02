-- Science V0.1 — Platform student-session bridge
--
-- DEVELOPMENT TARGET: SR Lumapas Science Dev only.
-- This script does not modify the live Maths project.
--
-- Purpose:
-- - bind a short-lived Science capability to a student identity already verified
--   by the existing Maths Student ID + PIN session;
-- - keep Science content delivery on its own scoped token;
-- - prevent browser roles from minting Science tokens directly.

begin;

alter table private.science_access_tickets
  add column if not exists student_name text,
  add column if not exists student_id text,
  add column if not exists class_name text,
  add column if not exists source text not null default 'development';

create or replace function public.science_mint_student_access_v01(
  p_year_level smallint,
  p_student_name text,
  p_student_id text,
  p_class_name text
)
returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog','private','public','extensions'
as $$
declare
  v_token text;
  v_expires_at timestamptz;
begin
  if current_user <> 'service_role' then
    raise exception 'science_bridge_not_authorized' using errcode = '42501';
  end if;

  if p_year_level is null or p_year_level < 1 or p_year_level > 6 then
    raise exception 'science_bridge_invalid_year' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_student_id,'')),'') is null
     or nullif(trim(coalesce(p_student_name,'')),'') is null then
    raise exception 'science_bridge_invalid_student' using errcode = '22023';
  end if;

  v_token := encode(extensions.gen_random_bytes(32),'hex');
  v_expires_at := pg_catalog.now() + interval '1 hour';

  insert into private.science_access_tickets(
    token_hash,
    year_level,
    expires_at,
    student_name,
    student_id,
    class_name,
    source
  ) values (
    extensions.digest(pg_catalog.convert_to(v_token,'UTF8'),'sha256'),
    p_year_level,
    v_expires_at,
    trim(p_student_name),
    trim(p_student_id),
    nullif(trim(coalesce(p_class_name,'')),''),
    'maths_session_bridge'
  );

  return jsonb_build_object(
    'allowed', true,
    'access_token', v_token,
    'expires_at', v_expires_at,
    'student', jsonb_build_object(
      'student_name', trim(p_student_name),
      'student_id', trim(p_student_id),
      'year_level', p_year_level,
      'class_name', nullif(trim(coalesce(p_class_name,'')),'')
    )
  );
end;
$$;

revoke all on function public.science_mint_student_access_v01(smallint,text,text,text)
  from public, anon, authenticated;
grant execute on function public.science_mint_student_access_v01(smallint,text,text,text)
  to service_role;

grant usage on schema private to service_role;
grant insert on table private.science_access_tickets to service_role;

commit;

-- Verification expectations:
-- anon/authenticated EXECUTE on science_mint_student_access_v01 = false
-- service_role EXECUTE = true
-- anon/authenticated SELECT/INSERT on private.science_access_tickets = false
