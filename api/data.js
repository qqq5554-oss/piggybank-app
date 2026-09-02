import { neon } from "@neondatabase/serverless";

// ⚠️ DATABASE_URL 只存在伺服器端環境變數，不會被打包進前端程式碼、
// 瀏覽器完全看不到，這是安全的關鍵。
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { sitePin } = req.query;

  try {
    const siteRows = await sql`select value from app_settings where key = 'site_pin'`;
    if (siteRows[0]?.value !== sitePin) {
      return res.status(401).json({ error: "網站密碼錯誤" });
    }

    const [kids, chores, pendingChores, responsibilities, responsibilityLogs, missions, allowanceRules, expenseRules, rewardItems, challenges, wheelOptions, wheelPresets, rewardWheelOptions, rewardSpins, coupons, weekMoney, weekPoints, todayRows] = await Promise.all([
      sql`select * from kids order by created_at`,
      sql`select * from chores order by created_at`,
      sql`select * from pending_chores order by created_at`,
      sql`select * from responsibilities order by created_at`,
      sql`select id, kid_id, responsibility_id, to_char(log_date, 'YYYY-MM-DD') as log_date, created_at from responsibility_logs where log_date > current_date - interval '60 days' order by log_date`,
      sql`select * from missions order by created_at`,
      sql`select * from allowance_rules order by created_at`,
      sql`select * from expense_rules order by created_at`,
      sql`select * from reward_items order by points_cost, created_at`,
      sql`select * from challenges order by status, created_at`,
      sql`select * from wheel_options order by sort_order, created_at`,
      sql`select * from wheel_presets order by sort_order, created_at`,
      sql`select * from reward_wheel_options order by sort_order, created_at`,
      sql`select kid_id, label, to_char(spin_date, 'YYYY-MM-DD') as spin_date from reward_spins where spin_date = current_date`,
      sql`select * from coupons where status = 'unused' or used_at > now() - interval '7 days' order by created_at desc`,
      // 本週（週一起算）的金錢與責任值彙總，給首頁的儀表板用
      sql`
        select kid_id,
               coalesce(sum(case when type = 'income' then amount else 0 end), 0) as income,
               coalesce(sum(case when type in ('expense', 'penalty') then amount else 0 end), 0) as expense
        from transactions
        where created_at >= date_trunc('week', current_date)
        group by kid_id
      `,
      sql`
        select kid_id, coalesce(sum(delta), 0) as points
        from character_point_logs
        where created_at >= date_trunc('week', current_date)
        group by kid_id
      `,
      sql`select to_char(current_date, 'YYYY-MM-DD') as today, to_char(date_trunc('week', current_date), 'YYYY-MM-DD') as week_start`,
    ]);
    // 「今天」以資料庫伺服器的 current_date 為準，不要用瀏覽器自己算的日期，
    // 避免裝置時區跟資料庫時區對不起來，導致今天打的卡永遠比對不到。
    // 用 to_char 強制轉成純文字 YYYY-MM-DD，避免驅動程式把 date 型別
    // 轉成帶時間的 Date 物件，跟 log_date 格式對不齊。
    const today = todayRows[0].today;
    const weekStart = todayRows[0].week_start;

    res.status(200).json({
      kids,
      chores,
      pendingChores,
      responsibilities,
      responsibilityLogs,
      missions,
      allowanceRules,
      expenseRules,
      rewardItems,
      challenges,
      wheelOptions,
      wheelPresets,
      rewardWheelOptions,
      rewardSpins,
      coupons,
      weekMoney,
      weekPoints,
      today,
      weekStart,
      // 推播用的公開金鑰，前端訂閱推播時要用（公開金鑰本來就可以給瀏覽器看）
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "資料讀取失敗" });
  }
}
