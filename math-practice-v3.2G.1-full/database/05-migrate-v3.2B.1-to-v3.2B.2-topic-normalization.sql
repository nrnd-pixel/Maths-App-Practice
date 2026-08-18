-- Math Practice V3.2B.2
-- Curriculum topic normalization
-- Safe to run more than once.
-- This migration only renames known topic aliases in public.questions.

update public.questions
set topic = case
  -- Number
  when strand = 'number' and lower(trim(topic)) in ('whole number','whole numbers') then 'Whole Numbers'
  when strand = 'number' and lower(trim(topic)) in (
    'fractions decimals & percentages',
    'fractions, decimals and percentages',
    'fractions decimals and percentages',
    'fractions, decimals & percentages'
  ) then 'Fractions, Decimals & Percentages'
  when strand = 'number' and lower(trim(topic)) in ('rate','rates','ratio','ratios','rates and ratio','rates & ratios','rates & ratio') then 'Rates & Ratio'
  when strand = 'number' and lower(trim(topic)) in ('powers and roots','power and roots','powers & roots') then 'Powers & Roots'

  -- Measurement
  when strand = 'measurement' and lower(trim(topic)) in ('capacity','volume','capacity and volume','capacity & volume') then 'Capacity & Volume'

  -- Statistics & Data
  when strand = 'statistics' and lower(trim(topic)) in ('average','averages','mean') then 'Averages'
  when strand = 'statistics' and lower(trim(topic)) in ('tally chart','tally charts','tallies','tables and tallies','tables & tallies') then 'Tables & Tallies'

  -- Mathematical Thinking & Problem Solving
  when strand = 'thinking' and lower(trim(topic)) in ('number pattern','number patterns','patterns and rules','patterns & rules') then 'Patterns & Rules'
  when strand = 'thinking' and lower(trim(topic)) in ('one-step word problems','one step word problems','one-step problems') then 'One-step Problems'
  when strand = 'thinking' and lower(trim(topic)) in ('multi-step word problems','multi step word problems','multi-step problems') then 'Multi-step Problems'

  else trim(topic)
end
where topic is not null;

-- Verification: review all distinct 2025 Paper 1 topic names after normalization.
select
  strand,
  topic,
  count(*) as question_records
from public.questions
where exam_year = 2025
  and lower(coalesce(paper,'')) = 'paper 1'
group by strand, topic
order by strand, topic;
