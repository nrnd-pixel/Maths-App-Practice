-- Maths Practice V5.0D1 — reset-log RLS performance tuning
-- Evaluate auth.uid() once per statement rather than once per candidate row.

drop policy if exists "teachers read own launch reset log" on public.student_launch_reset_log;
create policy "teachers read own launch reset log"
on public.student_launch_reset_log
for select
to authenticated
using (public.is_teacher() and executed_by = (select auth.uid()));
