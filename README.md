# Fantasy Survivor

A web app for managing a Fantasy Survivor league. Includes an admin interface for the commissioner and a read-only participant view.

## Features

### Commissioner (Admin)

- **League Management** — Create and manage multiple leagues/seasons, each with a unique 6-character share code (Crockford Base32, ~1B combos)
- **Survivor Contestants** — Add contestants individually or in bulk, assign tribes, toggle active/eliminated status
- **Player Management** — Add league participants, set draft order
- **Snake Draft** — Run a live snake draft (odd rounds forward, even rounds reverse), with undo and reset
- **Episode Scoring** — Score episodes with a grid of events × survivors (click to toggle, enter values for variable-point events)
- **Attendance Tracking** — Mark watch party attendance per episode (0 / 0.5 / 1 points)
- **Scoring Rules** — 18 default rules from the Fantasy Survivor rulebook, fully editable, with support for custom rules
- **League Settings** — Configure picks per player, max times a survivor can be drafted

### Participants

- **Leaderboard** — Live standings with total, survivor, and attendance score breakdowns
- **Rosters** — View every player's drafted survivors and their status
- **Episode Breakdown** — Per-episode score table and expandable detail per survivor
- **Survivor Status** — See who's still in the game vs. eliminated

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, server components, TypeScript strict mode)
- [Supabase](https://supabase.com) (Auth, Postgres, Row Level Security, code-gated RPC functions)
- [web-components-dlite](https://www.npmjs.com/package/web-components-dlite) — Lit-based design system (20 web components)
- [style-dictionary-dlite-tokens](https://www.npmjs.com/package/style-dictionary-dlite-tokens) — Design tokens (colors, typography, spacing, elevation)

Requires Node **20+** (pinned via [`.nvmrc`](./.nvmrc)). See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the data-flow and auth/RLS model.

## Getting Started

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings → API** and copy your **Project URL** and **anon (public) key**

### 2. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**.
2. Apply the migrations in `supabase/migrations/` in numeric order. Paste each file into a new query and run it.

`0001_initial.sql` creates all tables, RLS policies, and indexes. Later migrations harden RLS, add constraints, and introduce server-side RPC functions. See [`supabase/migrations/README.md`](supabase/migrations/README.md) for conventions.

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

### 4. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

### As a Commissioner

1. Click **Commissioner Login** on the home page
2. Sign up with email + password
3. Create a new league (name + season)
4. Add survivors (the show's contestants)
5. Add players (your league participants)
6. Run the snake draft
7. After each episode, score it and mark attendance
8. Share the **6-character league code** with participants

### As a Participant

1. Enter the league code on the home page (legacy 4-digit codes are still accepted)
2. Browse the leaderboard, rosters, episode breakdowns, and survivor statuses

## Project Structure

```
survivor-app/
├── src/
│   ├── app/
│   │   ├── page.tsx                          # Landing page (enter code or login)
│   │   ├── admin/
│   │   │   ├── page.tsx                      # Commissioner login/signup
│   │   │   ├── dashboard/page.tsx            # League list + create
│   │   │   └── league/[leagueId]/
│   │   │       ├── page.tsx                  # League overview
│   │   │       ├── survivors/page.tsx        # Manage contestants
│   │   │       ├── players/page.tsx          # Manage participants
│   │   │       ├── draft/page.tsx            # Snake draft
│   │   │       ├── episodes/page.tsx         # Episode list
│   │   │       ├── episodes/[episodeId]/
│   │   │       │   ├── score/page.tsx        # Score an episode
│   │   │       │   └── attendance/page.tsx   # Mark attendance
│   │   │       ├── scoring-rules/page.tsx    # Edit scoring rules
│   │   │       └── settings/page.tsx         # League settings (picks, draft limits)
│   │   └── league/[code]/
│   │       ├── page.tsx                      # Server component: SSR data + dynamic OG metadata
│   │       └── LeaguePublicView.tsx          # Client island: tabs, expand/collapse
│   ├── proxy.ts                              # Auth-refresh + /admin/* guard (Next 16 "proxy" convention)
│   ├── components/
│   │   ├── AppDialogs.tsx                    # Toast + Confirm, replaces alert()/confirm()
│   │   └── EmptyState.tsx                    # Consistent empty-list block
│   ├── dlite-design-system/
│   │   ├── register.ts                       # Web component registration
│   │   ├── DliteProvider.tsx                 # React provider
│   │   ├── wc-helpers.ts                     # Typed event helpers
│   │   ├── jsx.d.ts                          # JSX types for dlite components
│   │   └── styles.css                        # App-specific styles (a11y, draft banner, etc.)
│   ├── lib/
│   │   ├── env.ts                            # Validated env accessor
│   │   ├── scoring.ts                        # Scoring utilities + Crockford Base32 codes
│   │   ├── api/league.ts                     # Typed RPC wrapper for the participant page
│   │   └── supabase/
│   │       ├── client.ts                     # Browser client
│   │       ├── server.ts                     # Server client (SSR)
│   │       └── types.ts                      # Database + RPC signatures
│   └── app/{error,not-found,global-error,loading}.tsx   # Route-segment boundaries
└── supabase/
    └── migrations/                           # Numbered SQL migrations (apply in order)
        ├── 0001_initial.sql                  # Tables, RLS, indexes
        ├── 0002_lockdown_rls.sql             # Drop public-read policies, add code-gated RPCs
        ├── 0003_constraints_and_indexes.sql  # CHECK constraints, unique draft picks
        ├── 0004_stronger_codes.sql           # Widen `leagues.code` to 6-char Base32
        ├── 0005_draft_concurrency.sql        # Optimistic-lock version + atomic draft RPCs
        ├── 0006_score_episode_rpc.sql        # Transactional episode-score save
        └── 0007_leaderboard_view.sql         # v_player_scores view + leaderboard RPC
```

## Design System

The UI is built with **dlite**, a custom design system consisting of two packages:

- **`style-dictionary-dlite-tokens`** — Multi-brand, multi-theme design tokens generated by Style Dictionary. Provides CSS custom properties for colors, typography, spacing, border-radius, elevation, and duration.
- **`web-components-dlite`** — 20 Lit-based web components (`dl-button`, `dl-input`, `dl-card`, `dl-tabs`, etc.) styled exclusively with dlite tokens. Framework-agnostic with React JSX type definitions.

### Components Used

| Category   | Components                                            |
| ---------- | ----------------------------------------------------- |
| Layout     | `dl-stack`, `dl-cluster`, `dl-card`, `dl-divider`     |
| Typography | `dl-heading`, `dl-text`, `dl-badge`                   |
| Actions    | `dl-button`, `dl-icon-button`                         |
| Form       | `dl-input`, `dl-textarea`, `dl-select`, `dl-checkbox` |
| Feedback   | `dl-alert`, `dl-spinner`                              |
| Navigation | `dl-tabs`, `dl-tab`                                   |

### Event Handling

Web components dispatch `CustomEvent`s with a `detail` payload. The `wc-helpers.ts` module provides a universal extraction helper:

```tsx
import { getEventValue } from "../dlite-design-system/wc-helpers";

<dl-input onInput={(e: any) => setValue(getEventValue(e))} />;
```

`getEventValue(e)` returns `e.detail?.value ?? e.target?.value ?? ""`, handling both React's synthetic events and the component's custom events.

## Default Scoring Rules

| Event                                  | Points         |
| -------------------------------------- | -------------- |
| Won team reward                        | 1              |
| Won individual reward                  | 2              |
| Taken on individual reward             | 1              |
| Won team immunity                      | 1              |
| Won individual immunity                | 2              |
| Has idol at end of episode (at tribal) | 1              |
| Uses idol (or successful dice)         | 0.5/vote saved |
| Voted off with idol                    | -3             |
| Survived an elimination                | 1              |
| Made final group                       | 2              |
| Vote in final group                    | 0.5/vote       |
| Won Survivor                           | 7.5            |
| Has episode title or hashtag           | 0.25           |
| Goes home with dice                    | -0.5           |
| Mini reward victory                    | 0.5            |
| Making fire at final 4                 | 2              |
| Sitting out challenge for food         | 0.5            |
| Stole idol and voted them out          | 3              |

## Deploy

The easiest way to deploy is on [Vercel](https://vercel.com). Set the environment variables in the Vercel dashboard and deploy.

## License

MIT
