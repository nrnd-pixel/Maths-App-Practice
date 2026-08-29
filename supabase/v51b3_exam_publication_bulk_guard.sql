-- V5.1B3 — atomic guarded bulk Exam Settings save.
-- Used by the existing V4.3D multi-paper controls after B3 takes ownership.

create or replace function public.save_exam_paper_settings_batch_v51b3(
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_count integer := 0;
  v_results jsonb := '[]'::jsonb;
  v_year_level integer;
  v_exam_year integer;
  v_paper text;
  v_duration integer;
  v_release text;
  v_available boolean;
  v_readiness jsonb;
  v_saved jsonb;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one exam paper';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'At most 50 exam papers can be saved at once';
  end if;

  -- Preflight every requested publication before any write.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_year_level := nullif(v_item->>'year_level','')::integer;
    v_exam_year := nullif(v_item->>'exam_year','')::integer;
    v_paper := trim(coalesce(v_item->>'paper',''));
    v_duration := nullif(v_item->>'duration_minutes','')::integer;
    v_release := coalesce(nullif(v_item->>'answer_release_rule',''),'after_manual_review');
    v_available := coalesce((v_item->>'is_available')::boolean,false);

    if v_available then
      v_readiness := public.exam_paper_readiness_v51b3(v_year_level,v_exam_year,v_paper);
      if coalesce((v_readiness->>'ready')::boolean,false) is not true then
        raise exception 'Exam paper % % is not ready for publication: %',
          v_exam_year,v_paper,coalesce(v_readiness->'reasons','[]'::jsonb);
      end if;
    end if;
  end loop;

  -- All preflight checks passed. The RPC is one transaction; any later error rolls back all rows.
  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_year_level := nullif(v_item->>'year_level','')::integer;
    v_exam_year := nullif(v_item->>'exam_year','')::integer;
    v_paper := trim(coalesce(v_item->>'paper',''));
    v_duration := nullif(v_item->>'duration_minutes','')::integer;
    v_release := coalesce(nullif(v_item->>'answer_release_rule',''),'after_manual_review');
    v_available := coalesce((v_item->>'is_available')::boolean,false);

    v_saved := public.save_exam_paper_setting_v51b3(
      v_year_level,v_exam_year,v_paper,v_duration,v_release,v_available
    );
    v_results := v_results || jsonb_build_array(v_saved);
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('saved_count',v_count,'items',v_results);
end;
$$;

revoke all on function public.save_exam_paper_settings_batch_v51b3(jsonb) from public, anon;
grant execute on function public.save_exam_paper_settings_batch_v51b3(jsonb) to authenticated;
