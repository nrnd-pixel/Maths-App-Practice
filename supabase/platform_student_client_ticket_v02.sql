-- Platform V0.2: client-generated, server-activated student ticket.
--
-- The browser creates a 256-bit random ticket before submitting credentials.
-- The server activates only the hash after the existing PIN, roster, rate-limit
-- and class checks pass. The browser can then claim a compact subject snapshot
-- without depending on the original login response body.

begin;

create or replace function public.validate_platform_student_access_v02(
  p_platform_access_token text,
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
  v_token text := lower(trim(coalesce(p_platform_access_token,'')));
  v_mode text;
  v_student public.class_students;
  v_class public.school_classes;
  v_matches integer := 0;
  v_identifier_hash bytea;
  v_failures integer := 0;
  v_expires_at timestamptz := now() + interval '8 hours';
  v_inserted integer := 0;
begin
  if v_token !~ '^[0-9a-f]{64}$'
     or p_selected_year is null
     or p_selected_year not between 1 and 6 then
    return jsonb_build_object('accepted',false);
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
      return jsonb_build_object('accepted',false);
    end if;

    if v_matches<>1
       or v_student.id is null
       or (v_mode='student_pin' and (
         v_student.pin_hash is null
         or extensions.crypt(coalesce(p_pin,''),v_student.pin_hash)<>v_student.pin_hash
       )) then
      insert into public.student_access_failures(identifier_hash) values(v_identifier_hash);
      return jsonb_build_object('accepted',false);
    end if;

    delete from public.student_access_failures where identifier_hash=v_identifier_hash;
  elsif v_student.id is null and trim(coalesce(p_display_name,''))='' then
    return jsonb_build_object('accepted',false);
  end if;

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
  )
  on conflict (token_hash) do nothing;

  get diagnostics v_inserted = row_count;
  return jsonb_build_object('accepted',v_inserted=1);
end;
$$;

revoke all on function public.validate_platform_student_access_v02(text,text,text,text,smallint,text) from public;
grant execute on function public.validate_platform_student_access_v02(text,text,text,text,smallint,text) to anon, authenticated;

create or replace function public.claim_platform_student_access_v02(
  p_platform_access_token text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_token text := lower(trim(coalesce(p_platform_access_token,'')));
  v_ticket private.platform_student_access_tickets;
  v_maths_allowed boolean;
  v_science_allowed boolean;
begin
  if v_token !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('r',false);
  end if;

  select t.* into v_ticket
  from private.platform_student_access_tickets t
  where t.token_hash=extensions.digest(v_token,'sha256')
    and t.revoked_at is null
    and t.expires_at>now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null then
    return jsonb_build_object('r',false);
  end if;

  update private.platform_student_access_tickets
  set last_used_at=now()
  where id=v_ticket.id;

  select is_allowed into v_maths_allowed
  from private.platform_resolve_subject_access(v_ticket.roster_student_id,v_ticket.class_id,'maths');

  select is_allowed into v_science_allowed
  from private.platform_resolve_subject_access(v_ticket.roster_student_id,v_ticket.class_id,'science');

  return jsonb_build_object(
    'r',true,
    'n',v_ticket.student_name,
    'i',v_ticket.student_id,
    'y',v_ticket.year_level,
    'c',v_ticket.class_group,
    'm',coalesce(v_maths_allowed,false),
    's',coalesce(v_science_allowed,false),
    'e',extract(epoch from v_ticket.expires_at)::bigint
  );
end;
$$;

revoke all on function public.claim_platform_student_access_v02(text) from public;
grant execute on function public.claim_platform_student_access_v02(text) to anon, authenticated;

commit;
