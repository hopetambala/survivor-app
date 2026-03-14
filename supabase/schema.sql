-- Fantasy Survivor League Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- LEAGUES
-- ============================================
create table leagues (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  season_name text not null,
  code char(4) not null unique,
  num_survivors int not null default 20,
  num_picks_per_player int not null default 6,
  max_times_drafted int not null default 5,
  created_at timestamptz not null default now()
);

-- ============================================
-- SURVIVORS (contestants on the show)
-- ============================================
create table survivors (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  name text not null,
  tribe text,
  status text not null default 'active' check (status in ('active', 'eliminated')),
  eliminated_episode int,
  created_at timestamptz not null default now()
);

-- ============================================
-- PLAYERS (league participants)
-- ============================================
create table players (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  name text not null,
  draft_order int,
  created_at timestamptz not null default now()
);

-- ============================================
-- DRAFT STATE
-- ============================================
create table draft_state (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null unique references leagues(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  current_round int not null default 1,
  current_pick_index int not null default 0,
  draft_order uuid[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ============================================
-- DRAFT PICKS
-- ============================================
create table draft_picks (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  survivor_id uuid not null references survivors(id) on delete cascade,
  round int not null,
  pick_number int not null,
  created_at timestamptz not null default now()
);

-- ============================================
-- SCORING RULES
-- ============================================
create table scoring_rules (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  event_name text not null,
  points numeric not null,
  description text,
  is_variable boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- EPISODES
-- ============================================
create table episodes (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid not null references leagues(id) on delete cascade,
  episode_number int not null,
  title text,
  is_scored boolean not null default false,
  created_at timestamptz not null default now(),
  unique(league_id, episode_number)
);

-- ============================================
-- EPISODE EVENTS (scores per survivor per episode)
-- ============================================
create table episode_events (
  id uuid primary key default uuid_generate_v4(),
  episode_id uuid not null references episodes(id) on delete cascade,
  survivor_id uuid not null references survivors(id) on delete cascade,
  scoring_rule_id uuid not null references scoring_rules(id) on delete cascade,
  value numeric not null default 0,
  created_at timestamptz not null default now()
);

-- ============================================
-- ATTENDANCE (watch party attendance per episode per player)
-- ============================================
create table attendance (
  id uuid primary key default uuid_generate_v4(),
  episode_id uuid not null references episodes(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  points numeric not null default 0 check (points >= 0 and points <= 1),
  created_at timestamptz not null default now(),
  unique(episode_id, player_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
alter table leagues enable row level security;
alter table survivors enable row level security;
alter table players enable row level security;
alter table draft_state enable row level security;
alter table draft_picks enable row level security;
alter table scoring_rules enable row level security;
alter table episodes enable row level security;
alter table episode_events enable row level security;
alter table attendance enable row level security;

-- Admin policies: full access for the league admin
create policy "Admin full access to leagues" on leagues
  for all using (auth.uid() = admin_id);

create policy "Admin full access to survivors" on survivors
  for all using (
    league_id in (select id from leagues where admin_id = auth.uid())
  );

create policy "Admin full access to players" on players
  for all using (
    league_id in (select id from leagues where admin_id = auth.uid())
  );

create policy "Admin full access to draft_state" on draft_state
  for all using (
    league_id in (select id from leagues where admin_id = auth.uid())
  );

create policy "Admin full access to draft_picks" on draft_picks
  for all using (
    league_id in (select id from leagues where admin_id = auth.uid())
  );

create policy "Admin full access to scoring_rules" on scoring_rules
  for all using (
    league_id in (select id from leagues where admin_id = auth.uid())
  );

create policy "Admin full access to episodes" on episodes
  for all using (
    league_id in (select id from leagues where admin_id = auth.uid())
  );

create policy "Admin full access to episode_events" on episode_events
  for all using (
    episode_id in (
      select e.id from episodes e
      join leagues l on l.id = e.league_id
      where l.admin_id = auth.uid()
    )
  );

create policy "Admin full access to attendance" on attendance
  for all using (
    episode_id in (
      select e.id from episodes e
      join leagues l on l.id = e.league_id
      where l.admin_id = auth.uid()
    )
  );

-- Public read policies: anyone can read league data (code-gated in app)
create policy "Public read leagues by code" on leagues
  for select using (true);

create policy "Public read survivors" on survivors
  for select using (true);

create policy "Public read players" on players
  for select using (true);

create policy "Public read draft_state" on draft_state
  for select using (true);

create policy "Public read draft_picks" on draft_picks
  for select using (true);

create policy "Public read scoring_rules" on scoring_rules
  for select using (true);

create policy "Public read episodes" on episodes
  for select using (true);

create policy "Public read episode_events" on episode_events
  for select using (true);

create policy "Public read attendance" on attendance
  for select using (true);

-- ============================================
-- INDEXES
-- ============================================
create index idx_leagues_code on leagues(code);
create index idx_leagues_admin on leagues(admin_id);
create index idx_survivors_league on survivors(league_id);
create index idx_players_league on players(league_id);
create index idx_draft_picks_league on draft_picks(league_id);
create index idx_draft_picks_player on draft_picks(player_id);
create index idx_episodes_league on episodes(league_id);
create index idx_episode_events_episode on episode_events(episode_id);
create index idx_episode_events_survivor on episode_events(survivor_id);
create index idx_attendance_episode on attendance(episode_id);
