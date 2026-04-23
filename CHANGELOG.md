# Changelog

All notable changes to this project are documented in this file.

This project adheres to [Semantic Versioning](https://semver.org/).
Future releases are automated via [`standard-version`](https://github.com/conventional-changelog/standard-version)
based on [Conventional Commits](https://www.conventionalcommits.org/).

## [0.1.0] — 2026-04-23

Initial production-grade release of Fantasy Survivor.

### Added

- **Commissioner flows**: create leagues, manage survivors + players, run a
  snake draft, score episodes, track attendance, edit scoring rules.
- **Participant flow**: read-only public view at `/league/{code}` with
  leaderboard, rosters, per-episode breakdown, and survivor status.
- **Design system**: full [dlite](https://www.npmjs.com/package/web-components-dlite)
  integration via CSS custom properties and Lit-based web components.

### Security

- RLS lockdown: all public-read policies replaced with `security definer`
  Postgres RPCs that require a league code. `admin_id` is no longer exposed.
- `proxy.ts` guards `/admin/*` with Supabase SSR auth before any page renders.
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy,
  Permissions-Policy) configured in [`next.config.ts`](./next.config.ts).
- Env-var validation at module load in [`src/lib/env.ts`](./src/lib/env.ts).
- League codes upgraded from 4-digit numeric (9k combos) to 6-char Crockford
  Base32 (~1B combos) generated with `crypto.getRandomValues`. Legacy codes
  still accepted.

### Data correctness

- Optimistic-lock versioning on `draft_state` with atomic `make_draft_pick`,
  `undo_last_draft_pick`, `reset_draft`, `start_draft` RPCs — prevents the
  race where two admins acting at once could drop picks.
- Atomic `score_episode` RPC replaces the previous delete-then-insert flow
  so a network blip mid-save no longer wipes historical scores.
- DB-canonical leaderboard via `v_player_scores` view + `get_leaderboard_for_code`.
- CHECK constraints on every user-writable text field; unique draft picks.

### UX

- Error, not-found, global-error, and loading boundaries at the app root.
- `AppDialogs` provider replaces every `alert()` / `confirm()` with a
  toast + promise-based confirm dialog.
- `EmptyState` component across all list pages.
- Unsaved-changes guard on the score page.
- Consistent `<Verbing…>` disabled state on every mutation button.
- Accessibility: skip-to-main link, `aria-pressed` on score toggles,
  `aria-expanded` on accordions, keyboard-activatable attendance + draft cards.
- Mobile: sticky draft-status banner under 768 px, ellipsis truncation on
  scoring-rule column headers.
- Metadata: OG tags, dynamic per-league titles, `icon.svg` + PWA manifest.

### Architecture

- Next 16 server components on `/league/[code]`, `/admin/dashboard`, and
  `/admin/league/[leagueId]`.
- Shared `AdminHeader` with sign-out reachable from every authenticated page.
- TypeScript: `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`.
- Prettier + lint-staged pre-commit hook.

### Developer experience

- Migrations moved to a numbered [`supabase/migrations/`](./supabase/migrations/)
  folder with a documented no-wildcard-DDL rule (project is shared with
  `listings-tracker`).
- `.nvmrc` pinned to Node 20; `db:types`, `typecheck`, `format` scripts.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) documents the data model,
  access model, request lifecycle, and backup/rollback procedure.
