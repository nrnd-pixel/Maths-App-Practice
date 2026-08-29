-- V5.1B3 cleanup after interrupted development.
-- Keep save_exam_paper_settings_bulk_v51b3(jsonb) as the single canonical bulk RPC.

drop function if exists public.save_exam_paper_settings_batch_v51b3(jsonb);
