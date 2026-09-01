-- V5.4B — Teacher Practice eligibility controls
-- Applied to production as migration:
-- 20260901063600 v54b_teacher_practice_eligibility_controls
--
-- Adds a teacher-only, group-safe write contract for Question Bank Practice eligibility.
-- Topical resources remain whole-set managed through V5.3A; legacy active is untouched.

comment on column public.questions.practice_eligible is
  'Teacher-controlled eligibility for the unified ordinary Practice resource bank. Independent of source provenance and the legacy active flag.';

create or replace function public.save_question_practice_eligibility_v54b(
  p_question_id uuid,
  p_eligible boolean
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_question public.questions;
  v_target boolean := coalesce(p_eligible,false);
  v_logical_key text;
  v_logical_rows integer := 0;
  v_updated_rows integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select q.*
  into v_question
  from public.questions q
  where q.id = p_question_id;

  if v_question.id is null then
    raise exception 'Question could not be found';
  end if;

  if lower(trim(coalesce(v_question.source_type,''))) = 'topical_exercise' then
    raise exception 'Topical Practice eligibility is managed for the whole resource set. Use the Topical Exercise Resource Library.';
  end if;

  v_logical_key := public.practice_logical_item_key_v53d1(
    v_question.id,
    v_question.parent_question_number,
    v_question.exam_year,
    v_question.paper,
    v_question.source_type,
    v_question.source
  );

  select count(*)::integer
  into v_logical_rows
  from public.questions q
  where q.year_level = v_question.year_level
    and lower(trim(coalesce(q.source_type,''))) <> 'topical_exercise'
    and public.practice_logical_item_key_v53d1(
      q.id,
      q.parent_question_number,
      q.exam_year,
      q.paper,
      q.source_type,
      q.source
    ) = v_logical_key;

  if coalesce(v_logical_rows,0) < 1 then
    raise exception 'Practice logical question could not be resolved';
  end if;

  update public.questions q
  set practice_eligible = v_target,
      updated_at = now()
  where q.year_level = v_question.year_level
    and lower(trim(coalesce(q.source_type,''))) <> 'topical_exercise'
    and public.practice_logical_item_key_v53d1(
      q.id,
      q.parent_question_number,
      q.exam_year,
      q.paper,
      q.source_type,
      q.source
    ) = v_logical_key
    and q.practice_eligible is distinct from v_target;

  get diagnostics v_updated_rows = row_count;

  return jsonb_build_object(
    'question_id',v_question.id,
    'year_level',v_question.year_level,
    'source_type',v_question.source_type,
    'source',v_question.source,
    'question_number',v_question.question_number,
    'parent_question_number',v_question.parent_question_number,
    'logical_key',v_logical_key,
    'logical_group',(nullif(trim(coalesce(v_question.parent_question_number,'')),'') is not null),
    'logical_rows',v_logical_rows,
    'eligible',v_target,
    'updated_rows',v_updated_rows,
    'active_unchanged',true
  );
end;
$function$;

revoke all on function public.save_question_practice_eligibility_v54b(uuid,boolean) from public;
revoke all on function public.save_question_practice_eligibility_v54b(uuid,boolean) from anon;
grant execute on function public.save_question_practice_eligibility_v54b(uuid,boolean) to authenticated, service_role;

comment on function public.save_question_practice_eligibility_v54b(uuid,boolean) is
  'V5.4B teacher-only Practice eligibility writer. Rejects topical per-question writes and updates every physical row of a non-topical logical multipart question together without changing active.';

-- Extend the existing append-only Question Change History audit so teacher
-- Practice-eligibility changes are captured like other meaningful question updates.
create or replace function public.capture_question_change_history_v51b2d()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_fields constant text[] := array[
    'year_level','strand','topic','subtopic','skill','difficulty','marks',
    'exam_year','paper','question_number','source_type','source','question_text',
    'answer','accepted_answers','hint','explanation','image_url','active',
    'practice_eligible',
    'response_type','response_config','parent_question_number','part_label',
    'part_order','group_prompt','review_status','review_note'
  ];
  v_field text;
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_changes jsonb := '{}'::jsonb;
  v_changed_fields text[] := '{}'::text[];
begin
  foreach v_field in array v_fields loop
    if (v_old -> v_field) is distinct from (v_new -> v_field) then
      v_changed_fields := array_append(v_changed_fields, v_field);
      v_changes := v_changes || jsonb_build_object(
        v_field,
        jsonb_build_object('old', v_old -> v_field, 'new', v_new -> v_field)
      );
    end if;
  end loop;

  if cardinality(v_changed_fields) > 0 then
    insert into public.question_change_history(
      question_id, changed_by, changed_fields, changes, question_identity
    ) values (
      new.id,
      auth.uid(),
      v_changed_fields,
      v_changes,
      jsonb_build_object(
        'year_level', new.year_level,
        'exam_year', new.exam_year,
        'paper', new.paper,
        'question_number', new.question_number,
        'parent_question_number', new.parent_question_number,
        'part_label', new.part_label,
        'question_text', new.question_text
      )
    );
  end if;

  return new;
end;
$function$;

revoke all on function public.capture_question_change_history_v51b2d() from public, anon, authenticated;

create or replace function public.get_question_change_history_v51b2d(
  p_question_id uuid,
  p_limit integer default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit,50), 100));
  v_question public.questions;
  v_history jsonb := '[]'::jsonb;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select * into v_question
  from public.questions q
  where q.id = p_question_id;

  if v_question.id is null then
    raise exception 'Question not found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'question_id', h.question_id,
    'changed_at', h.changed_at,
    'changed_by', h.changed_by,
    'changed_fields', h.changed_fields,
    'changes', h.changes,
    'question_identity', h.question_identity
  ) order by h.changed_at desc, h.id desc), '[]'::jsonb)
  into v_history
  from (
    select *
    from public.question_change_history qh
    where qh.question_id = p_question_id
    order by qh.changed_at desc, qh.id desc
    limit v_limit
  ) h;

  return jsonb_build_object(
    'question', jsonb_build_object(
      'id', v_question.id,
      'year_level', v_question.year_level,
      'exam_year', v_question.exam_year,
      'paper', v_question.paper,
      'question_number', v_question.question_number,
      'parent_question_number', v_question.parent_question_number,
      'part_label', v_question.part_label,
      'question_text', v_question.question_text,
      'active', v_question.active,
      'practice_eligible', v_question.practice_eligible,
      'review_status', v_question.review_status
    ),
    'history', v_history
  );
end;
$function$;

revoke all on function public.get_question_change_history_v51b2d(uuid,integer) from public, anon;
grant execute on function public.get_question_change_history_v51b2d(uuid,integer) to authenticated;
