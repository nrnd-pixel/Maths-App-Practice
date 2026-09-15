-- Metadata V2 Stage 3 server hardening — make diagnostic plan/grading independently
-- enforce the fail-closed readiness V2 contract before returning diagnostic
-- content or writing diagnostic events.
--
-- Additive function replacement only: no browser change, no pilot-setting DML,
-- no Metadata V2 profile mutation, and no ordinary Practice grading change.

begin;

do $adaptive_diagnostic_server_readiness_v2_preflight$
begin
  if to_regprocedure('public.student_adaptive_question_readiness_v2(text,uuid,boolean)') is null then
    raise exception 'Adaptive diagnostic hardening preflight failed: student_adaptive_question_readiness_v2(text,uuid,boolean) is required.';
  end if;

  if to_regprocedure('public.student_adaptive_pilot_access_v59b(text,uuid)') is null then
    raise exception 'Adaptive diagnostic hardening preflight failed: student_adaptive_pilot_access_v59b(text,uuid) is required.';
  end if;

  if to_regprocedure('public.student_adaptive_diagnostic_plan_v1(text,uuid)') is null then
    raise exception 'Adaptive diagnostic hardening preflight failed: student_adaptive_diagnostic_plan_v1(text,uuid) is required.';
  end if;

  if to_regprocedure('public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb)') is null then
    raise exception 'Adaptive diagnostic hardening preflight failed: student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb) is required.';
  end if;
end;
$adaptive_diagnostic_server_readiness_v2_preflight$;

create or replace function public.student_adaptive_diagnostic_plan_v1(
  p_access_token text,
  p_target_question_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_readiness jsonb;
  v_target jsonb;
  v_steps jsonb;
  v_route jsonb;
  v_mis jsonb;
  v_step_count integer := 0;
  v_invalid_step boolean := false;
begin
  -- Pilot access/target allow-list remains the activation boundary.
  v_ticket := public.student_adaptive_pilot_access_v59b(p_access_token,p_target_question_id);
  if v_ticket.id is null then
    return jsonb_build_object('status','DISABLED');
  end if;

  -- Metadata V2 + Practice eligibility + year + curated route readiness must
  -- also be enforced server-side. The browser is not the authority boundary.
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

  -- Diagnostic steps themselves must stay active, Practice-eligible,
  -- same-year and within the supported server-grading response families.
  select count(*)::integer,
         coalesce(bool_or(
           q.id is null
           or q.active is distinct from true
           or q.practice_eligible is distinct from true
           or q.year_level is distinct from v_ticket.year_level
           or coalesce(nullif(btrim(q.response_type),''),'text') not in (
             'text','number','number_unit','fraction','multiple_choice','multi_select','multi_blank'
           )
         ), false)
  into v_step_count, v_invalid_step
  from public.adaptive_pilot_diagnostic_plan p
  left join public.questions q on q.id=p.diagnostic_question_id
  where p.target_question_id=p_target_question_id
    and p.is_active=true;

  if v_step_count = 0 or v_invalid_step then
    return jsonb_build_object('status','DIAGNOSTIC_PLAN_NOT_READY');
  end if;

  v_target := public.student_adaptive_safe_question_v59b(p_target_question_id);
  if v_target is null then
    return jsonb_build_object('status','NOT_AVAILABLE');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'step_order',p.step_order,
      'step_label',p.step_label,
      'skill_id',p.skill_id,
      'question',public.student_adaptive_safe_question_v59b(p.diagnostic_question_id)
    ) order by p.step_order
  ),'[]'::jsonb)
  into v_steps
  from public.adaptive_pilot_diagnostic_plan p
  where p.target_question_id=p_target_question_id
    and p.is_active=true;

  v_route := public.adaptive_route_preview_v1(p_target_question_id);
  v_mis := case
    when jsonb_typeof(v_route->'misconceptions')='array'
      and jsonb_array_length(v_route->'misconceptions')>0
    then (v_route->'misconceptions')->0
    else null
  end;

  return jsonb_build_object(
    'status','READY',
    'pilot_version','v5.9b',
    'target',v_target,
    'steps',v_steps,
    'remediation',case when v_mis is null then null else jsonb_build_object(
      'student_feedback',v_mis->>'student_feedback',
      'diagnostic_message',v_mis->>'diagnostic_message',
      'hint_1',v_mis->>'hint_1',
      'hint_2',v_mis->>'hint_2',
      'scaffold_id',v_mis->>'scaffold_id',
      'scaffold_name',v_mis->>'scaffold_name',
      'microcheck_count',v_mis->'microcheck_count',
      'success_threshold',v_mis->>'success_threshold'
    ) end
  );
end;
$function$;

create or replace function public.student_adaptive_diagnostic_grade_v1(
  p_access_token text,
  p_target_question_id uuid,
  p_question_id uuid,
  p_stage text,
  p_response jsonb
) returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_readiness jsonb;
  v_question public.questions;
  v_allowed boolean := false;
  v_correct boolean;
  v_route jsonb;
  v_mis jsonb;
  v_response_type text;
begin
  if p_stage not in ('diagnostic','target_retry') then
    return jsonb_build_object('status','INVALID_STAGE');
  end if;

  -- Pilot access/target allow-list remains the activation boundary.
  v_ticket := public.student_adaptive_pilot_access_v59b(p_access_token,p_target_question_id);
  if v_ticket.id is null then
    return jsonb_build_object('status','DISABLED');
  end if;

  -- Re-check target readiness on every grading call before any diagnostic
  -- event can be written. Direct RPC callers cannot bypass Metadata V2.
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

  if p_stage='target_retry' then
    v_allowed := p_question_id=p_target_question_id;
  else
    select exists(
      select 1
      from public.adaptive_pilot_diagnostic_plan p
      where p.target_question_id=p_target_question_id
        and p.diagnostic_question_id=p_question_id
        and p.is_active=true
    ) into v_allowed;
  end if;

  if not v_allowed then
    return jsonb_build_object('status','NOT_ALLOWED');
  end if;

  select q.* into v_question
  from public.questions q
  where q.id=p_question_id
    and q.active=true
    and q.practice_eligible=true
    and q.year_level=v_ticket.year_level
  limit 1;

  if v_question.id is null then
    return jsonb_build_object('status','NOT_AVAILABLE');
  end if;

  v_response_type := coalesce(nullif(btrim(v_question.response_type),''),'text');
  if v_response_type not in (
    'text','number','number_unit','fraction','multiple_choice','multi_select','multi_blank'
  ) then
    return jsonb_build_object('status','NOT_AVAILABLE');
  end if;

  if public.student_response_is_empty(coalesce(p_response,'{}'::jsonb)) then
    return jsonb_build_object('status','EMPTY_RESPONSE');
  end if;

  v_correct := public.student_response_is_correct(v_question,p_response);

  insert into public.adaptive_pilot_diagnostic_events(
    roster_student_id,target_question_id,question_id,stage,correct
  ) values (
    v_ticket.roster_student_id,p_target_question_id,p_question_id,p_stage,v_correct
  );

  v_route := public.adaptive_route_preview_v1(p_target_question_id);
  v_mis := case
    when jsonb_typeof(v_route->'misconceptions')='array'
      and jsonb_array_length(v_route->'misconceptions')>0
    then (v_route->'misconceptions')->0
    else null
  end;

  return jsonb_build_object(
    'status','READY',
    'correct',v_correct,
    'stage',p_stage,
    'feedback',case when v_correct then 'Good — this skill looks secure.' else
      coalesce(v_mis->>'student_feedback','This prerequisite needs a little more practice.') end,
    'hint_1',case when not v_correct then v_mis->>'hint_1' else null end,
    'hint_2',case when not v_correct then v_mis->>'hint_2' else null end,
    'scaffold_name',case when not v_correct then v_mis->>'scaffold_name' else null end
  );
end;
$function$;

-- Preserve the existing browser-RPC execute boundary explicitly.
revoke all on function public.student_adaptive_diagnostic_plan_v1(text,uuid)
  from public, anon, authenticated;
grant execute on function public.student_adaptive_diagnostic_plan_v1(text,uuid)
  to anon, authenticated, postgres, service_role;

revoke all on function public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb)
  to anon, authenticated, postgres, service_role;

comment on function public.student_adaptive_diagnostic_plan_v1(text,uuid) is
  'V5.9B diagnostic plan contract hardened by Metadata V2 readiness V2. Pilot access and target allow-list remain required; target readiness and diagnostic-step safety are independently rechecked server-side before diagnostic content is returned.';

comment on function public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb) is
  'V5.9B diagnostic grading contract hardened by Metadata V2 readiness V2. Pilot access and target allow-list remain required; target readiness is independently rechecked before any diagnostic event is written.';

commit;
