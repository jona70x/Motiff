-- 0004_syllabus_uploads.sql
-- Storage bucket + syllabus_uploads table with full RLS.
-- Storage object cleanup is handled client-side in deleteUpload (uploads.ts).

-- ─── Storage bucket ──────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'syllabi',
  'syllabi',
  false,
  10485760,                          -- 10 MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- Only the file owner may read their own objects.
drop policy if exists "syllabi_select_own" on storage.objects;
create policy "syllabi_select_own"
  on storage.objects for select
  using (
    bucket_id = 'syllabi'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only the file owner may insert objects under their own prefix (uid/...).
drop policy if exists "syllabi_insert_own" on storage.objects;
create policy "syllabi_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'syllabi'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only the file owner may delete their own objects.
drop policy if exists "syllabi_delete_own" on storage.objects;
create policy "syllabi_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'syllabi'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── syllabus_uploads table ───────────────────────────────────────────────────

do $$ begin
  create type public.syllabus_upload_status
    as enum ('pending', 'extracting', 'extracted', 'failed', 'unsupported');
exception when duplicate_object then null;
end $$;

create table if not exists public.syllabus_uploads (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.courses(id)  on delete cascade,
  storage_path text not null,
  mime_type    text not null,
  byte_size    integer not null check (byte_size > 0),
  status       public.syllabus_upload_status not null default 'pending',
  raw_text     text,
  error_msg    text,
  created_at   timestamptz not null default now()
);

alter table public.syllabus_uploads enable row level security;

drop policy if exists "uploads_select_own" on public.syllabus_uploads;
create policy "uploads_select_own"
  on public.syllabus_uploads for select
  using (auth.uid() = user_id);

drop policy if exists "uploads_insert_own" on public.syllabus_uploads;
create policy "uploads_insert_own"
  on public.syllabus_uploads for insert
  with check (auth.uid() = user_id);

drop policy if exists "uploads_update_own" on public.syllabus_uploads;
create policy "uploads_update_own"
  on public.syllabus_uploads for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "uploads_delete_own" on public.syllabus_uploads;
create policy "uploads_delete_own"
  on public.syllabus_uploads for delete
  using (auth.uid() = user_id);

-- ─── Index ────────────────────────────────────────────────────────────────────

create index if not exists syllabus_uploads_course_id_idx
  on public.syllabus_uploads (course_id);
