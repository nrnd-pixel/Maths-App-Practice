create table if not exists public.adaptive_pilot_settings (
  id boolean primary key default true check (id = true),
  enabled boolean not null default false,
  allow_all_students boolean not null default false,
  allowed_roster_student_ids uuid[] not null default '{}'::uuid[],
  allowed_question_ids uuid[] not null default '{}'::uuid[],
  updated_at timestamptz not null default now()
);

insert into public.adaptive_pilot_settings (
  id, enabled, allow_all_students, allowed_roster_student_ids, allowed_question_ids
)
values (
  true,
  false,
  false,
  '{}'::uuid[],
  array[
    'c4feda04-6c85-4123-baf6-8e38deb1d1fa'::uuid,
    'c2041abf-d204-47b3-ba92-3129c97681ae'::uuid,
    '077872ec-2c3c-402f-9c51-491c77500791'::uuid
  ]
)
on conflict (id) do nothing;

alter table public.adaptive_pilot_settings enable row level security;

revoke all on table public.adaptive_pilot_settings from anon;
revoke all on table public.adaptive_pilot_settings from authenticated;
grant select, update on table public.adaptive_pilot_settings to authenticated;
grant all on table public.adaptive_pilot_settings to service_role;

create policy adaptive_pilot_settings_teacher_select
on public.adaptive_pilot_settings
for select
to authenticated
using ((select public.is_teacher()));

create policy adaptive_pilot_settings_teacher_update
on public.adaptive_pilot_settings
for update
to authenticated
using ((select public.is_teacher()))
with check ((select public.is_teacher()));

create trigger adaptive_pilot_settings_set_updated_at
before update on public.adaptive_pilot_settings
for each row execute function public.set_updated_at();

create or replace function public.student_adaptive_route_preview_v1(
  p_access_token text,
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_settings public.adaptive_pilot_settings;
  v_question public.questions;
  v_route jsonb;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token, '')), 'sha256')
    and t.expires_at > now()
    and t.purpose = 'practice'
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null then
    return jsonb_build_object('status','ACCESS_DENIED');
  end if;

  select s.* into v_settings
  from public.adaptive_pilot_settings s
  where s.id = true
  limit 1;

  if v_settings.id is null or not coalesce(v_settings.enabled, false) then
    return jsonb_build_object('status','DISABLED');
  end if;

  if not coalesce(v_settings.allow_all_students, false)
     and (v_ticket.roster_student_id is null
          or not (v_ticket.roster_student_id = any(v_settings.allowed_roster_student_ids))) then
    return jsonb_build_object('status','DISABLED');
  end if;

  if p_question_id is null
     or not (p_question_id = any(v_settings.allowed_question_ids)) then
    return jsonb_build_object('status','NOT_IN_PILOT');
  end if;

  select q.* into v_question
  from public.questions q
  where q.id = p_question_id
    and q.active = true
  limit 1;

  if v_question.id is null then
    return jsonb_build_object('status','NOT_AVAILABLE');
  end if;

  if v_ticket.year_level <> v_question.year_level then
    return jsonb_build_object('status','NOT_AVAILABLE');
  end if;

  v_route := public.adaptive_route_preview_v1(p_question_id);

  if coalesce(v_route->>'status','') <> 'READY' then
    return jsonb_build_object('status','NOT_AVAILABLE');
  end if;

  return v_route || jsonb_build_object(
    'pilot', true,
    'student_year_level', v_ticket.year_level
  );
end;
$function$;

revoke all on function public.student_adaptive_route_preview_v1(text, uuid) from public;
grant execute on function public.student_adaptive_route_preview_v1(text, uuid) to anon, authenticated, service_role, postgres;
