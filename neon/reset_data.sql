-- ============================================================
-- 清空帳戶數據，準備正式上線使用
-- 使用方式：到 Neon 專案後台 > SQL Editor，貼上整份執行
--
-- 會清空：小孩的存款餘額、責任值、交易紀錄、今日責任打卡紀錄、
--        待審核家事項目、責任值異動紀錄、違規紀錄、特殊任務的
--        完成狀態、cron 排程執行紀錄
-- 會保留：小孩名單、家事項目、生活責任項目、特殊任務(名稱金額)、
--        固定零用錢/固定支出規則、全站密碼、家長 PIN
-- ============================================================

begin;

-- 帳戶歸零：存款、目標、責任值都清空（固定零用錢/支出的利率設定不動）
update kids set
  balance = 0,
  goal_name = null,
  goal_amount = null,
  character_points = 0;

-- 特殊任務保留項目本身，但完成/審核狀態重設回「可執行」
update missions set status = 'open';

-- 各種紀錄類資料表整個清空
truncate table transactions;
truncate table responsibility_logs;
truncate table pending_chores;
truncate table character_point_logs;
truncate table violations;
truncate table scheduled_run_logs;

commit;
