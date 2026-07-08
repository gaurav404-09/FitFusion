-- Fix for unique constraint violation: clean duplicate food_logs entries
-- Keep only the first entry per (user_id, date, meal_type, food_name)
-- Run this once before applying unique index

delete from public.food_logs
where id not in (
  select (min(id_text)::uuid)
  from (
    select id::text as id_text, user_id, date, meal_type, food_name
    from public.food_logs
  ) t
  group by user_id, date, meal_type, food_name
);

-- Now create the unique index (safe)
create unique index if not exists food_logs_user_date_meal_food_uniq
  on public.food_logs(user_id, date, meal_type, food_name);
