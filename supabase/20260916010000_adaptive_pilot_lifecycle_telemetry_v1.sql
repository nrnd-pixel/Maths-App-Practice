-- Stage 3E — adaptive-pilot lifecycle telemetry.
--
-- Additive evidence-only contract. This does not change ordinary Practice grading,
-- diagnostic grading, pilot allow-lists, Metadata V2 eligibility, XP, mastery,
-- assignments, Past Paper or Exam behaviour.

begin;

do $adaptive_pilot_lifecycle_telemetry_v1_preflight$
begin
  if to_regprocedure('public.student_adaptive_pilot_access_v59b(text,uuid)') is null then
    raise exception 'Stage 3E preflight failed: student_adaptive_pilot_access_v59b(text,uuid) is required.';
  end if;

  if to_regprocedure('public.student_adaptive_question_readiness_v2(text,uuid,boolean)') is null then
    raise exception 'Stage 3E preflight failed: student_adaptive_question_readiness_v2(text,uuid,boolean) is required.';
  end if;

  if to_regprocedure('public.student_adaptive_trigger_check_v1(text,uuid)') is null then
    raise exception 'Stage 3E preflight failed: student_adaptive_trigger_check_v1(text,uuid) is required.';
  end if;
end;
$adaptive_pilot_lifecycle_telemetry_v1_preflight$;

create table if not exists public.adaptive_pilot_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null,
  roster_student_id uuid not null references public.class_students(id) on delete cascade,
  practice_ticket_id uuid not null references public.student_access_tickets(id) on delete cascade,
  target_question_id uuid not null references public.questions(id) on delete cascade,
  event_type text not null check (event_type in (
    'offer_shown',
    'offer_accepted',
    'offer_declined',
    'diagnostic_skipped',
    'diagnostic_completed',
    'target_retry_submitted',
    'returned_to_practice',
    'adaptive_error_recovered'
  )),
  pilot_version text not null default 'v5.9b',
  created_at timestamptz not null default now(),
  unique (flow_id, event_type)
);

create index if not exists idx_adaptive_pilot_lifecycle_student_created
  on public.adaptive_pilot_lifecycle_events(roster_student_id, created_at desc);
create index if not exists idx_adaptive_pilot_lifecycle_target_created
  on public.adaptive_pilot_lifecycle_events(target_question_id, created_at desc);
create index if not exists idx_adaptive_pilot_lifecycle_ticket
  on public.adaptive_pilot_lifecycle_events(practice_ticket_id, created_at desc);

alter table public.adaptive_pilot_lifecycle_events enable row level security;
revoke all on public.adaptive_pilot_lifecycle_events from public, anon, authenticated;
grant select, insert, update, delete on public.adaptive_pilot_lifecycle_events to postgres, service_role;

create or replace function public.student_adaptive_lifecycle_event_v1(
  p_access_token text,
  p_target_question_id uuid,
  p_event_type text,
  p_flow_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_readiness jsonb;
  v_trigger jsonb;
  v_flow_id uuid;
  v_event_type text := lower(btrim(coalesce(p_event_type,'')));
  v_has_offer boolean := false;
  v_has_accept boolean := false;
  v_has_decline boolean := false;
  v_has_completed boolean := false;
  v_inserted uuid;
begin
  if v_event_type not in (
    'offer_shown',
    'offer_accepted',
    'offer_declined',
    'diagnostic_skipped',
    'diagnostic_completed',
    'target_retry_submitted',
    'returned_to_practice',
    'adaptive_error_recovered'
  ) then
    return jsonb_build_object('status','INVALID_EVENT');
  end if;

  -- Reuse the existing server-side pilot access + target allow-list boundary.
  v_ticket := public.student_adaptive_pilot_access_v59b(
    p_access_token,
    p_target_question_id
  );
  if v_ticket.id is null then
    return jsonb_build_object('status','DISABLED');
  end if;

  -- Telemetry must never become a bypass around Metadata V2 / route readiness.
  v_readiness := public.student_adaptive_question_readiness_v2(
    p_access_token,
    p_target_question_id,
    true
  );
  if coalesce(v_readiness->>'status','') <> 'READY' then
    return jsonb_build_object(
      'status','READINESS_BLOCKED',
      'readiness_status',coalesce(v_readiness->>'status','UNKNOWN')
    );
  end if;

  if v_event_type='offer_shown' then
    -- The browser cannot manufacture an offer lifecycle unless the authoritative
    -- trigger says the completed ordinary Practice question should receive one.
    if p_flow_id is not null then
      return jsonb_build_object('status','INVALID_FLOW');
    end if;

    v_trigger := public.student_adaptive_trigger_check_v1(
      p_access_token,
      p_target_question_id
    );
    if coalesce(v_trigger->>'status','') <> 'READY'
       or coalesce((v_trigger->>'should_offer')::boolean,false) is distinct from true then
      return jsonb_build_object('status','TRIGGER_BLOCKED');
    end if;

    v_flow_id := gen_random_uuid();
  else
    if p_flow_id is null then
      return jsonb_build_object('status','INVALID_FLOW');
    end if;
    v_flow_id := p_flow_id;

    select exists(
      select 1
      from public.adaptive_pilot_lifecycle_events e
      where e.flow_id=v_flow_id
        and e.roster_student_id=v_ticket.roster_student_id
        and e.practice_ticket_id=v_ticket.id
        and e.target_question_id=p_target_question_id
        and e.event_type='offer_shown'
    ) into v_has_offer;

    if not v_has_offer then
      return jsonb_build_object('status','FLOW_NOT_FOUND');
    end if;
  end if;

  if v_event_type in ('offer_accepted','offer_declined') then
    if exists(
      select 1 from public.adaptive_pilot_lifecycle_events e
      where e.flow_id=v_flow_id
        and e.event_type in ('offer_accepted','offer_declined')
    ) then
      return jsonb_build_object('status','INVALID_TRANSITION');
    end if;
  elsif v_event_type in ('diagnostic_skipped','diagnostic_completed') then
    select exists(
      select 1 from public.adaptive_pilot_lifecycle_events e
      where e.flow_id=v_flow_id and e.event_type='offer_accepted'
    ), exists(
      select 1 from public.adaptive_pilot_lifecycle_events e
      where e.flow_id=v_flow_id and e.event_type='offer_declined'
    ) into v_has_accept, v_has_decline;

    if not v_has_accept or v_has_decline then
      return jsonb_build_object('status','INVALID_TRANSITION');
    end if;
  elsif v_event_type='target_retry_submitted' then
    select exists(
      select 1 from public.adaptive_pilot_lifecycle_events e
      where e.flow_id=v_flow_id and e.event_type='diagnostic_completed'
    ) into v_has_completed;
    if not v_has_completed then
      return jsonb_build_object('status','INVALID_TRANSITION');
    end if;
  elsif v_event_type='returned_to_practice' then
    select exists(
      select 1 from public.adaptive_pilot_lifecycle_events e
      where e.flow_id=v_flow_id and e.event_type='offer_accepted'
    ), exists(
      select 1 from public.adaptive_pilot_lifecycle_events e
      where e.flow_id=v_flow_id and e.event_type='offer_declined'
    ) into v_has_accept, v_has_decline;

    if not v_has_accept and not v_has_decline then
      return jsonb_build_object('status','INVALID_TRANSITION');
    end if;
  end if;

  insert into public.adaptive_pilot_lifecycle_events(
    flow_id,
    roster_student_id,
    practice_ticket_id,
    target_question_id,
    event_type
  ) values (
    v_flow_id,
    v_ticket.roster_student_id,
    v_ticket.id,
    p_target_question_id,
    v_event_type
  )
  on conflict (flow_id,event_type) do nothing
  returning id into v_inserted;

  return jsonb_build_object(
    'status','READY',
    'flow_id',v_flow_id,
    'event_type',v_event_type,
    'recorded',v_inserted is not null
  );
end;
$function$;

revoke all on function public.student_adaptive_lifecycle_event_v1(text,uuid,text,uuid)
  from public, anon, authenticated;
grant execute on function public.student_adaptive_lifecycle_event_v1(text,uuid,text,uuid)
  to anon, authenticated, postgres, service_role;

comment on table public.adaptive_pilot_lifecycle_events is
  'Stage 3E append-only adaptive-pilot lifecycle evidence. Stores pseudonymous flow/ticket/roster/target identifiers and a small event enum only; no answer text, answer keys, student names, student IDs, PINs, IP addresses or Metadata V2 evidence.';

comment on function public.student_adaptive_lifecycle_event_v1(text,uuid,text,uuid) is
  'Stage 3E non-scoring lifecycle telemetry contract. Reuses pilot access, independently requires readiness V2, requires the authoritative trigger for offer_shown, generates the flow UUID server-side, and enforces simple fail-closed event transitions.';

commit;
