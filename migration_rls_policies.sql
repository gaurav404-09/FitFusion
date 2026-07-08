-- Enable required extension for UUID generation if not enabled
create extension if not exists "pgcrypto";

-- 1) Ensure primary keys default to UUID (if not already set)
alter table public.food_logs alter column id set default gen_random_uuid();
alter table public.activities alter column id set default gen_random_uuid();
alter table public.mood_logs alter column id set default gen_random_uuid();
alter table public.journals alter column id set default gen_random_uuid();
alter table public.user_wellness_data alter column id set default gen_random_uuid();
alter table public.wellness_circles alter column id set default gen_random_uuid();

-- 2) Ensure created_at default
alter table public.food_logs alter column created_at set default now();
alter table public.activities alter column created_at set default now();
alter table public.mood_logs alter column created_at set default now();
alter table public.journals alter column created_at set default now();
alter table public.user_wellness_data alter column created_at set default now();
alter table public.wellness_circles alter column created_at set default now();

-- 3) Foreign keys (if not already there, Supabase may already have them; add if missing)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public'
      and table_name='food_logs'
      and constraint_type='FOREIGN KEY'
  ) then
    alter table public.food_logs
      add constraint food_logs_user_fk
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='activities' and constraint_type='FOREIGN KEY'
  ) then
    alter table public.activities
      add constraint activities_user_fk
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='mood_logs' and constraint_type='FOREIGN KEY'
  ) then
    alter table public.mood_logs
      add constraint mood_logs_user_fk
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='journals' and constraint_type='FOREIGN KEY'
  ) then
    alter table public.journals
      add constraint journals_user_fk
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema='public' and table_name='user_wellness_data' and constraint_type='FOREIGN KEY'
  ) then
    alter table public.user_wellness_data
      add constraint user_wellness_user_fk
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- 4) Unique constraints to keep per-user-per-day coherent
create unique index if not exists mood_logs_user_date_time_uniq
  on public.mood_logs(user_id, date, time);

create unique index if not exists user_wellness_user_date_uniq
  on public.user_wellness_data(user_id, date);

-- 5) Enable RLS (critical)
alter table public.users enable row level security;
alter table public.food_logs enable row level security;
alter table public.activities enable row level security;
alter table public.mood_logs enable row level security;
alter table public.journals enable row level security;
alter table public.user_wellness_data enable row level security;
alter table public.wellness_circles enable row level security;
alter table public.circle_participants enable row level security;

-- 6) Policies: Users can see/update their own profile row
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
on public.users for select
using (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
on public.users for update
using (id = auth.uid())
with check (id = auth.uid());

-- 7) Policies: Personal tables - CRUD only for own user_id
-- Food logs
drop policy if exists "food_logs_crud_own" on public.food_logs;
create policy "food_logs_crud_own"
on public.food_logs for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Activities
drop policy if exists "activities_crud_own" on public.activities;
create policy "activities_crud_own"
on public.activities for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Mood logs
drop policy if exists "mood_logs_crud_own" on public.mood_logs;
create policy "mood_logs_crud_own"
on public.mood_logs for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Journals
drop policy if exists "journals_crud_own" on public.journals;
create policy "journals_crud_own"
on public.journals for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Wellness daily data
drop policy if exists "user_wellness_data_crud_own" on public.user_wellness_data;
create policy "user_wellness_data_crud_own"
on public.user_wellness_data for all
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- 8) Wellness circles are public-readable; only creator can edit/delete; participants table is per-user
drop policy if exists "wellness_circles_select_all" on public.wellness_circles;
create policy "wellness_circles_select_all"
on public.wellness_circles for select
using (true);

drop policy if exists "wellness_circles_insert_authenticated" on public.wellness_circles;
create policy "wellness_circles_insert_authenticated"
on public.wellness_circles for insert
with check (auth.uid() is not null);

drop policy if exists "wellness_circles_modify_own" on public.wellness_circles;
create policy "wellness_circles_modify_own"
on public.wellness_circles for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

drop policy if exists "wellness_circles_delete_own" on public.wellness_circles;
create policy "wellness_circles_delete_own"
on public.wellness_circles for delete
using (created_by = auth.uid());

-- Circle participants: user can manage their own membership
drop policy if exists "circle_participants_crud_own" on public.circle_participants;
create policy "circle_participants_crud_own"
on public.circle_participants for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
