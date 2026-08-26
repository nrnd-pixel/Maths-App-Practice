-- V5.0RC2 privilege alignment.
-- PostgreSQL functions receive EXECUTE from PUBLIC by default. Remove that inherited
-- privilege for internal-only helpers so anon/authenticated cannot call them directly.

revoke all on function public.get_student_exam_access(text,smallint,smallint,text) from public, anon, authenticated;
revoke all on function public.apply_exam_roster_identity() from public, anon, authenticated;
revoke all on function public.exam_attempt_json(public.exam_attempts,boolean) from public, anon, authenticated;
revoke all on function public.sync_session_pending_review_count() from public, anon, authenticated;
revoke all on function public.make_result_code() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_exam_paper_settings_updated_at() from public, anon, authenticated;
