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

    const transactions = await sql`
      select * from transactions
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
