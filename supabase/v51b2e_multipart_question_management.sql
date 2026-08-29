-- V5.1B2E — Safe multipart question management.
-- Teacher-only RPC applies group-wide prompt changes or safe part-order normalization.

create or replace function public.manage_multipart_group_v51b2e(
  p_question_id uuid,
  p_action text,
  p_group_prompt text default null,
  p_confirm boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.questions;
  v_action text := lower(trim(coalesce(p_action,'')));
  v_parent text;
  v_prompt text := coalesce(p_group_prompt,'');
  v_count integer := 0;
  v_active integer := 0;
  v_review integer := 0;
  v_changed integer := 0;
  v_bad_labels integer := 0;
  v_distinct_labels integer := 0;
  v_min_expected integer := 0;
  v_max_expected integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;

  select q.* into v_q
  from public.questions q
  where q.id = p_question_id;

  if v_q.id is null then
    raise exception 'Question could not be found';
  end if;

  v_parent := nullif(trim(coalesce(v_q.parent_question_number,'')), '');
  if v_parent is null then
    raise exception 'Selected question is not part of a multipart group';
  end if;

  select
    count(*)::integer,
    count(*) filter (where q.active)::integer,
    count(*) filter (where q.review_status = 'needs_review')::integer
  into v_count, v_active, v_review
  from public.questions q
  where q.year_level is not distinct from v_q.year_level
    and q.exam_year is not distinct from v_q.exam_year
    and lower(trim(coalesce(q.paper,''))) = lower(trim(coalesce(v_q.paper,'')))
    and trim(coalesce(q.parent_question_number,'')) = v_parent;

  if v_count < 2 then
    raise exception 'Multipart group must contain at least two sibling rows';
  end if;

  if v_action not in ('set_group_prompt','normalize_part_order') then
    raise exception 'Unsupported multipart action';
  end if;

  if not coalesce(p_confirm,false) then
    return jsonb_build_object(
      'confirmed', false,
      'action', v_action,
      'question_id', v_q.id,
      'year_level', v_q.year_level,
      'exam_year', v_q.exam_year,
      'paper', v_q.paper,
      'parent_question_number', v_parent,
      'sibling_count', v_count,
      'active_rows', v_active,
      'needs_review_rows', v_review,
      'message', 'Confirmation is required before multipart fields are changed.'
    );
  end if;

  if v_action = 'set_group_prompt' then
    update public.questions q
    set group_prompt = v_prompt
    where q.year_level is not distinct from v_q.year_level
      and q.exam_year is not distinct from v_q.exam_year
      and lower(trim(coalesce(q.paper,''))) = lower(trim(coalesce(v_q.paper,'')))
      and trim(coalesce(q.parent_question_number,'')) = v_parent
      and coalesce(q.group_prompt,'') is distinct from v_prompt;

    get diagnostics v_changed = row_count;

    return jsonb_build_object(
      'updated', true,
      'action', v_action,
      'question_id', v_q.id,
      'year_level', v_q.year_level,
      'exam_year', v_q.exam_year,
      'paper', v_q.paper,
      'parent_question_number', v_parent,
      'sibling_count', v_count,
      'changed_rows', v_changed,
      'active_rows', v_active,
      'needs_review_rows', v_review,
      'group_prompt', v_prompt
    );
  end if;

  select
    count(*) filter (where nullif(trim(coalesce(q.part_label,'')),'') is null or trim(q.part_label) !~ '^[A-Za-z]$')::integer,
    count(distinct lower(trim(q.part_label)))::integer,
    coalesce(min(ascii(lower(trim(q.part_label))) - ascii('a') + 1),0)::integer,
    coalesce(max(ascii(lower(trim(q.part_label))) - ascii('a') + 1),0)::integer
  into v_bad_labels, v_distinct_labels, v_min_expected, v_max_expected
  from public.questions q
  where q.year_level is not distinct from v_q.year_level
    and q.exam_year is not distinct from v_q.exam_year
    and lower(trim(coalesce(q.paper,''))) = lower(trim(coalesce(v_q.paper,'')))
    and trim(coalesce(q.parent_question_number,'')) = v_parent;

  if v_bad_labels > 0
     or v_distinct_labels <> v_count
     or v_min_expected <> 1
     or v_max_expected <> v_count then
    raise exception 'Part order can only be normalized when labels are unique and contiguous from a';
  end if;

  update public.questions q
  set part_order = ascii(lower(trim(q.part_label))) - ascii('a') + 1
  where q.year_level is not distinct from v_q.year_level
    and q.exam_year is not distinct from v_q.exam_year
    and lower(trim(coalesce(q.paper,''))) = lower(trim(coalesce(v_q.paper,'')))
    and trim(coalesce(q.parent_question_number,'')) = v_parent
    and q.part_order is distinct from (ascii(lower(trim(q.part_label))) - ascii('a') + 1);

  get diagnostics v_changed = row_count;

  return jsonb_build_object(
    'updated', true,
    'action', v_action,
    'question_id', v_q.id,
    'year_level', v_q.year_level,
    'exam_year', v_q.exam_year,
    'paper', v_q.paper,
    'parent_question_number', v_parent,
    'sibling_count', v_count,
    'changed_rows', v_changed,
    'active_rows', v_active,
    'needs_review_rows', v_review
  );
end;
$$;

revoke all on function public.manage_multipart_group_v51b2e(uuid,text,text,boolean) from public;
revoke all on function public.manage_multipart_group_v51b2e(uuid,text,text,boolean) from anon;
grant execute on function public.manage_multipart_group_v51b2e(uuid,text,text,boolean) to authenticated;
