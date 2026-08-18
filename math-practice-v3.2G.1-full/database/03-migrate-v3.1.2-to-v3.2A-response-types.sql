-- Math Practice Webapp
-- V3.1.2 -> V3.2A migration
-- Adds a backward-compatible response-type engine to public.questions.
-- Safe to run on the existing V3.1.2 database.

begin;

alter table public.questions
  add column if not exists response_type text;

alter table public.questions
  add column if not exists response_config jsonb not null default '{}'::jsonb;

-- Keep existing questions backward compatible: NULL response_type is treated as "text" by V3.2A.
-- New/edited questions may use one of the supported response types below.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'questions_response_type_check'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_response_type_check
      check (
        response_type is null
        or response_type in (
          'text',
          'number',
          'number_unit',
          'fraction',
          'multi_blank',
          'multiple_choice',
          'multi_select',
          'drawing',
          'manual'
        )
      );
  end if;
end $$;

comment on column public.questions.response_type is
  'V3.2 answer input type. NULL remains compatible with legacy text-answer questions.';

comment on column public.questions.response_config is
  'JSON configuration for the selected response_type, e.g. unit choices, blanks, or answer options.';

commit;

-- Optional verification query:
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'questions'
  and column_name in ('response_type', 'response_config')
order by column_name;
