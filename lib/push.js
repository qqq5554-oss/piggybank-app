import webpush from "web-push";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// VAPID 金鑰沒設定的話就當作沒有開通推播，所有推播函式安靜地跳過，
// 不會影響零用錢結算等主要流程。
function isConfigured() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

// 把通知送給所有訂閱過的手機，回傳成功送出的數量
export async function sendPush(title, body, url = "/") {
  if (!isConfigured()) return 0;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:piggybank@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const subs = await sql`select * from push_subscriptions`;
  let sent = 0;

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title, body, url })
      );
      sent++;
    } catch (err) {
      // 404/410 代表這個訂閱已經失效（App 被移除、權限被關掉），直接清掉
      if (err.statusCode === 404 || err.statusCode === 410) {
        await sql`delete from push_subscriptions where endpoint = ${s.endpoint}`;
      } else {
        console.error("推播失敗", err.statusCode, err.message);
      }
    }
  }
  return sent;
}

// 同一種通知同一天只會發一次：先搶著寫入 notification_logs，
// 寫得進去（代表今天還沒發過）才真的送出去。
export async function sendPushOnce(kind, dateStr, title, body, url = "/") {
  const rows = await sql`
    insert into notification_logs (kind, ref_date) values (${kind}, ${dateStr})
    on conflict (kind, ref_date) do nothing
    returning id
  `;
  if (!rows[0]) return 0;
  return sendPush(title, body, url);
}
