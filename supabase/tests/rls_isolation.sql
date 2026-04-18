-- rls_isolation.sql
-- Test that RLS prevents cross-user data access.
-- Usage: psql -d <db> -f rls_isolation.sql

-- Create two test users (manually add to auth.users and profiles via Supabase dashboard or API).
-- Then run as each user to verify isolation.

-- Test data setup: assume user A (a1111111-1111-1111-1111-111111111111) and
-- user B (b2222222-2222-2222-2222-222222222222) exist.

-- For user A session:
-- Should succeed: insert own course
insert into public.courses (user_id, title, term)
values ('a1111111-1111-1111-1111-111111111111', 'Math 101', 'Fall 2025');

-- Should succeed: select own courses
select * from public.courses where user_id = 'a1111111-1111-1111-1111-111111111111';

-- Should fail: try to insert as another user (RLS blocks)
-- This should return 0 rows or error if checked properly.
insert into public.courses (user_id, title, term)
values ('b2222222-2222-2222-2222-222222222222', 'Physics 101', 'Fall 2025');

-- For user B session:
-- Should fail: select user A's courses (RLS blocks)
select * from public.courses where user_id = 'a1111111-1111-1111-1111-111111111111';

-- Should succeed: select own courses (empty)
select * from public.courses where user_id = 'b2222222-2222-2222-2222-222222222222';

-- Test assignments isolation:
-- Insert assignment for user A's course
insert into public.assignments (course_id, user_id, title, due_at, kind, est_minutes)
select id, 'a1111111-1111-1111-1111-111111111111', 'Homework 1', now() + interval '1 day', 'homework', 60
from public.courses where user_id = 'a1111111-1111-1111-1111-111111111111' limit 1;

-- User A should see their assignments
select * from public.assignments where user_id = 'a1111111-1111-1111-1111-111111111111';

-- User B should not see user A's assignments
-- (run in user B session)
select * from public.assignments where user_id = 'a1111111-1111-1111-1111-111111111111';
