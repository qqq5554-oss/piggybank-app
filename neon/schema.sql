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

-- ============================================================
-- Phase 5 追加（生活責任改成每個小孩獨立，不再共用）
-- ⚠️ 這段本身是冪等的（靠 kid_id is null 當條件），可以直接在
--    既有資料庫上執行，重複執行也不會重複複製
-- ============================================================

alter table responsibilities add column if not exists kid_id uuid references kids(id) on delete cascade;

-- 把目前共用的責任項目，複製成每個小孩各自獨立的一份，
-- 之後編輯其中一個小孩的項目就不會影響到其他小孩
insert into responsibilities (kid_id, name, points, created_at)
select k.id, r.name, r.points, r.created_at
from responsibilities r
cross join kids k
where r.kid_id is null;

-- 舊的共用項目複製完了就可以刪掉（會連帶刪掉舊的打卡紀錄，
-- 但打卡紀錄只影響「今天有沒有打過卡」的畫面狀態，不影響
-- 最近紀錄裡已經寫好的文字紀錄，所以不會遺失任何看得到的歷史）
delete from responsibilities where kid_id is null;

alter table responsibilities alter column kid_id set not null;

-- ============================================================
-- Phase 6 追加（挑戰、手機推播通知）
-- ⚠️ 同樣全部用 IF NOT EXISTS，可以直接在既有資料庫上執行
-- ============================================================

-- 挑戰：target_count = 1 是單次挑戰（例如「可以念 1~100」），
-- 大於 1 就是次數挑戰（例如「吃不喜歡的食物 10 次」），每完成
-- 一次就 done_count + 1，累積到 target_count 就自動完成並發獎勵
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  name text not null,
  target_count integer not null default 1,
  done_count integer not null default 0,
  reward_money numeric not null default 0,
  reward_points numeric not null default 0,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 手機推播訂閱：每支手機（每個瀏覽器）授權後會存一筆
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  label text,
  created_at timestamptz not null default now()
);

-- 通知發送紀錄：同一種通知同一天只推播一次，避免重複打擾
create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  ref_date date not null,
  created_at timestamptz not null default now(),
  unique (kind, ref_date)
);

-- ============================================================
-- Phase 7 追加（小轉盤）
-- ⚠️ 同樣可以直接在既有資料庫上執行
-- ============================================================

-- 轉盤選項：家長自己編輯要放什麼，全家共用同一個轉盤
create table if not exists wheel_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 第一次建立時放幾個範例，之後可以自己改
insert into wheel_options (label, sort_order)
select v.label, v.sort_order
from (values ('洗碗', 1), ('倒垃圾', 2), ('摺衣服', 3), ('掃地', 4)) as v(label, sort_order)
where not exists (select 1 from wheel_options);

-- ============================================================
-- Phase 8 追加（每日獎勵轉盤）
-- ⚠️ 同樣可以直接在既有資料庫上執行
-- ============================================================

-- 獎勵轉盤的格子（跟「決定事情」用的 wheel_options 分開的另一組）
-- 每一格都應該是好事，只是大小不同；不要放「銘謝惠顧」，
-- 小孩已經把責任做完了，轉到空白只會讓努力被抵消掉。
create table if not exists reward_wheel_options (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  reward_points numeric not null default 0,
  reward_money numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 每個小孩每天只能轉一次，靠 unique 擋掉重複
create table if not exists reward_spins (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  spin_date date not null,
  option_id uuid references reward_wheel_options(id) on delete set null,
  label text not null,
  created_at timestamptz not null default now(),
  unique (kid_id, spin_date)
);

insert into reward_wheel_options (label, reward_points, reward_money, sort_order)
select v.label, v.p, v.m, v.o
from (values
  ('多玩 10 分鐘', 0, 0, 1),
  ('今天你選晚餐', 0, 0, 2),
  ('免做一次家事', 0, 0, 3),
  ('+1 責任值', 1, 0, 4),
  ('睡前多一個故事', 0, 0, 5),
  ('選明天的衣服', 0, 0, 6)
) as v(label, p, m, o)
where not exists (select 1 from reward_wheel_options);

-- ============================================================
-- Phase 9 追加（兌換券）
-- ⚠️ 同樣可以直接在既有資料庫上執行
-- ============================================================

-- 兌換券：轉盤抽到的獎勵不一定當下能用（例如「今天你選晚餐」
-- 可能已經吃完飯了），所以存成一張券放進券夾，之後要用再核銷。
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id) on delete cascade,
  label text not null,
  source text not null default 'wheel',
  status text not null default 'unused' check (status in ('unused', 'used')),
  created_at timestamptz not null default now(),
  used_at timestamptz
);

-- ============================================================
-- Phase 10 追加（小轉盤可以存多組不同內容）
-- ⚠️ 這段是冪等的，可以直接在既有資料庫上執行
-- ============================================================

-- 轉盤組：例如「誰洗碗」「晚餐吃什麼」「假日活動」各存一組
create table if not exists wheel_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table wheel_options add column if not exists preset_id uuid references wheel_presets(id) on delete cascade;

-- 沒有任何轉盤組的話先建一組，把現有的選項通通歸進去
insert into wheel_presets (name, sort_order)
select '我的轉盤', 1
where not exists (select 1 from wheel_presets);

update wheel_options
set preset_id = (select id from wheel_presets order by sort_order, created_at limit 1)
where preset_id is null;

alter table wheel_options alter column preset_id set not null;

-- ============================================================
-- Phase 11 追加（獎勵轉盤的中獎機率）
-- ⚠️ 可以直接在既有資料庫上執行
-- ============================================================

-- weight 是「這一格佔幾份」：預設 1 份，想做稀有的神秘獎品就填
-- 比別人小的份數。中獎機率 = 這格份數 ÷ 全部份數，扇形也會照
-- 份數畫寬窄，看起來就知道哪一格難中。
alter table reward_wheel_options add column if not exists weight numeric not null default 1;
