import { neon } from "@neondatabase/serverless";
import { sendPushOnce } from "../lib/push.js";

const sql = neon(process.env.DATABASE_URL);

// 傍晚跑一次，提醒今天還沒完成的生活責任
export default async function handler(req, res) {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  try {
    // 「今天」一律以資料庫的 current_date 為準，跟打卡紀錄用同一套標準
    const [dateRows, rows] = await Promise.all([
      sql`select to_char(current_date, 'YYYY-MM-DD') as today`,
      sql`
        select k.name,
               count(r.id) as total,
               count(rl.id) as done
        from kids k
        join responsibilities r on r.kid_id = k.id
        left join responsibility_logs rl
          on rl.responsibility_id = r.id and rl.kid_id = k.id and rl.log_date = current_date
        group by k.id, k.name
        order by k.created_at
      `,
    ]);
    const dateStr = dateRows[0].today;

    const pending = rows
      .filter((r) => Number(r.total) > 0 && Number(r.done) < Number(r.total))
      .map((r) => `${r.name} 還有 ${Number(r.total) - Number(r.done)} 項`);

    if (pending.length === 0) {
      return res.status(200).json({ ok: true, date: dateStr, pending: 0, sent: 0 });
    }

    const sent = await sendPushOnce(
      "reminder",
      dateStr,
      "今日責任還沒完成",
      pending.join("、") + " 還沒打卡喔"
    );
    res.status(200).json({ ok: true, date: dateStr, pending: pending.length, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "提醒失敗" });
  }
}
