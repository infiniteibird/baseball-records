create extension if not exists "pgcrypto";

create table if not exists public.teams (
  id text primary key,
  name text not null,
  players jsonb not null default '[]'::jsonb,
  source text not null default 'mock',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.games (
  id text primary key,
  date text not null,
  time text not null,
  stadium text not null,
  status text not null check (status in ('예정', '종료', '진행중')),
  away_team_id text not null references public.teams(id) on delete cascade,
  home_team_id text not null references public.teams(id) on delete cascade,
  away_score integer,
  home_score integer,
  source text not null default 'mock',
  note text not null default '',
  detail_available boolean not null default true,
  record jsonb,
  season integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_stats (
  id text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  player_name text not null,
  school text not null default '',
  source text not null default 'upload',
  stat_type text not null default 'roster',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists games_season_idx on public.games (season);
create index if not exists games_status_idx on public.games (status);
create index if not exists player_stats_team_idx on public.player_stats (team_id);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists teams_touch_updated_at on public.teams;
create trigger teams_touch_updated_at
before update on public.teams
for each row
execute function public.touch_updated_at();

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at
before update on public.games
for each row
execute function public.touch_updated_at();

drop trigger if exists player_stats_touch_updated_at on public.player_stats;
create trigger player_stats_touch_updated_at
before update on public.player_stats
for each row
execute function public.touch_updated_at();

alter table public.teams enable row level security;
alter table public.games enable row level security;
alter table public.player_stats enable row level security;

create policy if not exists "Allow all for authenticated and anon for development"
on public.teams
for all
using (true)
with check (true);

create policy if not exists "Allow all for authenticated and anon for development"
on public.games
for all
using (true)
with check (true);

create policy if not exists "Allow all for authenticated and anon for development"
on public.player_stats
for all
using (true)
with check (true);
