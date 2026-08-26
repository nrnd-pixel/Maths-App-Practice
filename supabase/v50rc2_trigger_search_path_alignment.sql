-- V5.0RC2 trigger-helper search-path hardening.
-- These helpers only touch NEW.updated_at, so an empty search_path is behavior-neutral.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.set_exam_paper_settings_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Keep trigger helpers internal-only after replacement.
revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.set_exam_paper_settings_updated_at() from public, anon, authenticated;
