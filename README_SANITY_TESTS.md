# Sanity Tests & Scripts

## Quick Checks

Run these before development to ensure backend services are reachable.

### 1. Supabase DB Connection + RLS
```bash
npm run test:db
```
- Verifies Supabase URL and keys work
- Confirms RLS policies block anonymous reads
- Checks that analytics RPCs exist

### 2. Nutrition Backend Health
```bash
npm run test:backend
```
- Pings `/api/health` on the nutrition microservice
- Warns if the service isn't running (required for food scanner)

### 3. Run Both
```bash
npm run test:all
```

## Adding these scripts to package.json

If you want to use `npm run` directly, merge the following into your existing `package.json` scripts section:

```json
{
  "scripts": {
    "test:db": "node test_db_connection.js",
    "test:backend": "node test_backend_health.js",
    "test:all": "npm run test:db && npm run test:backend"
  }
}
```

## Notes

- Tests use `.env` for Supabase and nutrition backend URLs.
- No authentication required; they just check reachability and RLS behavior.
- If `test:db` fails, check your Supabase project settings and RLS policies.
- If `test:backend` fails, start the Flask nutrition backend service.
