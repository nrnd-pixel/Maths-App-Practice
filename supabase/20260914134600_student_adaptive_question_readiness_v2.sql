-- Metadata V2 Stage 1 — server-side adaptive question readiness contract.
-- Additive only: no browser integration, no profile mutation, no pilot allow-list change.
-- The existing V5.9B pilot gate remains the separate student/target activation boundary.

begin;

do $adaptive_readiness_v2_preflight$
begin
  if to_regclass('public.question_demand_profile_v2') is null then
    raise exception 'Adaptive readiness V2 preflight failed: Metadata V2 profile table is required.';
  end if;

  if to_regprocedure('public.adaptive_route_preview_v1(uuid)') is null then
    raise exception 'Adaptive readiness V2 preflight failed: adaptive_route_preview_v1(uuid) is required.';
  end if;
end;
$adaptive_readiness_v2_preflight$;

create or replace function public.student_adaptive_question_readiness_v2(
  p_access_token text,
  p_question_id uuid,
  p_require_diagnostic_route boolean default true
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_ticket public.student_access_tickets;
  v_question public.questions;
  v_profile public.question_demand_profile_v2;
  v_route jsonb;
  v_response_type text;
  v_require_route boolean := coalesce(p_require_diagnostic_route, true);
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash = extensions.digest(trim(coalesce(p_access_token, '')), 'sha256')
    and t.expires_at > now()
    and t.purpose = 'practice'
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null
     or v_ticket.roster_student_id is null
     or v_ticket.year_level is null then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'ACCESS_DENIED'
    );
  end if;

  if p_question_id is null then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'QUESTION_NOT_AVAILABLE'
    );
  end if;

  select q.* into v_question
  from public.questions q
  where q.id = p_question_id
    and q.active = true
    and q.practice_eligible = true
  limit 1;

  if v_question.id is null then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'QUESTION_NOT_AVAILABLE'
    );
  end if;

  if v_question.year_level is distinct from v_ticket.year_level then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'YEAR_MISMATCH'
    );
  end if;

  select p.* into v_profile
  from public.question_demand_profile_v2 p
  where p.question_id = p_question_id
  limit 1;

  if v_profile.question_id is null then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'NO_METADATA_PROFILE'
    );
  end if;

  if v_profile.profile_status <> 'reviewed' then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'PROFILE_NOT_REVIEWED'
    );
  end if;

  if v_profile.source_evidence_status not in ('verified', 'verified_with_correction') then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'SOURCE_NOT_VERIFIED'
    );
  end if;

  if v_profile.adaptive_use_status <> 'eligible' then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'ADAPTIVE_NOT_ELIGIBLE'
    );
  end if;

  if cardinality(v_profile.held_dimensions) <> 0
     or v_profile.procedural_demand is null
     or v_profile.conceptual_reasoning is null
     or v_profile.reading_context_load is null
     or v_profile.visual_spatial_demand is null
     or v_profile.response_complexity is null then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'PROFILE_HELD_OR_INCOMPLETE'
    );
  end if;

  v_response_type := coalesce(nullif(btrim(v_question.response_type), ''), 'text');

  if v_response_type in ('drawing', 'manual') then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'UNSUPPORTED_RESPONSE_TYPE'
    );
  end if;

  if v_response_type not in (
    'text',
    'number',
    'number_unit',
    'fraction',
    'multiple_choice',
    'multi_select',
    'multi_blank'
  ) then
    return jsonb_build_object(
      'version', 'adaptive_question_readiness_v2',
      'status', 'UNSUPPORTED_RESPONSE_TYPE'
    );
  end if;

  if v_require_route then
    v_route := public.adaptive_route_preview_v1(p_question_id);

    if coalesce(v_route->>'status', '') = 'NO_PRIMARY_MAPPING' then
      return jsonb_build_object(
        'version', 'adaptive_question_readiness_v2',
        'status', 'NO_PRIMARY_MAPPING'
      );
    end if;

    if coalesce(v_route->>'status', '') <> 'READY' then
      return jsonb_build_object(
        'version', 'adaptive_question_readiness_v2',
        'status', 'ROUTE_NOT_READY'
      );
    end if;
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'version', 'adaptive_question_readiness_v2',
    'status', 'READY',
    'question_id', p_question_id,
    'diagnostic_route_ready', case when v_require_route then true else null end
  ));
end;
$function$;

revoke all on function public.student_adaptive_question_readiness_v2(text, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.student_adaptive_question_readiness_v2(text, uuid, boolean)
  to anon, authenticated, postgres, service_role;

comment on function public.student_adaptive_question_readiness_v2(text, uuid, boolean) is
  'Metadata V2 Stage 1 fail-closed adaptive readiness contract. Validates Practice ticket, question availability, reviewed/source-verified/explicitly-eligible demand profile, supported response type and optional curated route readiness. Returns status only; does not activate the V5.9B pilot or expose profile details.';

commit;
