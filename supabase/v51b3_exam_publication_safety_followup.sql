-- V5.1B3 follow-up hardening.
-- Ensure deferred publication-integrity checks see final transaction state,
-- and give the V4.3D bulk editor one atomic guarded save RPC.

alter function public.exam_paper_readiness_v51b3(integer,integer,text) volatile;
alter function public.get_exam_paper_readiness_v51b3(integer,integer,text) volatile;

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
  v_results jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_result jsonb;
begin
  if not public.is_teacher() then
    raise exception 'Teacher access required';
  end if;
  if p_settings is null or jsonb_typeof(p_settings) <> 'array' then
    raise exception 'Settings payload must be an array';
  end if;

  v_count := jsonb_array_length(p_settings);
  if v_count < 1 or v_count > 50 then
    raise exception 'Select between 1 and 50 papers';
  end if;

  -- All calls execute in this one RPC transaction. If any item fails,
  -- PostgreSQL rolls back every earlier item in the same batch.
  for v_item in select value from jsonb_array_elements(p_settings)
  loop
    v_result := public.save_exam_paper_setting_v51b3(
      (v_item->>'year_level')::integer,
      (v_item->>'exam_year')::integer,
      v_item->>'paper',
      case when v_item->>'duration_minutes' is null or trim(v_item->>'duration_minutes') = '' then null
           else (v_item->>'duration_minutes')::integer end,
      coalesce(nullif(trim(v_item->>'answer_release_rule'),''),'after_manual_review'),
      coalesce((v_item->>'is_available')::boolean,false)
    );
    v_results := v_results || jsonb_build_array(v_result);
  end loop;

  return jsonb_build_object('count',v_count,'saved',v_results);
end;
$$;

revoke all on function public.save_exam_paper_settings_bulk_v51b3(jsonb) from public, anon;
grant execute on function public.save_exam_paper_settings_bulk_v51b3(jsonb) to authenticated;
