-- =============================================================
-- Migration: Fix FK constraints on food_logs and activities
-- to reference auth.users instead of public.users
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wavefmcuylmowtxwbesv/sql
-- =============================================================

-- Drop the existing FK pointing to public.users
ALTER TABLE public.food_logs
  DROP CONSTRAINT IF EXISTS food_logs_user_id_fkey;

ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_user_id_fkey;

-- Re-add FK pointing to auth.users (Supabase Auth), with CASCADE delete
ALTER TABLE public.food_logs
  ADD CONSTRAINT food_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- Confirm success
SELECT
  tc.table_name,
  tc.constraint_name,
  ccu.table_schema || '.' || ccu.table_name AS references_table
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('food_logs', 'activities');
