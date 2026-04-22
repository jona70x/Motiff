-- 0015_get_profile_stats_rpc.sql
-- Single-round-trip RPC that replaces three separate client queries in
-- ProfileScreen. All aggregations run server-side; only scalars + a bounded
-- date array are returned to the client.
--
-- security invoker  → runs as the calling user; RLS on focus_sessions and
--                     assignments already filters to auth.uid(), so no
--                     additional user_id predicate is required.
-- stable            → result may be cached within a single statement; safe
--                     because the data does not change mid-request.
--
-- Returns jsonb with:
--   total_focus_minutes  int    — sum of all session durations (all time)
--   total_completed      int    — count of completed assignments (all time)
--   recent_session_dates date[] — distinct days with a session in last 90 days
--                                 (ordered DESC, used by client streak walk)

create or replace function public.get_profile_stats()
returns jsonb
language sql
security invoker
stable
as $$
  select jsonb_build_object(
    'total_focus_minutes',
    coalesce(
      (select (sum(duration_s) / 60)::int
         from public.focus_sessions
        where duration_s is not null
          and duration_s > 0),
      0
    ),
    'total_completed',
    coalesce(
      (select count(*)::int
         from public.assignments
        where completed_at is not null),
      0
    ),
    'recent_session_dates',
    coalesce(
      (select array_agg(d order by d desc)
         from (
           select distinct (started_at at time zone 'UTC')::date as d
             from public.focus_sessions
            where started_at >= now() - interval '90 days'
              and duration_s is not null
              and duration_s > 0
         ) sub),
      array[]::date[]
    )
  )
$$;

-- Allow any authenticated user to call this function.
-- RLS on the underlying tables prevents cross-user access.
grant execute on function public.get_profile_stats() to authenticated;
