-- 0017_free_focus.sql
-- Free focus sessions: assignment_id is nullable (no assignment required to start a session).
-- The column was created without NOT NULL in 0007; this migration makes the intent
-- explicit and guards against any accidental tightening.
alter table public.focus_sessions alter column assignment_id drop not null;
