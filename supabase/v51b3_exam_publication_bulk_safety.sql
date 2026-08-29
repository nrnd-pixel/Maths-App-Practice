-- V5.1B3 — Atomic guarded bulk Exam Settings save.
-- Extends the publication-safety migration without changing existing rows.

create or replace function public.save_exam_paper_settings_bulk_v51b3(
  p_settings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_year_level integer;
  v_exam_year integer;
  v_paper text;
  v_duration integer;
  v_release text;
  v_available boolean;
  v_readiness jsonb;
  v_seen_keys text[] := array[]::text[];
  v_key text;
  v_count integer := 0;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'array' then
    raise exception 'Settings payload must be an array';
  end if;
  if jsonb_array_length(p_settings) > 50 then
    raise exception 'At most 50 paper settings can be saved at once';
  end if;
  if jsonb_array_length(p_settings) = 0 then
    return jsonb_build_object('saved_count',0);
  end if;

  -- Pass 1: validate the entire batch before any write.
  for v_item in select value from jsonb_array_elements(p_settings)
  loop
    v_year_level := nullif(v_item->>'year_level','')::integer;
    v_exam_year := nullif(v_item->>'exam_year','')::integer;
    v_paper := trim(coalesce(v_item->>'paper',''));
    v_duration := case
      when not (v_item ? 'duration_minutes') or jsonb_typeof(v_item->'duration_minutes') = 'null' then null
      else nullif(v_item->>'duration_minutes','')::integer
    end;
    v_release := trim(coalesce(v_item->>'answer_release_rule',''));
    v_available := coalesce((v_item->>'is_available')::boolean,false);

    if v_year_level is null or v_year_level < 1 or v_year_level > 13 then
      raise exception 'Invalid year level in bulk Exam Settings';
    end if;
    if v_exam_year is null or v_exam_year < 2000 or v_exam_year > 2100 then
      raise exception 'Invalid exam year in bulk Exam Settings';
    end if;
    if v_paper = '' then
      raise exception 'Paper is required in bulk Exam Settings';
    end if;
    if v_duration is not null and (v_duration < 1 or v_duration > 600) then
      raise exception '% %: duration must be between 1 and 600 minutes',v_exam_year,v_paper;
    end if;
    if v_release not in ('immediate','after_manual_review','never') then
      raise exception '% %: invalid answer release rule',v_exam_year,v_paper;
    end if;

    v_key := v_year_level::text || '|' || v_exam_year::text || '|' || lower(v_paper);
    if v_key = any(v_seen_keys) then
      raise exception 'Duplicate paper in bulk Exam Settings: % %',v_exam_year,v_paper;
    end if;
    v_seen_keys := array_append(v_seen_keys,v_key);

    if not exists (
      select 1 from public.questions q
      where q.year_level = v_year_level
        and q.exam_year = v_exam_year
        and lower(trim(coalesce(q.paper,''))) = lower(v_paper)
    ) then
      raise exception 'No matching question-bank paper: % %',v_exam_year,v_paper;
    end if;

    if v_available then
      v_readiness := public.exam_paper_readiness_v51b3(v_year_level,v_exam_year,v_paper);
      if coalesce((v_readiness->>'ready')::boolean,false) is not true then
        raise exception '% % is not ready for publication: %',
          v_exam_year,v_paper,coalesce(v_readiness->'reasons','[]'::jsonb);
      end if;
    end if;
  end loop;

  -- Pass 2: one transaction, guarded publication context.
  perform set_config('app.v51b3_guarded_save','1',true);

  for v_item in select value from jsonb_array_elements(p_settings)
  loop
    v_year_level := (v_item->>'year_level')::integer;
    v_exam_year := (v_item->>'exam_year')::integer;
    v_paper := trim(v_item->>'paper');
    v_duration := case
      when not (v_item ? 'duration_minutes') or jsonb_typeof(v_item->'duration_minutes') = 'null' then null
      else nullif(v_item->>'duration_minutes','')::integer
    end;
    v_release := trim(v_item->>'answer_release_rule');
    v_available := coalesce((v_item->>'is_available')::boolean,false);

    insert into public.exam_paper_settings(
      year_level,exam_year,paper,duration_minutes,answer_release_rule,is_available
    ) values (
      v_year_level,v_exam_year,v_paper,v_duration,v_release,v_available
    )
    on conflict (year_level,exam_year,paper) do update set
      duration_minutes = excluded.duration_minutes,
      answer_release_rule = excluded.answer_release_rule,
      is_available = excluded.is_available,
      updated_at = now();

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('saved_count',v_count);
end;
$$;

revoke all on function public.save_exam_paper_settings_bulk_v51b3(jsonb) from public, anon;
grant execute on function public.save_exam_paper_settings_bulk_v51b3(jsonb) to authenticated;
