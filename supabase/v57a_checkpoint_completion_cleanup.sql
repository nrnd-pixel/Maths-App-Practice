-- V5.7A completion cleanup.
-- A successfully saved non-early Past Paper Practice session is authoritative
-- evidence that the unfinished checkpoint is no longer needed.

create or replace function public.clear_completed_past_paper_checkpoint_v57a()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.practice_mode = 'past_paper'
     and coalesce(new.ended_early,false) = false
     and new.roster_student_id is not null
     and new.exam_year is not null
     and nullif(trim(coalesce(new.paper,'')),'') is not null then
    delete from public.student_past_paper_checkpoints_v57a c
    where c.roster_student_id = new.roster_student_id
      and c.exam_year = new.exam_year
      and c.paper_key = lower(trim(new.paper));
  end if;
  return new;
end;
$$;

drop trigger if exists clear_completed_past_paper_checkpoint_v57a on public.practice_sessions;
create trigger clear_completed_past_paper_checkpoint_v57a
after insert or update of practice_mode, ended_early, roster_student_id, exam_year, paper
on public.practice_sessions
for each row
execute function public.clear_completed_past_paper_checkpoint_v57a();

revoke all on function public.clear_completed_past_paper_checkpoint_v57a() from public;
