create or replace function public.adaptive_route_preview_v1(p_question_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with target as (
  select
    q.id as question_id,
    q.exam_year,
    q.paper,
    q.question_number,
    q.question_text,
    qsm.skill_id,
    cs.mastery_name,
    cs.year_level,
    cs.domain_code
  from public.questions q
  join public.question_skill_map qsm
    on qsm.question_id = q.id
   and qsm.mapping_role = 'PRIMARY'
   and qsm.active
  join public.curriculum_skills cs
    on cs.skill_id = qsm.skill_id
   and cs.active
  where q.id = p_question_id
  limit 1
),
secondary as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'skill_id', qsm.skill_id,
      'mastery_name', cs.mastery_name,
      'year_level', cs.year_level,
      'domain_code', cs.domain_code,
      'mapping_reason', qsm.mapping_reason,
      'mapping_confidence', qsm.mapping_confidence
    ) order by cs.year_level, qsm.skill_id
  ), '[]'::jsonb) as items
  from target t
  join public.question_skill_map qsm
    on qsm.question_id = t.question_id
   and qsm.mapping_role = 'SECONDARY'
   and qsm.active
  join public.curriculum_skills cs
    on cs.skill_id = qsm.skill_id
   and cs.active
),
mis as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'misconception_id', m.misconception_id,
      'evidence_status', m.evidence_status,
      'error_pattern', m.error_pattern,
      'diagnostic_message', m.diagnostic_message,
      'student_feedback', m.student_feedback,
      'hint_1', m.hint_1,
      'hint_2', m.hint_2,
      'scaffold_id', m.scaffold_id,
      'scaffold_name', s.name,
      'remediation_skill_id', m.remediation_skill_id,
      'diagnostic_probe_skill_id', m.diagnostic_probe_skill_id,
      'microcheck_count', m.microcheck_count,
      'success_threshold', m.success_threshold
    ) order by m.misconception_id
  ), '[]'::jsonb) as items
  from target t
  join public.misconceptions m
    on m.skill_id = t.skill_id
   and m.active
  left join public.scaffolds s
    on s.scaffold_id = m.scaffold_id
   and s.active
),
prereq_base as (
  select
    sr.from_skill_id as skill_id,
    cs.mastery_name,
    cs.year_level,
    cs.domain_code,
    sr.relationship_type,
    sr.strength,
    sr.reason
  from target t
  join public.skill_relationships sr
    on sr.to_skill_id = t.skill_id
   and sr.relationship_type in ('PREREQUISITE','EXTENDS')
  join public.curriculum_skills cs
    on cs.skill_id = sr.from_skill_id
   and cs.active
),
prereqs as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'skill_id', p.skill_id,
      'mastery_name', p.mastery_name,
      'year_level', p.year_level,
      'domain_code', p.domain_code,
      'relationship_type', p.relationship_type,
      'strength', p.strength,
      'reason', p.reason,
      'mapped_questions', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'question_id', q2.id,
            'exam_year', q2.exam_year,
            'paper', q2.paper,
            'question_number', q2.question_number,
            'question_text', q2.question_text,
            'mapping_confidence', qsm2.mapping_confidence
          ) order by q2.exam_year desc nulls last, q2.paper, q2.question_number
        )
        from public.question_skill_map qsm2
        join public.questions q2
          on q2.id = qsm2.question_id
         and q2.active
        where qsm2.skill_id = p.skill_id
          and qsm2.mapping_role = 'PRIMARY'
          and qsm2.active
      ), '[]'::jsonb)
    ) order by
      case p.relationship_type when 'PREREQUISITE' then 1 else 2 end,
      case p.strength when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end,
      p.year_level desc,
      p.skill_id
  ), '[]'::jsonb) as items
  from prereq_base p
),
assembled as (
  select
    t.*,
    coalesce((select items from secondary), '[]'::jsonb) as secondary_items,
    coalesce((select items from mis), '[]'::jsonb) as misconception_items,
    coalesce((select items from prereqs), '[]'::jsonb) as prerequisite_items
  from target t
)
select case
  when not exists (select 1 from target) then
    jsonb_build_object(
      'version', 'adaptive_route_preview_v1',
      'status', 'NO_PRIMARY_MAPPING',
      'question_id', p_question_id
    )
  else (
    select jsonb_build_object(
      'version', 'adaptive_route_preview_v1',
      'status', 'READY',
      'question', jsonb_build_object(
        'question_id', a.question_id,
        'exam_year', a.exam_year,
        'paper', a.paper,
        'question_number', a.question_number,
        'question_text', a.question_text
      ),
      'target_skill', jsonb_build_object(
        'skill_id', a.skill_id,
        'mastery_name', a.mastery_name,
        'year_level', a.year_level,
        'domain_code', a.domain_code
      ),
      'secondary_skills', a.secondary_items,
      'misconceptions', a.misconception_items,
      'direct_prerequisites', a.prerequisite_items,
      'recommended_route_type', case
        when jsonb_array_length(a.misconception_items) > 0 then 'MISCONCEPTION_DIAGNOSTIC'
        when exists (
          select 1
          from jsonb_array_elements(a.prerequisite_items) e
          where jsonb_array_length(coalesce(e->'mapped_questions','[]'::jsonb)) > 0
        ) then 'PREREQUISITE_CHECK'
        else 'TARGET_PRACTICE'
      end
    )
    from assembled a
  )
end;
$$;

comment on function public.adaptive_route_preview_v1(uuid) is
'Test-only, read-only adaptive routing preview. Uses question_skill_map, curriculum graph and misconception metadata; does not write student or question data.';

revoke all on function public.adaptive_route_preview_v1(uuid) from public;
revoke all on function public.adaptive_route_preview_v1(uuid) from anon;
revoke all on function public.adaptive_route_preview_v1(uuid) from authenticated;
grant execute on function public.adaptive_route_preview_v1(uuid) to service_role;