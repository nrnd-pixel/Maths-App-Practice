-- V5.4A follow-up — Practice eligibility is a logical-question property.
-- Selecting any row in a multipart group updates the full logical item together.

create or replace function public.save_question_practice_eligibility_v54a(
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
  v_rows integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select q.*
  into v_question
  from public.questions q
  where q.id = p_question_id
  limit 1;

  if v_question.id is null then
    raise exception 'Question could not be found';
  end if;

  v_logical_key := public.practice_logical_item_key_v53d1(
    v_question.id,
    v_question.parent_question_number,
    v_question.exam_year,
    v_question.paper,
    v_question.source_type,
    v_question.source
  );

  if v_target
     and v_question.source_type = 'topical_exercise'
     and exists (
       select 1
       from public.questions q
       where public.practice_logical_item_key_v53d1(
         q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
       ) = v_logical_key
         and coalesce(q.review_status,'none') <> 'reviewed'
     ) then
    raise exception 'All parts of a topical exercise question must be Reviewed before it can be added to Practice';
  end if;

  update public.questions q
  set practice_eligible = v_target,
      updated_at = now()
  where public.practice_logical_item_key_v53d1(
    q.id,q.parent_question_number,q.exam_year,q.paper,q.source_type,q.source
  ) = v_logical_key;
  get diagnostics v_rows = row_count;

  if v_rows < 1 then
    raise exception 'No question rows were updated';
  end if;

  return jsonb_build_object(
    'question_id',v_question.id,
    'logical_key',v_logical_key,
    'practice_eligible',v_target,
    'updated_rows',v_rows,
    'source_type',v_question.source_type,
    'active',v_question.active,
    'review_status',coalesce(v_question.review_status,'none')
  );
end;
$function$;

revoke all on function public.save_question_practice_eligibility_v54a(uuid,boolean) from public;
revoke all on function public.save_question_practice_eligibility_v54a(uuid,boolean) from anon;
grant execute on function public.save_question_practice_eligibility_v54a(uuid,boolean) to authenticated, service_role;
