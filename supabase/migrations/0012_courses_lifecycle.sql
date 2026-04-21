-- S4-1: Course lifecycle — add completed_at to support marking a course as finished.
--
-- A completed course:
--   • Is visually separated in the Courses list.
--   • Has its assignments excluded from the Today screen and the Plan generator.
--   • Can be reopened (completed_at reset to NULL) at any time.
--   • Can be fully deleted, which cascades to all DB rows and also removes the
--     associated Supabase Storage objects via the delete-course Edge Function.
--
-- Storage objects live under syllabi/{userId}/{courseId}/ and cannot be removed
-- by a plain DB trigger; the Edge Function handles that cleanup (DR-016).

alter table public.courses
  add column if not exists completed_at timestamptz;

-- Speeds up the "active courses only" filter used by Today and Plan screens.
create index if not exists idx_courses_completed_at
  on public.courses(user_id, completed_at)
  where completed_at is null;
