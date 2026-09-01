-- Applied to production on 2026-09-01 as migration
-- v53d5_cleanup_reintroduced_question_metadata_rpc_20260901.
--
-- The accepted V5.3D5 implementation is browser-only and reuses the accepted
-- V5.3D3 question-history retrieval plus V5.3D4 recommendation context.
-- This cleanup removes the abandoned experimental D5 question-metadata RPC if
-- it is ever reintroduced by stale/superseded work.

DROP FUNCTION IF EXISTS public.get_student_practice_questions_v53d5(text, smallint);