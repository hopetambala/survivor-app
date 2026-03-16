# Fantasy Survivor

A web app for managing a Fantasy Survivor league. Includes an admin interface for the commissioner and a read-only participant view.

## Features

### Commissioner (Admin)
- **League Management** — Create and manage multiple leagues/seasons, each with a unique 4-digit share code
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

- [Next.js](https://nextjs.org) 16 (App Router, TypeScript)
- [Supabase](https://supabase.com) (Auth, Postgres database, Row Level Security)
- [web-components-dlite](https://www.npmjs.com/package/web-components-dlite) — Lit-based design system (20 web components)
- [style-dictionary-dlite-tokens](https://www.npmjs.com/package/style-dictionary-dlite-tokens) — Design tokens (colors, typography, spacing, elevation)

## Getting Started

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **Settings → API** and copy your **Project URL** and **anon (public) key**

### 2. Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the contents of `supabase/schema.sql` and click **Run**

This creates all tables, Row Level Security policies, and indexes.

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
8. Share the **4-digit league code** with participants

### As a Participant

1. Enter the 4-digit league code on the home page
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
│   │   └── league/[code]/page.tsx            # Participant view
│   ├── dlite-design-system/
│   │   ├── register.ts                       # Web component registration (client-side)
│   │   ├── DliteProvider.tsx                 # React provider for component registration
│   │   ├── wc-helpers.ts                     # Event helpers (getEventValue, getEventChecked)
│   │   ├── jsx.d.ts                          # JSX type reference for dlite components
│   │   └── styles.css                        # App-specific layout styles (grid, cards, draft)
│   ├── lib/
│   │   ├── scoring.ts                        # Score calculation logic
│   │   └── supabase/
│   │       ├── client.ts                     # Browser Supabase client
│   │       ├── server.ts                     # Server Supabase client
│   │       └── types.ts                      # Database types
│   └── styles/                               # Additional style assets
└── supabase/
    └── schema.sql                            # Database schema (run in SQL Editor)
```

## Design System

The UI is built with **dlite**, a custom design system consisting of two packages:

- **`style-dictionary-dlite-tokens`** — Multi-brand, multi-theme design tokens generated by Style Dictionary. Provides CSS custom properties for colors, typography, spacing, border-radius, elevation, and duration.
- **`web-components-dlite`** — 20 Lit-based web components (`dl-button`, `dl-input`, `dl-card`, `dl-tabs`, etc.) styled exclusively with dlite tokens. Framework-agnostic with React JSX type definitions.

### Components Used

| Category   | Components                                               |
| ---------- | -------------------------------------------------------- |
| Layout     | `dl-stack`, `dl-cluster`, `dl-card`, `dl-divider`        |
| Typography | `dl-heading`, `dl-text`, `dl-badge`                      |
| Actions    | `dl-button`, `dl-icon-button`                            |
| Form       | `dl-input`, `dl-textarea`, `dl-select`, `dl-checkbox`    |
| Feedback   | `dl-alert`, `dl-spinner`                                 |
| Navigation | `dl-tabs`, `dl-tab`                                      |

### Event Handling

Web components dispatch `CustomEvent`s with a `detail` payload. The `wc-helpers.ts` module provides a universal extraction helper:

```tsx
import { getEventValue } from "../dlite-design-system/wc-helpers";

<dl-input onInput={(e: any) => setValue(getEventValue(e))} />
```

`getEventValue(e)` returns `e.detail?.value ?? e.target?.value ?? ""`, handling both React's synthetic events and the component's custom events.

## Default Scoring Rules

| Event | Points |
|---|---|
| Won team reward | 1 |
| Won individual reward | 2 |
| Taken on individual reward | 1 |
| Won team immunity | 1 |
| Won individual immunity | 2 |
| Has idol at end of episode (at tribal) | 1 |
| Uses idol (or successful dice) | 0.5/vote saved |
| Voted off with idol | -3 |
| Survived an elimination | 1 |
| Made final group | 2 |
| Vote in final group | 0.5/vote |
| Won Survivor | 7.5 |
| Has episode title or hashtag | 0.25 |
| Goes home with dice | -0.5 |
| Mini reward victory | 0.5 |
| Making fire at final 4 | 2 |
| Sitting out challenge for food | 0.5 |
| Stole idol and voted them out | 3 |

## Deploy

The easiest way to deploy is on [Vercel](https://vercel.com). Set the environment variables in the Vercel dashboard and deploy.

## License

MIT
