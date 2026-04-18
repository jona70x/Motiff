-- 0005_syllabus_candidates.sql
-- Stores AI-extracted deadline candidates for a given syllabus upload.

create type public.candidate_status
  as enum ('pending', 'confirmed', 'edited', 'rejected');

-- Confidence bands computed from the raw 0-1 score returned by the model.
create type public.confidence_band
  as enum ('low', 'medium', 'high');

create table if not exists public.syllabus_candidates (
  id             uuid primary key default gen_random_uuid(),
  upload_id      uuid not null references public.syllabus_uploads(id) on delete cascade,
  user_id        uuid not null references public.profiles(id)         on delete cascade,
  course_id      uuid not null references public.courses(id)          on delete cascade,

  -- Fields extracted by the model
  title          text not null,
  due_at         timestamptz,
  kind           text,
  confidence     numeric(4, 3) not null check (confidence >= 0 and confidence <= 1),
  confidence_band public.confidence_band not null,
  source_anchor  text,

  -- Lifecycle
  status         public.candidate_status not null default 'pending',

  -- If status = confirmed/edited, the resulting assignment id
  assignment_id  uuid references public.assignments(id) on delete set null,

  created_at     timestamptz not null default now()
);

alter table public.syllabus_candidates enable row level security;

drop policy if exists "candidates_select_own" on public.syllabus_candidates;
create policy "candidates_select_own"
  on public.syllabus_candidates for select
  using (auth.uid() = user_id);

drop policy if exists "candidates_insert_own" on public.syllabus_candidates;
create policy "candidates_insert_own"
  on public.syllabus_candidates for insert
  with check (auth.uid() = user_id);

drop policy if exists "candidates_update_own" on public.syllabus_candidates;
create policy "candidates_update_own"
  on public.syllabus_candidates for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "candidates_delete_own" on public.syllabus_candidates;
create policy "candidates_delete_own"
  on public.syllabus_candidates for delete
  using (auth.uid() = user_id);

create index if not exists candidates_upload_id_idx
  on public.syllabus_candidates (upload_id);
create index if not exists candidates_user_id_idx
  on public.syllabus_candidates (user_id);
