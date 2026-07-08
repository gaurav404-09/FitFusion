-- =============================================================
-- Migration: Add INSERT policy for users table to allow
-- authenticated users to create their own profiles
--
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wavefmcuylmowtxwbesv/sql
-- =============================================================

-- Allow authenticated users to insert their own profile row
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
ON public.users FOR INSERT
WITH CHECK (id = auth.uid());

-- Allow authenticated users to delete their own profile row (optional)
DROP POLICY IF EXISTS "users_delete_own" ON public.users;
CREATE POLICY "users_delete_own"
ON public.users FOR DELETE
USING (id = auth.uid());

-- Output status
SELECT name, definition FROM pg_policies WHERE tablename = 'users';
