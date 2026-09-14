begin;

create table if not exists public.adaptive_pilot_diagnostic_plan (
  target_question_id uuid not null references public.questions(id) on delete cascade,
  step_order smallint not null check (step_order between 1 and 9),
  diagnostic_question_id uuid not null references public.questions(id) on delete cascade,
  skill_id text references public.curriculum_skills(skill_id),
  step_label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (target_question_id, step_order),
  unique (target_question_id, diagnostic_question_id)
);

create index if not exists idx_adaptive_pilot_plan_diag_question
  on public.adaptive_pilot_diagnostic_plan(diagnostic_question_id);
create index if not exists idx_adaptive_pilot_plan_skill
  on public.adaptive_pilot_diagnostic_plan(skill_id);

alter table public.adaptive_pilot_diagnostic_plan enable row level security;
revoke all on public.adaptive_pilot_diagnostic_plan from anon, authenticated;
grant select on public.adaptive_pilot_diagnostic_plan to postgres, service_role;

create table if not exists public.adaptive_pilot_diagnostic_events (
  id uuid primary key default gen_random_uuid(),
  roster_student_id uuid not null references public.class_students(id) on delete cascade,
  target_question_id uuid not null references public.questions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  stage text not null check (stage in ('diagnostic','target_retry')),
  correct boolean not null,
  pilot_version text not null default 'v5.9b',
  created_at timestamptz not null default now()
);

create index if not exists idx_adaptive_pilot_events_student_created
  on public.adaptive_pilot_diagnostic_events(roster_student_id, created_at desc);
create index if not exists idx_adaptive_pilot_events_target
  on public.adaptive_pilot_diagnostic_events(target_question_id, created_at desc);
create index if not exists idx_adaptive_pilot_events_question
  on public.adaptive_pilot_diagnostic_events(question_id);

alter table public.adaptive_pilot_diagnostic_events enable row level security;
revoke all on public.adaptive_pilot_diagnostic_events from anon, authenticated;
grant select, insert, update, delete on public.adaptive_pilot_diagnostic_events to postgres, service_role;

drop policy if exists adaptive_pilot_diagnostic_events_teacher_select on public.adaptive_pilot_diagnostic_events;
create policy adaptive_pilot_diagnostic_events_teacher_select
on public.adaptive_pilot_diagnostic_events
for select
to authenticated
using (public.is_teacher());

grant select on public.adaptive_pilot_diagnostic_events to authenticated;

with targets as (
  select
    (max(id::text) filter (where exam_year=2025 and paper='Paper 1' and question_number='9(b)'))::uuid as decimal_target,
    (max(id::text) filter (where exam_year=2025 and paper='Paper 2' and question_number='4'))::uuid as fraction_target,
    (max(id::text) filter (where exam_year=2025 and paper='Paper 2' and question_number='30'))::uuid as percent_target,
    (max(id::text) filter (where exam_year=2025 and paper='Paper 1' and question_number='12'))::uuid as decimal_q1,
    (max(id::text) filter (where exam_year=2019 and paper='Paper 2' and question_number='1(a)'))::uuid as decimal_q2,
    (max(id::text) filter (where exam_year=2014 and paper='Paper 1' and question_number='14'))::uuid as decimal_q3,
    (max(id::text) filter (where exam_year=2018 and paper='Paper 2' and question_number='4'))::uuid as fraction_q1,
    (max(id::text) filter (where exam_year=2024 and paper='Paper 1' and question_number='3'))::uuid as fraction_q2,
    (max(id::text) filter (where exam_year=2025 and paper='Paper 2' and question_number='18'))::uuid as percent_q1,
    (max(id::text) filter (where exam_year=2025 and paper='Paper 2' and question_number='11'))::uuid as percent_q2
  from public.questions
), rows_to_insert as (
  select decimal_target target_question_id, 1::smallint step_order, decimal_q1 diagnostic_question_id,
         'Y4-DEC-M01'::text skill_id, 'Check decimal place value'::text step_label from targets
  union all
  select decimal_target, 2::smallint, decimal_q2, 'Y4-DEC-M01', 'Check decimal partitioning' from targets
  union all
  select decimal_target, 3::smallint, decimal_q3, 'Y4-DEC-M01', 'Check decimal place-value composition' from targets
  union all
  select fraction_target, 1::smallint, fraction_q1, 'Y5-FRA-M07', 'Check dividing a fraction or mixed number by a whole number' from targets
  union all
  select fraction_target, 2::smallint, fraction_q2, 'Y6-FRA-M01', 'Check multiplication of fractions' from targets
  union all
  select percent_target, 1::smallint, percent_q1, 'Y6-PCT-M01', 'Check expressing a quantity as a percentage' from targets
  union all
  select percent_target, 2::smallint, percent_q2, 'Y6-PCT-M02', 'Check finding a percentage of a quantity' from targets
)
insert into public.adaptive_pilot_diagnostic_plan(target_question_id,step_order,diagnostic_question_id,skill_id,step_label)
select target_question_id,step_order,diagnostic_question_id,skill_id,step_label
from rows_to_insert
where target_question_id is not null and diagnostic_question_id is not null
on conflict (target_question_id,step_order) do update set
  diagnostic_question_id=excluded.diagnostic_question_id,
  skill_id=excluded.skill_id,
  step_label=excluded.step_label,
  is_active=true;

create or replace function public.student_adaptive_pilot_access_v59b(
  p_access_token text,
  p_target_question_id uuid
) returns public.student_access_tickets
language plpgsql
security definer
set search_path=''
as $$
declare
  v_ticket public.student_access_tickets;
  v_settings public.adaptive_pilot_settings;
begin
  select t.* into v_ticket
  from public.student_access_tickets t
  where t.token_hash=extensions.digest(trim(coalesce(p_access_token,'')),'sha256')
    and t.purpose='practice'
    and t.expires_at>now()
  order by t.created_at desc
  limit 1;

  if v_ticket.id is null or v_ticket.roster_student_id is null then
    return null;
  end if;

  select s.* into v_settings
  from public.adaptive_pilot_settings s
  where s.id=true
  limit 1;

  if v_settings.id is null or not coalesce(v_settings.enabled,false) then
    return null;
  end if;

  if not coalesce(v_settings.allow_all_students,false)
     and not (v_ticket.roster_student_id=any(v_settings.allowed_roster_student_ids)) then
    return null;
  end if;

  if p_target_question_id is null
     or not (p_target_question_id=any(v_settings.allowed_question_ids)) then
    return null;
  end if;

  return v_ticket;
end;
$$;

revoke all on function public.student_adaptive_pilot_access_v59b(text,uuid) from public, anon, authenticated;
grant execute on function public.student_adaptive_pilot_access_v59b(text,uuid) to postgres, service_role;

create or replace function public.student_adaptive_trigger_check_v1(
  p_access_token text,
  p_question_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_ticket public.student_access_tickets;
  v_event public.student_practice_answer_events;
begin
  v_ticket := public.student_adaptive_pilot_access_v59b(p_access_token,p_question_id);
  if v_ticket.id is null then
    return jsonb_build_object('status','DISABLED','should_offer',false);
  end if;

  select e.* into v_event
  from public.student_practice_answer_events e
  where e.ticket_id=v_ticket.id
    and e.question_id=p_question_id
  limit 1;

  if v_event.id is null then
    return jsonb_build_object('status','READY','should_offer',false,'attempts',0);
  end if;

  return jsonb_build_object(
    'status','READY',
    'should_offer',coalesce(v_event.completed,false)
      and coalesce(v_event.attempt_count,0)>=2
      and coalesce(v_event.final_correct,false)=false,
    'attempts',coalesce(v_event.attempt_count,0),
    'completed',coalesce(v_event.completed,false),
    'correct',coalesce(v_event.final_correct,false)
  );
end;
$$;

create or replace function public.student_adaptive_safe_question_v59b(p_question_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  q public.questions;
  v_type text;
  v_cfg jsonb := '{}'::jsonb;
begin
  select * into q from public.questions where id=p_question_id and active=true limit 1;
  if q.id is null then return null; end if;

  v_type := coalesce(q.response_type,'text');
  if v_type='number' then
    v_cfg:=jsonb_build_object('tolerance',coalesce(q.response_config->'tolerance','0'::jsonb));
  elsif v_type='number_unit' then
    v_cfg:=jsonb_strip_nulls(jsonb_build_object(
      'unit',q.response_config->'unit',
      'accepted_units',q.response_config->'accepted_units',
      'tolerance',coalesce(q.response_config->'tolerance','0'::jsonb)
    ));
  elsif v_type='fraction' then
    v_cfg:=jsonb_build_object('simplest_form',coalesce(q.response_config->'simplest_form','false'::jsonb));
  elsif v_type='multiple_choice' then
    v_cfg:=jsonb_build_object('options',coalesce(q.response_config->'options','[]'::jsonb));
  elsif v_type='multi_select' then
    v_cfg:=jsonb_build_object('options',coalesce(q.response_config->'options','[]'::jsonb));
  elsif v_type='multi_blank' then
    select jsonb_build_object('blanks',coalesce(jsonb_agg(jsonb_build_object('label',coalesce(b->>'label','Blank '||(ord::text))) order by ord),'[]'::jsonb))
    into v_cfg
    from jsonb_array_elements(coalesce(q.response_config->'blanks','[]'::jsonb)) with ordinality x(b,ord);
  end if;

  return jsonb_build_object(
    'question_id',q.id,
    'exam_year',q.exam_year,
    'paper',q.paper,
    'question_number',q.question_number,
    'question_text',q.question_text,
    'image_url',q.image_url,
    'response_type',v_type,
    'response_config',coalesce(v_cfg,'{}'::jsonb)
  );
end;
$$;

revoke all on function public.student_adaptive_safe_question_v59b(uuid) from public, anon, authenticated;
grant execute on function public.student_adaptive_safe_question_v59b(uuid) to postgres, service_role;

create or replace function public.student_adaptive_diagnostic_plan_v1(
  p_access_token text,
  p_target_question_id uuid
) returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_ticket public.student_access_tickets;
  v_target jsonb;
  v_steps jsonb;
  v_route jsonb;
  v_mis jsonb;
begin
  v_ticket := public.student_adaptive_pilot_access_v59b(p_access_token,p_target_question_id);
  if v_ticket.id is null then
    return jsonb_build_object('status','DISABLED');
  end if;

  v_target := public.student_adaptive_safe_question_v59b(p_target_question_id);
  if v_target is null then return jsonb_build_object('status','NOT_AVAILABLE'); end if;

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
  where p.target_question_id=p_target_question_id and p.is_active=true;

  v_route := public.adaptive_route_preview_v1(p_target_question_id);
  v_mis := case
    when jsonb_typeof(v_route->'misconceptions')='array' and jsonb_array_length(v_route->'misconceptions')>0
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
$$;

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
as $$
declare
  v_ticket public.student_access_tickets;
  v_question public.questions;
  v_allowed boolean := false;
  v_correct boolean;
  v_route jsonb;
  v_mis jsonb;
begin
  if p_stage not in ('diagnostic','target_retry') then
    return jsonb_build_object('status','INVALID_STAGE');
  end if;

  v_ticket := public.student_adaptive_pilot_access_v59b(p_access_token,p_target_question_id);
  if v_ticket.id is null then return jsonb_build_object('status','DISABLED'); end if;

  if p_stage='target_retry' then
    v_allowed := p_question_id=p_target_question_id;
  else
    select exists(
      select 1 from public.adaptive_pilot_diagnostic_plan p
      where p.target_question_id=p_target_question_id
        and p.diagnostic_question_id=p_question_id
        and p.is_active=true
    ) into v_allowed;
  end if;

  if not v_allowed then return jsonb_build_object('status','NOT_ALLOWED'); end if;

  select q.* into v_question
  from public.questions q
  where q.id=p_question_id and q.active=true
  limit 1;
  if v_question.id is null then return jsonb_build_object('status','NOT_AVAILABLE'); end if;
  if coalesce(v_question.response_type,'text') in ('drawing','manual') then
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
    when jsonb_typeof(v_route->'misconceptions')='array' and jsonb_array_length(v_route->'misconceptions')>0
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
$$;

revoke all on function public.student_adaptive_trigger_check_v1(text,uuid) from public;
revoke all on function public.student_adaptive_diagnostic_plan_v1(text,uuid) from public;
revoke all on function public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb) from public;
grant execute on function public.student_adaptive_trigger_check_v1(text,uuid) to anon, authenticated, postgres, service_role;
grant execute on function public.student_adaptive_diagnostic_plan_v1(text,uuid) to anon, authenticated, postgres, service_role;
grant execute on function public.student_adaptive_diagnostic_grade_v1(text,uuid,uuid,text,jsonb) to anon, authenticated, postgres, service_role;

commit;