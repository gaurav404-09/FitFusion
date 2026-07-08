# Supabase Migration Instructions

## Order of Execution

Run these SQL scripts in your Supabase SQL Editor **in this exact order**:

### 1. migration_fix_unique.sql
- Cleans duplicate entries from `food_logs` to allow unique index creation.
- Creates the unique index on `(user_id, date, meal_type, food_name)`.

### 2. migration_rls_policies.sql
- Adds UUID defaults and foreign keys.
- Enables Row Level Security (RLS) on all personal tables.
- Creates RLS policies so users can only access their own data.
- Adds unique constraints to prevent duplicate daily entries.

### 3. migration_analytics_rpc.sql
- Creates RPC functions for campus-wide analytics and leaderboards.
- These are aggregate-only and safe for admin use without bypassing RLS.

### 4. migration_admin_service_role.sql
- Creates an admin service role and view for campus overview.
- Grants execute permissions on RPCs to authenticated users.

### 5. migration_admin_users_rpc.sql ⭐ NEW
- Creates the `admin_list_users()` RPC so the admin dashboard can list all non-admin users.
- Uses `SECURITY DEFINER` to bypass RLS safely.

## What to Expect

- After step 1: Duplicates in `food_logs` are removed; unique index exists.
- After step 2: All personal tables enforce per-user access via RLS.
- After step 3: Admin dashboard and leaderboards can call RPCs for aggregate data.
- After step 4: Service role is ready for admin analytics.
- After step 5: Admin dashboard can list all users via RPC.

## Post-Migration

- The admin dashboard uses RPCs for **all** data — no hardcoded values.
- Campus stats, signals, and participation rates are all computed from real aggregates.
- All user data is isolated by `user_id` via RLS.

## Troubleshooting

- If step 1 fails due to permissions, ensure you are running as a Supabase admin.
- If RPCs return no data, verify RLS policies are not too restrictive (they should be fine).
- For any permission denied errors, ensure the `admin_service_role` is granted to `authenticated`.
- If the user list is empty on the admin dashboard, make sure `migration_admin_users_rpc.sql` has been run.

## Notes

- Do **not** bypass RLS for raw user data; always use aggregates or RPCs.
- The admin dashboard will no longer fetch raw logs, only aggregates via RPCs.
- Leaderboards will be refreshed with real DB data via RPCs.

