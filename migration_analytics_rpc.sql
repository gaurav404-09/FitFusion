-- RPCs for analytics and leaderboard (safe, aggregate-only)
-- These functions operate only on aggregate data; they do not expose raw rows
-- FIXED: All references to `steps` replaced with `duration` (activities table has no steps column)

-- Drop existing functions first (return type changed, so CREATE OR REPLACE won't work)
drop function if exists get_campus_overview();
drop function if exists get_weekly_trends(text);
drop function if exists get_leaderboard(text);

-- RPC: Get campus overview stats (admin)
create or replace function get_campus_overview()
returns table (
  college text,
  total_users bigint,
  total_food_logs bigint,
  total_activities bigint,
  total_mood_logs bigint,
  avg_calories_per_user numeric,
  avg_duration_per_user numeric,
  avg_mood_per_user numeric
)
language sql
security definer
set search_path = public
as $$
  select
    u.college,
    count(distinct u.id) as total_users,
    (select count(*) from public.food_logs where user_id in (select id from public.users where college = u.college)) as total_food_logs,
    (select count(*) from public.activities where user_id in (select id from public.users where college = u.college)) as total_activities,
    (select count(*) from public.mood_logs where user_id in (select id from public.users where college = u.college)) as total_mood_logs,
    (select avg(calories) from public.food_logs where user_id in (select id from public.users where college = u.college)) as avg_calories_per_user,
    (select avg(duration) from public.activities where user_id in (select id from public.users where college = u.college)) as avg_duration_per_user,
    (select avg(mood) from public.mood_logs where user_id in (select id from public.users where college = u.college)) as avg_mood_per_user
  from public.users u
  group by u.college
  order by u.college;
$$;

-- RPC: Get weekly trends for a college
create or replace function get_weekly_trends(college_param text default null)
returns table (
  date date,
  total_duration bigint,
  total_calories bigint,
  avg_mood numeric
)
language sql
security definer
set search_path = public
as $$
  select
    a.date,
    sum(a.duration) as total_duration,
    sum(f.calories) as total_calories,
    avg(m.mood) as avg_mood
  from public.activities a
  left join public.food_logs f on f.user_id = a.user_id and f.date = a.date
  left join public.mood_logs m on m.user_id = a.user_id and m.date = a.date
  where
    (college_param is null or a.user_id in (select id from public.users where college = college_param))
    and a.date >= current_date - interval '7 days'
  group by a.date
  order by a.date desc;
$$;

-- RPC: Get leaderboard by college (hostel/branch)
create or replace function get_leaderboard(college_param text default null)
returns table (
  college text,
  branch_or_hostel text,
  metric_type text,
  value numeric,
  rank bigint
)
language sql
security definer
set search_path = public
as $$
  with branch_metrics as (
    -- Branch: avg duration (activity minutes)
    select
      u.college,
      u.branch as branch_or_hostel,
      'avg_active_mins'::text as metric_type,
      avg(a.duration) as value,
      row_number() over (partition by u.college order by avg(a.duration) desc) as rank
    from public.activities a
    join public.users u on a.user_id = u.id
    where college_param is null or u.college = college_param
    group by u.college, u.branch
    union all
    -- Branch: avg mood
    select
      u.college,
      u.branch as branch_or_hostel,
      'avg_mood'::text as metric_type,
      avg(m.mood) as value,
      row_number() over (partition by u.college order by avg(m.mood) desc) as rank
    from public.mood_logs m
    join public.users u on m.user_id = u.id
    where college_param is null or u.college = college_param
    group by u.college, u.branch
    union all
    -- Hostel: avg duration (activity minutes)
    select
      u.college,
      u.hostel as branch_or_hostel,
      'avg_active_mins'::text as metric_type,
      avg(a.duration) as value,
      row_number() over (partition by u.college order by avg(a.duration) desc) as rank
    from public.activities a
    join public.users u on a.user_id = u.id
    where college_param is null or u.college = college_param
    group by u.college, u.hostel
    union all
    -- Hostel: avg mood
    select
      u.college,
      u.hostel as branch_or_hostel,
      'avg_mood'::text as metric_type,
      avg(m.mood) as value,
      row_number() over (partition by u.college order by avg(m.mood) desc) as rank
    from public.mood_logs m
    join public.users u on m.user_id = u.id
    where college_param is null or u.college = college_param
    group by u.college, u.hostel
  ),
  nutrition_branch_metrics as (
    -- Branch: avg nutrition (food calories)
    select
      u.college,
      u.branch as branch_or_hostel,
      'avg_nutrition'::text as metric_type,
      avg(f.calories) as value,
      row_number() over (partition by u.college order by avg(f.calories) desc) as rank
    from public.food_logs f
    join public.users u on f.user_id = u.id
    where college_param is null or u.college = college_param
    group by u.college, u.branch
    union all
    -- Hostel: avg nutrition (food calories)
    select
      u.college,
      u.hostel as branch_or_hostel,
      'avg_nutrition'::text as metric_type,
      avg(f.calories) as value,
      row_number() over (partition by u.college order by avg(f.calories) desc) as rank
    from public.food_logs f
    join public.users u on f.user_id = u.id
    where college_param is null or u.college = college_param
    group by u.college, u.hostel
  )
  select * from branch_metrics
  union all
  select * from nutrition_branch_metrics
  order by college, metric_type, rank;
$$;

-- Grant execute to authenticated users
grant execute on function get_campus_overview() to authenticated;
grant execute on function get_weekly_trends(text) to authenticated;
grant execute on function get_leaderboard(text) to authenticated;
