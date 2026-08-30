-- V5.2C.2 — rotate a completed Topical Practice ticket into one fresh unbound
-- Practice ticket for the same signed-in student. The old used bearer token is
-- invalidated immediately so one-time-ticket semantics remain intact.
-- Applied to production via migrations:
--   20260830162514 v52c2_topical_ticket_rotation
--   20260830162751 v52c2_topical_ticket_rotation_unbound (final contract below)

create or replace function public.renew_student_practice_access_v52c2(
  p_access_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.student_access_tickets;
  v_token text;
  v_expires_at timestamptz;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.expires_at>now()
  limit 1
  for update;

  if v_ticket.id is null
     or v_ticket.purpose<>'practice'
     or v_ticket.used_at is null
     or nullif(trim(coalesce(v_ticket.topical_source,'')),'') is null then
    raise exception 'Student access could not be renewed';
  end if;

  v_token:=encode(extensions.gen_random_bytes(32),'hex');
  v_expires_at:=least(v_ticket.expires_at,now()+interval '8 hours');

  insert into public.student_access_tickets(
    token_hash,purpose,access_mode,roster_student_id,class_id,student_name,student_id,
    year_level,class_group,expires_at,topical_source
  ) values (
    extensions.digest(v_token,'sha256'),'practice',v_ticket.access_mode,
    v_ticket.roster_student_id,v_ticket.class_id,v_ticket.student_name,v_ticket.student_id,
    v_ticket.year_level,v_ticket.class_group,v_expires_at,null
  );

  update public.student_access_tickets
  set expires_at=now()
  where id=v_ticket.id;

  return jsonb_build_object(
    'allowed',true,'access_token',v_token,'access_mode',v_ticket.access_mode,
    'roster_student_id',v_ticket.roster_student_id,'class_id',v_ticket.class_id,
    'student_name',v_ticket.student_name,'student_id',v_ticket.student_id,
    'year_level',v_ticket.year_level,'class_name',v_ticket.class_group,
    'registered',(v_ticket.roster_student_id is not null)
  );
end;
$$;

revoke execute on function public.renew_student_practice_access_v52c2(text)
  from public, anon, authenticated;
grant execute on function public.renew_student_practice_access_v52c2(text)
  to anon, authenticated;
