-- 0009_focus_outcome_transferred.sql
-- Adds 'transferred' to focus_outcome for S3-1 timer transfer feature.
-- ALTER TYPE ADD VALUE cannot run inside a transaction block in Postgres;
-- Supabase applies migrations outside transactions for this reason.

alter type public.focus_outcome add value if not exists 'transferred';
