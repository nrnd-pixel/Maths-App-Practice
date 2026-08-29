-- V5.1B3 — Exam Paper Publication Safety
-- Adds teacher-only readiness/save RPCs and database-enforced publication guards.
-- No existing question or exam-setting row is changed by this migration.

create or replace function public.exam_paper_readiness_v51b3(
  p_year_level integer,
  p_exam_year integer,
  p_paper text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_paper text := trim(coalesce(p_paper,''));
  v_paper_key text := regexp_replace(lower(trim(coalesce(p_paper,''))), '\s+', '', 'g');
  v_expected_logical integer;
  v_physical_rows integer := 0;
  v_logical_questions integer := 0;
  v_total_marks numeric := 0;
  v_metadata_blockers integer := 0;
  v_image_blockers integer := 0;
  v_review_blockers integer := 0;
  v_duplicate_groups integer := 0;
  v_ungrouped_multipart_rows integer := 0;
  v_multipart_blocker_groups integer := 0;
  v_setting_exists boolean := false;
  v_is_available boolean := false;
  v_ready boolean := false;
  v_reasons text[] := array[]::text[];
begin
  v_expected_logical := case
    when v_paper_key in ('paper1','p1','1') then 40
    when v_paper_key in ('paper2','p2','2') then 30
    else null
  end;

  with base as (
    select q.*,
      case
        when nullif(trim(q.parent_question_number),'') is not null then trim(q.parent_question_number)
        when trim(coalesce(q.question_number,'')) ~ '^[0-9]+' then substring(trim(q.question_number) from '^([0-9]+)')
        else trim(coalesce(q.question_number,''))
      end as logical_no
    from public.questions q
    where q.active = true
      and q.source_type = 'past_paper'
      and q.year_level = p_year_level
      and q.exam_year = p_exam_year
      and lower(trim(coalesce(q.paper,''))) = lower(v_paper)
  ),
  duplicate_groups as (
    select lower(trim(question_number)) as question_number
    from base
    where nullif(trim(coalesce(question_number,'')),'') is not null
    group by lower(trim(question_number))
    having count(*) > 1
  ),
  multipart_groups as (
    select trim(parent_question_number) as parent_question_number,
      count(*) as row_count,
      count(*) filter (where nullif(trim(coalesce(part_label,'')),'') is null) as missing_labels,
      count(*) filter (where part_order is null or part_order < 1) as invalid_orders,
      count(distinct lower(trim(coalesce(part_label,'')))) as distinct_labels,
      count(distinct part_order) as distinct_orders,
      min(part_order) as min_order,
      max(part_order) as max_order,
      count(distinct coalesce(trim(group_prompt),'')) as prompt_variants,
      count(*) filter (
        where nullif(trim(coalesce(part_label,'')),'') is not null
          and (
            trim(part_label) !~* '^[a-z]$'
            or part_order is null
            or ascii(lower(trim(part_label))) - 96 <> part_order
          )
      ) as label_order_mismatches,
      count(*) filter (
        where trim(coalesce(question_number,'')) ~* '^[0-9]+\s*(\([a-z]\)|[a-z])$'
          and regexp_replace(lower(trim(question_number)), '[0-9()[:space:]]', '', 'g') <> lower(trim(coalesce(part_label,'')))
      ) as question_label_mismatches
    from base
    where nullif(trim(coalesce(parent_question_number,'')),'') is not null
    group by trim(parent_question_number)
  )
  select
    (select count(*) from base),
    (select count(distinct nullif(logical_no,'')) from base),
    (select coalesce(sum(coalesce(marks,0)),0) from base),
    (select count(*) from base where
      nullif(trim(coalesce(question_number,'')),'') is null
      or nullif(trim(coalesce(strand,'')),'') is null
      or nullif(trim(coalesce(topic,'')),'') is null
      or nullif(trim(coalesce(skill,'')),'') is null
      or nullif(trim(coalesce(question_text,'')),'') is null
      or marks is null or marks <= 0
      or (lower(coalesce(response_type,'text')) not in ('drawing','manual') and nullif(trim(coalesce(answer,'')),'') is null)
    ),
    (select count(*) from base where
      nullif(trim(coalesce(image_url,'')),'') is not null
      and image_url !~* '^https://'
      and image_url !~* '^/?images/'
    ),
    (select count(*) from base where review_status = 'needs_review'),
    (select count(*) from duplicate_groups),
    (select count(*) from base where
      nullif(trim(coalesce(parent_question_number,'')),'') is null
      and trim(coalesce(question_number,'')) ~* '^[0-9]+\s*(\([a-z]\)|[a-z])$'
    ),
    (select count(*) from multipart_groups where
      row_count < 2
      or missing_labels > 0
      or invalid_orders > 0
      or distinct_labels <> row_count
      or distinct_orders <> row_count
      or min_order <> 1
      or max_order <> row_count
      or prompt_variants > 1
      or label_order_mismatches > 0
      or question_label_mismatches > 0
    )
  into
    v_physical_rows,
    v_logical_questions,
    v_total_marks,
    v_metadata_blockers,
    v_image_blockers,
    v_review_blockers,
    v_duplicate_groups,
    v_ungrouped_multipart_rows,
    v_multipart_blocker_groups;

  select exists(
    select 1 from public.exam_paper_settings s
    where s.year_level = p_year_level
      and s.exam_year = p_exam_year
      and lower(trim(s.paper)) = lower(v_paper)
  ), coalesce((
    select s.is_available from public.exam_paper_settings s
    where s.year_level = p_year_level
      and s.exam_year = p_exam_year
      and lower(trim(s.paper)) = lower(v_paper)
    order by s.created_at
    limit 1
  ),false)
  into v_setting_exists, v_is_available;

  if v_expected_logical is null then
    v_reasons := array_append(v_reasons,'Unsupported paper profile');
  end if;
  if v_physical_rows = 0 then
    v_reasons := array_append(v_reasons,'No active past-paper rows');
  end if;
  if v_expected_logical is not null and v_logical_questions <> v_expected_logical then
    v_reasons := array_append(v_reasons,format('%s/%s logical questions',v_logical_questions,v_expected_logical));
  end if;
  if v_total_marks <> 90 then
    v_reasons := array_append(v_reasons,format('%s/90 marks',v_total_marks));
  end if;
  if v_metadata_blockers > 0 then
    v_reasons := array_append(v_reasons,format('%s metadata blocker(s)',v_metadata_blockers));
  end if;
  if v_image_blockers > 0 then
    v_reasons := array_append(v_reasons,format('%s image blocker(s)',v_image_blockers));
  end if;
  if v_duplicate_groups > 0 then
    v_reasons := array_append(v_reasons,format('%s duplicate identifier group(s)',v_duplicate_groups));
  end if;
  if v_ungrouped_multipart_rows > 0 then
    v_reasons := array_append(v_reasons,format('%s ungrouped multipart row(s)',v_ungrouped_multipart_rows));
  end if;
  if v_multipart_blocker_groups > 0 then
    v_reasons := array_append(v_reasons,format('%s multipart blocker group(s)',v_multipart_blocker_groups));
  end if;
  if v_review_blockers > 0 then
    v_reasons := array_append(v_reasons,format('%s unresolved review row(s)',v_review_blockers));
  end if;

  v_ready := v_expected_logical is not null
    and v_physical_rows > 0
    and v_logical_questions = v_expected_logical
    and v_total_marks = 90
    and v_metadata_blockers = 0
    and v_image_blockers = 0
    and v_review_blockers = 0
    and v_duplicate_groups = 0
    and v_ungrouped_multipart_rows = 0
    and v_multipart_blocker_groups = 0;

  return jsonb_build_object(
    'year_level',p_year_level,
    'exam_year',p_exam_year,
    'paper',v_paper,
    'physical_rows',v_physical_rows,
    'logical_questions',v_logical_questions,
    'expected_logical_questions',v_expected_logical,
    'total_marks',v_total_marks,
    'expected_marks',90,
    'metadata_blockers',v_metadata_blockers,
    'image_blockers',v_image_blockers,
    'review_blockers',v_review_blockers,
    'duplicate_groups',v_duplicate_groups,
    'ungrouped_multipart_rows',v_ungrouped_multipart_rows,
    'multipart_blocker_groups',v_multipart_blocker_groups,
    'setting_exists',v_setting_exists,
    'is_available',v_is_available,
    'ready',v_ready,
    'reasons',to_jsonb(v_reasons)
  );
end;
$$;

revoke all on function public.exam_paper_readiness_v51b3(integer,integer,text) from public, anon, authenticated;

create or replace function public.get_exam_paper_readiness_v51b3(
  p_year_level integer,
  p_exam_year integer,
  p_paper text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;
  return public.exam_paper_readiness_v51b3(p_year_level,p_exam_year,p_paper);
end;
$$;

revoke all on function public.get_exam_paper_readiness_v51b3(integer,integer,text) from public, anon;
grant execute on function public.get_exam_paper_readiness_v51b3(integer,integer,text) to authenticated;

create or replace function public.guard_exam_paper_publication_v51b3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_readiness jsonb;
  v_guarded boolean := coalesce(current_setting('app.v51b3_guarded_save',true),'') = '1';
  v_publish_transition boolean;
begin
  v_publish_transition := new.is_available = true and (
    tg_op = 'INSERT'
    or old.is_available is distinct from true
    or old.year_level is distinct from new.year_level
    or old.exam_year is distinct from new.exam_year
    or lower(trim(old.paper)) is distinct from lower(trim(new.paper))
  );

  if new.is_available = true then
    if v_publish_transition and not v_guarded then
      raise exception 'Use the guarded Exam Settings editor to publish a paper';
    end if;
    v_readiness := public.exam_paper_readiness_v51b3(new.year_level,new.exam_year,new.paper);
    if coalesce((v_readiness->>'ready')::boolean,false) is not true then
      raise exception 'Exam paper is not ready for publication: %',coalesce(v_readiness->'reasons','[]'::jsonb);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_exam_paper_publication_v51b3() from public, anon, authenticated;

drop trigger if exists exam_paper_settings_publication_guard_v51b3 on public.exam_paper_settings;
create trigger exam_paper_settings_publication_guard_v51b3
before insert or update on public.exam_paper_settings
for each row execute function public.guard_exam_paper_publication_v51b3();

create or replace function public.save_exam_paper_setting_v51b3(
  p_year_level integer,
  p_exam_year integer,
  p_paper text,
  p_duration_minutes integer,
  p_answer_release_rule text,
  p_is_available boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paper text := trim(coalesce(p_paper,''));
  v_readiness jsonb;
  v_saved public.exam_paper_settings%rowtype;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;
  if p_year_level < 1 or p_year_level > 13 then
    raise exception 'Invalid year level';
  end if;
  if p_exam_year < 2000 or p_exam_year > 2100 then
    raise exception 'Invalid exam year';
  end if;
  if v_paper = '' then
    raise exception 'Paper is required';
  end if;
  if p_duration_minutes is not null and (p_duration_minutes < 1 or p_duration_minutes > 600) then
    raise exception 'Duration must be between 1 and 600 minutes';
  end if;
  if p_answer_release_rule not in ('immediate','after_manual_review','never') then
    raise exception 'Invalid answer release rule';
  end if;
  if not exists (
    select 1 from public.questions q
    where q.year_level = p_year_level
      and q.exam_year = p_exam_year
      and lower(trim(coalesce(q.paper,''))) = lower(v_paper)
  ) then
    raise exception 'No matching exam paper exists in the question bank';
  end if;

  v_readiness := public.exam_paper_readiness_v51b3(p_year_level,p_exam_year,v_paper);
  if p_is_available and coalesce((v_readiness->>'ready')::boolean,false) is not true then
    raise exception 'Exam paper is not ready for publication: %',coalesce(v_readiness->'reasons','[]'::jsonb);
  end if;

  perform set_config('app.v51b3_guarded_save','1',true);

  insert into public.exam_paper_settings(
    year_level,exam_year,paper,duration_minutes,answer_release_rule,is_available
  ) values (
    p_year_level,p_exam_year,v_paper,p_duration_minutes,p_answer_release_rule,p_is_available
  )
  on conflict (year_level,exam_year,paper) do update set
    duration_minutes = excluded.duration_minutes,
    answer_release_rule = excluded.answer_release_rule,
    is_available = excluded.is_available,
    updated_at = now()
  returning * into v_saved;

  return jsonb_build_object(
    'id',v_saved.id,
    'year_level',v_saved.year_level,
    'exam_year',v_saved.exam_year,
    'paper',v_saved.paper,
    'duration_minutes',v_saved.duration_minutes,
    'answer_release_rule',v_saved.answer_release_rule,
    'is_available',v_saved.is_available,
    'readiness',public.exam_paper_readiness_v51b3(v_saved.year_level,v_saved.exam_year,v_saved.paper)
  );
end;
$$;

revoke all on function public.save_exam_paper_setting_v51b3(integer,integer,text,integer,text,boolean) from public, anon;
grant execute on function public.save_exam_paper_setting_v51b3(integer,integer,text,integer,text,boolean) to authenticated;

create or replace function public.assert_published_exam_ready_v51b3(
  p_year_level integer,
  p_exam_year integer,
  p_paper text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_readiness jsonb;
begin
  if p_year_level is null or p_exam_year is null or nullif(trim(coalesce(p_paper,'')),'') is null then
    return;
  end if;
  if not exists (
    select 1 from public.exam_paper_settings s
    where s.year_level = p_year_level
      and s.exam_year = p_exam_year
      and lower(trim(s.paper)) = lower(trim(p_paper))
      and s.is_available = true
  ) then
    return;
  end if;

  v_readiness := public.exam_paper_readiness_v51b3(p_year_level,p_exam_year,p_paper);
  if coalesce((v_readiness->>'ready')::boolean,false) is not true then
    raise exception 'Published exam paper % % is no longer ready. Unpublish it before making this question-bank change. Reasons: %',
      p_exam_year,trim(p_paper),coalesce(v_readiness->'reasons','[]'::jsonb);
  end if;
end;
$$;

revoke all on function public.assert_published_exam_ready_v51b3(integer,integer,text) from public, anon, authenticated;

create or replace function public.protect_published_exam_questions_v51b3()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_relevant boolean := false;
  v_new_relevant boolean := false;
begin
  if tg_op <> 'INSERT' then
    v_old_relevant := old.source_type = 'past_paper'
      and old.exam_year is not null
      and nullif(trim(coalesce(old.paper,'')),'') is not null;
  end if;
  if tg_op <> 'DELETE' then
    v_new_relevant := new.source_type = 'past_paper'
      and new.exam_year is not null
      and nullif(trim(coalesce(new.paper,'')),'') is not null;
  end if;

  if v_old_relevant then
    perform public.assert_published_exam_ready_v51b3(old.year_level,old.exam_year,old.paper);
  end if;

  if v_new_relevant and (
    not v_old_relevant
    or old.year_level is distinct from new.year_level
    or old.exam_year is distinct from new.exam_year
    or lower(trim(old.paper)) is distinct from lower(trim(new.paper))
  ) then
    perform public.assert_published_exam_ready_v51b3(new.year_level,new.exam_year,new.paper);
  end if;

  return null;
end;
$$;

revoke all on function public.protect_published_exam_questions_v51b3() from public, anon, authenticated;

drop trigger if exists questions_published_exam_integrity_v51b3 on public.questions;
create constraint trigger questions_published_exam_integrity_v51b3
after insert or update or delete on public.questions
deferrable initially deferred
for each row execute function public.protect_published_exam_questions_v51b3();
