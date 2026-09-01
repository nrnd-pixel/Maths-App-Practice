-- V5.3D5.1 — Cleanup abandoned D5 question-metadata RPC
-- Production migration: v53d5_cleanup_abandoned_question_metadata_rpc
-- Accepted V5.3D5 is browser-only and uses V5.3D3 retrieval plus V5.3D4
-- recommendation context. This function came from a superseded duplicate D5
-- experiment and is intentionally removed to avoid unused exposed RPC surface.

drop function if exists public.get_student_practice_questions_v53d5(text,smallint);