import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { kidId, sitePin } = req.query;
  if (!kidId) return res.status(400).json({ error: "缺少 kidId" });

  try {
    const siteRows = await sql`select value from app_settings where key = 'site_pin'`;
    if (siteRows[0]?.value !== sitePin) {
      return res.status(401).json({ error: "網站密碼錯誤" });
    }

    // 「最近紀錄」把金錢異動（transactions）跟責任值異動（character_point_logs，
    // 包含加減分、生活責任打卡/取消、責任值兌換）合併成同一份時間軸。
    const transactions = await sql`
      select id, 'money' as kind, type, amount, note, created_at
      from transactions
      where kid_id = ${kidId}
      union all
      select id, 'points' as kind,
        case when delta >= 0 then 'point_gain' else 'point_loss' end as type,
        abs(delta) as amount, reason as note, created_at
      from character_point_logs
      where kid_id = ${kidId}
      order by created_at desc
      limit 50
    `;
    res.status(200).json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "資料讀取失敗" });
  }
}
