-- Math Practice V3.2B migration
-- Adds backward-compatible metadata for grouping multi-part questions.
-- Existing questions, responses and results are not deleted or rewritten.

alter table public.questions
  add column if not exists parent_question_number text,
  add column if not exists part_label text,
  add column if not exists part_order integer,
  add column if not exists group_prompt text;

comment on column public.questions.parent_question_number is
  'Display number shared by all parts of a multi-part question, e.g. 31 for 31(a) and 31(b).';
comment on column public.questions.part_label is
  'Part label without brackets, e.g. a or b.';
comment on column public.questions.part_order is
  'Display order of this part within its parent question.';
comment on column public.questions.group_prompt is
  'Optional shared stem/context shown once above all parts in a multi-part question.';

-- Automatically recognise existing question numbers such as 9(a), 9(b), 31(a), 31(b).
update public.questions
set
  parent_question_number = regexp_replace(question_number, '^([0-9]+)\([^)]*\)$', '\1'),
  part_label = regexp_replace(question_number, '^[0-9]+\(([^)]*)\)$', '\1')
where question_number ~ '^[0-9]+\([^)]*\)$'
  and (parent_question_number is null or part_label is null);

-- Give detected parts a stable order within the same exam/paper/parent.
with ranked as (
  select
    id,
    row_number() over (
      partition by coalesce(exam_year, 0), coalesce(paper, ''), parent_question_number
      order by lower(coalesce(part_label, '')), question_number, created_at, id
    ) as rn
  from public.questions
  where parent_question_number is not null
)
update public.questions q
set part_order = ranked.rn
from ranked
where q.id = ranked.id
  and q.part_order is null;

create index if not exists questions_multi_part_idx
  on public.questions (exam_year, paper, parent_question_number, part_order)
  where parent_question_number is not null;

-- Verification: the first result shows the new columns; the second shows detected parts.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'questions'
  and column_name in ('parent_question_number','part_label','part_order','group_prompt')
order by column_name;

select
  exam_year,
  paper,
  question_number,
  parent_question_number,
  part_label,
  part_order,
  left(question_text, 70) as question_preview
from public.questions
where parent_question_number is not null
order by exam_year nulls last, paper, parent_question_number, part_order;
