-- Production migration: 20260831123744 v53d5_cleanup_reintroduced_duplicate_question_rpc
-- Restores the accepted browser-only V5.3D5 architecture after a stale-branch
-- investigation briefly recreated an unused experimental retrieval RPC.

drop function if exists public.get_student_practice_questions_v53d5(text,smallint);
