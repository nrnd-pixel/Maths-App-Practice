-- V5.1B2D — database-enforced correction audit history.
-- Records meaningful UPDATE changes to public.questions. History is append-only from
-- the app's perspective and readable only through the teacher-only RPC below.

create table if not exists public.question_change_history (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  changed_at timestamptz not null default now(),
  changed_by uuid,
  changed_fields text[] not null,
  changes jsonb not null,
  question_identity jsonb not null default '{}'::jsonb,
  constraint question_change_history_has_fields check (cardinality(changed_fields) > 0),
  constraint question_change_history_changes_object check (jsonb_typeof(changes) = 'object')
);

create index if not exists question_change_history_question_time_idx
  on public.question_change_history(question_id, changed_at desc);

alter table public.question_change_history enable row level security;
revoke all on table public.question_change_history from anon, authenticated;

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

drop trigger if exists questions_change_history_v51b2d on public.questions;
create trigger questions_change_history_v51b2d
after update on public.questions
for each row execute function public.capture_question_change_history_v51b2d();

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
      'review_status', v_question.review_status
    ),
    'history', v_history
  );
end;
$function$;

revoke all on function public.get_question_change_history_v51b2d(uuid,integer) from public, anon;
grant execute on function public.get_question_change_history_v51b2d(uuid,integer) to authenticated;
