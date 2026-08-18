-- Math Practice V3.1.2
-- Adds Supabase Storage for teacher-managed question images.
-- No changes are made to the existing questions/results tables.

-- Public bucket: students can display question images without signing in.
-- Upload/update/delete remain protected by Storage RLS policies below.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'question-images',
  'question-images',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Only authenticated users listed in public.teacher_profiles can manage images.
drop policy if exists "teachers can upload question images" on storage.objects;
create policy "teachers can upload question images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'question-images'
  and public.is_teacher()
);

drop policy if exists "teachers can update question images" on storage.objects;
create policy "teachers can update question images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'question-images'
  and public.is_teacher()
)
with check (
  bucket_id = 'question-images'
  and public.is_teacher()
);

drop policy if exists "teachers can delete question images" on storage.objects;
create policy "teachers can delete question images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'question-images'
  and public.is_teacher()
);
