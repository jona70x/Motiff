-- 0016_get_streak_days_rpc.sql
-- Lightweight RPC for the TodayScreen streak badge.
-- Returns only the 90-day bounded session dates — avoids the all-time
-- sum(duration_s) aggregation that get_profile_stats() runs. Called on every
-- cold start so must be as cheap as possible (TD-37).
--
-- security invoker → runs as the calling user; RLS on focus_sessions filters
--                    to auth.uid() automatically, no explicit predicate needed.
-- stable           → safe to cache within a single statement.

create or replace function public.get_streak_days()
returns date[]
language sql
security invoker
stable
as $$
  select coalesce(
    (
      select array_agg(d order by d desc)
        from (
          select distinct (started_at at time zone 'UTC')::date as d
            from public.focus_sessions
           where started_at >= now() - interval '90 days'
             and duration_s is not null
             and duration_s > 0
        ) sub
    ),
    array[]::date[]
  )
$$;

-- Allow any authenticated user to call this function.
-- RLS on focus_sessions prevents cross-user access.
grant execute on function public.get_streak_days() to authenticated;
