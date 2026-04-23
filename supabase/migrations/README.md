# Migrations

Numbered SQL files applied in order against the Supabase project.

## Applying migrations

For a fresh project: open the Supabase dashboard → SQL Editor → New Query → paste each file in numeric order and run.

For existing projects: only apply migrations that haven't been run yet. There is no tracking table, so track what's been applied manually (or via a personal notes file) until Supabase CLI is adopted.

## Adding a new migration

1. Create the next-numbered file (`0007_<short_name>.sql`).
2. Scope every statement to an explicit table name. **Do not** use wildcard DDL (`DROP POLICY ... ON ALL TABLES`, blanket `GRANT`/`REVOKE`) — this Supabase project is shared with `listings-tracker`, which owns tables prefixed `listings_tracker_*`.
3. Use survivor-specific names for RPC functions to avoid collisions.

## Regenerating TypeScript types

After applying a migration that changes columns or adds RPCs, refresh the generated types so the client matches the schema:

```bash
SUPABASE_PROJECT_ID=<your-project-id> npm run db:types
```

This writes `src/lib/supabase/types.generated.ts`. The hand-curated `src/lib/supabase/types.ts` exports convenience aliases (`PublicLeague`, `LeaderboardRow`, etc.) and the RPC function signatures; merge any additions from the generated file in by hand — it is not an automated swap.
