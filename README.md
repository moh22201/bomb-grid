-- BOMB GRID initial schema: demo accounts, wallets, rounds and ledger.
-- Run in the Supabase SQL editor after creating a project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  preferred_language text not null default 'en' check (preferred_language in ('en','fr')),
  created_at timestamptz not null default now()
);

create table if not exists public.demo_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance numeric(14,2) not null default 1000.00 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bet_amount numeric(14,2) not null check (bet_amount > 0),
  bomb_count smallint not null check (bomb_count between 1 and 24),
  grid_size smallint not null default 5 check (grid_size = 5),
  revealed_tiles smallint[] not null default '{}',
  outcome text not null default 'active' check (outcome in ('active','cashed_out','bomb_hit','abandoned')),
  multiplier numeric(12,4) not null default 1,
  payout numeric(14,2) not null default 0 check (payout >= 0),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.demo_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.demo_games(id) on delete set null,
  entry_type text not null check (entry_type in ('demo_credit','bet','payout','adjustment')),
  amount numeric(14,2) not null,
  balance_after numeric(14,2) not null check (balance_after >= 0),
  note text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.demo_wallets enable row level security;
alter table public.demo_games enable row level security;
alter table public.demo_ledger_entries enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "wallet_select_own" on public.demo_wallets;
create policy "wallet_select_own" on public.demo_wallets for select to authenticated using (auth.uid() = user_id);

drop policy if exists "games_select_own" on public.demo_games;
create policy "games_select_own" on public.demo_games for select to authenticated using (auth.uid() = user_id);

drop policy if exists "ledger_select_own" on public.demo_ledger_entries;
create policy "ledger_select_own" on public.demo_ledger_entries for select to authenticated using (auth.uid() = user_id);

-- Wallet mutations and round resolution should be implemented as trusted server-side
-- functions before connecting real accounts or using this schema for multiplayer play.
