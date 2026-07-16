import { neon } from "@neondatabase/serverless";

// ⚠️ DATABASE_URL 只存在伺服器端環境變數，不會被打包進前端程式碼、
// 瀏覽器完全看不到，這是安全的關鍵。
const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [kids, chores, pendingChores] = await Promise.all([
      sql`select * from kids order by created_at`,
      sql`select * from chores order by created_at`,
      sql`select * from pending_chores order by created_at`,
    ]);

    res.status(200).json({ kids, chores, pendingChores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "資料讀取失敗" });
  }
}
