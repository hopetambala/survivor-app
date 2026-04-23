# Architecture

Single-page reference for how the app is put together, who can read what, and
where the source of truth lives.

## Data model

```
          auth.users (Supabase-managed)
                │
                │ admin_id
                ▼
            leagues ───────────────── scoring_rules
              │                              ▲
              │ league_id                    │ rule per league
              ├───── survivors               │
              ├───── players                 │
              ├───── draft_state (1:1)       │
              ├───── draft_picks             │
              └───── episodes                │
                        │                    │
                        ├─── episode_events ─┘
                        └─── attendance (per player per episode)
```

- `leagues.code` — public share token; 6-char Crockford Base32 (new leagues) or
  legacy 4-digit numeric. Unique and regex-validated.
- `draft_state` — one row per league; carries `version` (optimistic lock),
  `status`, `current_round`, `current_pick_index`, `draft_order uuid[]`.
- `draft_picks` — one row per (league, player, survivor) thanks to the unique
  constraint added in migration 0003.
- `episode_events` / `attendance` — the only writable inputs to the scoring
  view. Any change ripples into `v_player_scores` on next read.

## Access model

Two distinct actors; each has a different path into the database.

### Commissioner (signed-in admin)

- Signs in at `/admin`. The browser session cookie is managed by `@supabase/ssr`.
- Hits `/admin/*` routes directly. All table queries rely on the admin RLS
  policies from `0001_initial.sql` — every table has `for all using (admin_id =
auth.uid())` scoped through the `leagues` table.
- Destructive and high-contention mutations go through RPCs so the logic runs
  transactionally on the server:
  - `start_draft`, `make_draft_pick`, `undo_last_draft_pick`, `reset_draft`
  - `score_episode`
- Concurrent commissioners are protected by `draft_state.version`. An
  out-of-date version raises PostgreSQL error `40001`; the UI catches that,
  shows a toast, and reloads the latest state.

### Participant (anonymous)

- Receives the league code out-of-band and visits `/league/{code}`.
- The page is a server component — it calls eight `security definer` RPCs
  that _require_ the code and return only rows matching that league:

  ```
  get_league_by_code          get_episodes_for_code
  get_survivors_for_code      get_episode_events_for_code
  get_players_for_code        get_attendance_for_code
  get_draft_picks_for_code    get_leaderboard_for_code
  get_scoring_rules_for_code
  ```

- Tables are no longer publicly readable (migration `0002_lockdown_rls.sql`
  drops the `Public read using (true)` policies). An unauthenticated request
  that tries `?select=*` on any survivor-app table gets 401/empty — the RPCs
  are the only read surface.

### Shared Supabase project

The Supabase project is shared with the `listings-tracker` app. Every
survivor-app migration is scoped to its own tables (`leagues`, `survivors`,
`players`, `draft_state`, `draft_picks`, `scoring_rules`, `episodes`,
`episode_events`, `attendance`). Never use wildcard DDL here — listings-tracker
owns the `listings_tracker_*` namespace and its own RLS.

## Request lifecycle

```
 Browser                    Edge (Next.js proxy)        App / RSC          Postgres
 ───────                    ────────────────────        ─────────          ────────
  ─── /admin/* ─────────────▶ read session cookie
                              redirect to /admin
                              if not authenticated
                              ───────────────────▶ admin page (client)
                                                   ───── table query ─────▶ RLS on admin_id
                                                   ◀───── data ───────────
                                                   ───── RPC (mutation) ──▶ PL/pgSQL
                                                                              (FOR UPDATE,
                                                                               version check,
                                                                               insert + bump)
                                                   ◀───── new_version ────

  ─── /league/{code} ───────────────────────────────▶ server component
                                                   ───── 9 RPCs (parallel) ─▶ security definer
                                                                              filters by code
                                                   ◀───── typed data ──────
                              ◀── rendered HTML + OG metadata ───────────
```

## Scoring source of truth

`src/lib/scoring.ts` still computes per-episode breakdowns client-side because
the UI renders a cell-by-cell matrix that needs the raw events. The _headline
leaderboard_, however, is read from the `v_player_scores` view via
`get_leaderboard_for_code`. That view is the canonical source — if it ever
disagrees with the client code, the view wins.

## Security posture

| Layer            | Control                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Network          | HSTS, X-Frame-Options: DENY, strict Referrer-Policy, CSP locked to `self` + Supabase origin (`next.config.ts`) |
| Routes           | `proxy.ts` redirects unauthenticated `/admin/*` to `/admin?next=…` before any page code runs                   |
| Database reads   | Admin tables: RLS via `admin_id = auth.uid()`. Participant reads: only via code-gated RPCs                     |
| Database writes  | RLS + PL/pgSQL RPCs that perform their work in a single transaction                                            |
| Concurrency      | `draft_state.version` optimistic lock; `score_episode` deletes and inserts atomically                          |
| Input validation | DB-level CHECK constraints on all name/text fields + regex format on `leagues.code`                            |
| Env handling     | `src/lib/env.ts` validates `NEXT_PUBLIC_SUPABASE_*` at import time                                             |

## Backups & rollback

- **Managed by Supabase.** On the Free tier Supabase takes a daily snapshot
  (retention 7 days); Pro extends to 30 days. Snapshots are visible in the
  dashboard under **Database → Backups**.
- **Point-in-time recovery** is available on Pro. Enable it in the dashboard
  if you want sub-day granularity; otherwise daily snapshots are sufficient
  for a hobby-scale league.
- **Restoring** creates a new Supabase project from the snapshot (Supabase
  does not overwrite in place). Post-restore: update `NEXT_PUBLIC_SUPABASE_URL`
  / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the app's environment to point at the
  new project.
- **Rollback of a bad migration:** write a compensating migration rather than
  restoring the whole project. For schema changes, keep the compensating
  "down" SQL in your notes when you author the "up" migration.
- **App rollback:** `git revert <commit>` on main and redeploy. The proxy,
  CSP, and RPCs all live in code — reverting the commit is the rollback.

## Conventions that are easy to miss

- **Migrations folder, not `schema.sql`.** Apply files in numeric order via
  the Supabase Dashboard SQL editor.
- **RPC function names** are survivor-specific so they never collide with
  listings-tracker's namespace.
- **Hand-curated `src/lib/supabase/types.ts`.** The `db:types` script writes to
  `types.generated.ts`; convenience aliases and function signatures are merged
  in by hand.
- **`proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention.
- **`.env.local` is gitignored.** If you ever suspect it was committed, run
  `git log --all -- .env.local` and rotate the anon key via the Supabase
  dashboard.
