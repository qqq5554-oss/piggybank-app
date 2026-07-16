-- ============================================================
-- 小小存錢筒 App - Neon (PostgreSQL) 資料庫結構
-- 使用方式：到 Neon 專案後台 > SQL Editor，貼上整份執行
-- ⚠️ 這個版本不用 RLS（權限控管改在後端 API 層處理，見 /api）
-- ============================================================

create table kids (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar text not null default '🐶',
  theme_id text not null default 'peach',
  balance numeric not null default 0,
  goal_name text,
  goal_amount numeric,
  created_at timestamptz not null default now()
);

create table chores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table pending_chores (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  chore_id uuid references chores(id) on delete set null,
  chore_name text not null,
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  type text not null check (type in ('income', 'expense', 'penalty')),
  amount numeric not null,
  note text not null,
  created_at timestamptz not null default now()
);

create table app_settings (
  key text primary key,
  value text not null
);

insert into app_settings (key, value) values ('parent_pin', '0000');

insert into chores (name, amount) values
  ('摺衣服', 10),
  ('倒垃圾', 10),
  ('洗碗', 15),
  ('整理房間', 20),
  ('澆花', 5);

insert into kids (name, avatar, theme_id) values
  ('小安', '🐶', 'peach'),
  ('小美', '🐱', 'mint');
