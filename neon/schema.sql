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

-- ============================================================
-- Phase 1 追加（生活責任 / 特殊任務 / 責任值 / 違規紀錄）
-- ⚠️ 既有資料庫也可以直接執行這一段，全部用 IF NOT EXISTS，
--    不會影響已經存在的資料表
-- ============================================================

alter table kids add column if not exists character_points numeric not null default 0;

-- 生活責任：每天固定要做的事，不給錢，只加責任值
create table if not exists responsibilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points numeric not null default 1,
  created_at timestamptz not null default now()
);

-- 每個小孩每天對每項責任的打卡紀錄（同一天同一項只能打卡一次）
create table if not exists responsibility_logs (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  responsibility_id uuid not null references responsibilities(id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  unique (kid_id, responsibility_id, log_date)
);

-- 特殊任務：一次性、金額較大的任務
create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  name text not null,
  amount numeric not null,
  status text not null default 'open' check (status in ('open', 'pending', 'done')),
  created_at timestamptz not null default now()
);

-- 責任值異動紀錄（跟金錢的 transactions 分開的獨立帳本）
create table if not exists character_point_logs (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  delta numeric not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- 違規紀錄：可同時扣錢、扣責任值、記錄禁止的權利
create table if not exists violations (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  description text not null,
  money_delta numeric not null default 0,
  points_delta numeric not null default 0,
  privilege_note text,
  created_at timestamptz not null default now()
);

insert into responsibilities (name, points)
select * from (values
  ('整理餐袋', 1),
  ('整理書包', 1),
  ('準備外出用品', 1),
  ('摺棉被', 1),
  ('收玩具', 1),
  ('刷牙', 1)
) as seed(name, points)
where not exists (select 1 from responsibilities);

-- ============================================================
-- Phase 2 追加（固定零用錢 / 固定支出 / 存錢利息）
-- ⚠️ 同樣全部用 IF NOT EXISTS，可以直接在既有資料庫上執行
-- ============================================================

alter table kids add column if not exists interest_rate numeric not null default 0;

-- 固定零用錢規則：每週或每月固定入帳
create table if not exists allowance_rules (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  amount numeric not null,
  frequency text not null check (frequency in ('weekly', 'monthly')),
  day_of_week int,   -- 0=週日 ... 6=週六（frequency = weekly 時使用）
  day_of_month int,  -- 1-31（frequency = monthly 時使用，超過當月天數會用月底那天）
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 固定支出規則：每月固定扣款
create table if not exists expense_rules (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  name text not null,
  amount numeric not null,
  day_of_month int not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 排程執行紀錄：避免 cron 同一天重複觸發同一筆規則
create table if not exists scheduled_run_logs (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null,
  rule_id uuid not null,
  run_date date not null,
  created_at timestamptz not null default now(),
  unique (rule_type, rule_id, run_date)
);

-- ============================================================
-- Phase 3 追加（全站密碼）
-- ⚠️ 同樣全部用 IF NOT EXISTS，可以直接在既有資料庫上執行
-- ============================================================

-- 全站密碼：跟家長 PIN 分開，沒有這組密碼連 API 資料都拿不到。
-- 預設 1234，上線後請務必到家長模式「設定」分頁修改。
insert into app_settings (key, value) values ('site_pin', '1234')
on conflict (key) do nothing;

-- ============================================================
-- Phase 4 追加（責任值兌換清單）
-- ⚠️ 同樣全部用 IF NOT EXISTS，可以直接在既有資料庫上執行
-- ============================================================

-- 兌換項目：家長在設定裡自訂，小孩用責任值兌換
create table if not exists reward_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  points_cost numeric not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
