-- Create a service role for admin analytics (aggregate-only)
-- This allows admin dashboard to see campus-wide aggregates without bypassing RLS for raw rows

-- 1) Create a custom role if not exists
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'admin_service_role') then
    create role admin_service_role nologin;
  end if;
end $$;

-- 2) Grant this role to authenticated (so any logged-in user can use the RPCs)
grant admin_service_role to authenticated;

-- 3) Grant usage on schemas and tables needed for the RPCs (already covered by RPC security definer, but for safety)
grant usage on schema public to admin_service_role;
grant select on all tables in schema public to admin_service_role;

-- 4) Create a view for admin campus overview (optional, can be used instead of RPC)
create or replace view admin_campus_overview as
select
  u.college,
  count(distinct u.id) as total_users,
  (select count(*) from public.food_logs where user_id in (select id from public.users where college = u.college)) as total_food_logs,
  (select count(*) from public.activities where user_id in (select id from public.users where college = u.college)) as total_activities,
  (select count(*) from public.mood_logs where user_id in (select id from public.users where college = u.college)) as total_mood_logs,
  (select avg(calories) from public.food_logs where user_id in (select id from public.users where college = u.college)) as avg_calories_per_user,
  (select avg(steps) from public.activities where user_id in (select id from public.users where college = u.college)) as avg_steps_per_user,
  (select avg(mood_score) from public.mood_logs where user_id in (select id from public.users where college = u.college)) as avg_mood_per_user
from public.users u
group by u.college
order by u.college;

-- Grant access to the view for admin_service_role
grant select on admin_campus_overview to admin_service_role;
