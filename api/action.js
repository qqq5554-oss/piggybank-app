import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// 需要家長 PIN 驗證才能執行的動作
const PARENT_ACTIONS = new Set([
  "approve_chore",
  "reject_chore",
  "adjust_balance",
  "add_kid",
  "update_kid",
  "add_chore",
  "delete_chore",
  "change_pin",
]);

async function checkPin(pin) {
  const rows = await sql`select value from app_settings where key = 'parent_pin'`;
  return rows[0]?.value === pin;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, pin, payload = {} } = req.body || {};
  if (!action) return res.status(400).json({ error: "缺少 action" });

  try {
    // 家長專屬操作先驗證密碼
    if (PARENT_ACTIONS.has(action)) {
      const ok = await checkPin(pin);
      if (!ok) return res.status(401).json({ error: "密碼錯誤" });
    }

    switch (action) {
      // ------- 小孩可執行的操作（不需密碼） -------
      case "request_chore": {
        const { kidId, choreId, choreName, amount } = payload;
        await sql`
          insert into pending_chores (kid_id, chore_id, chore_name, amount)
          values (${kidId}, ${choreId}, ${choreName}, ${amount})
        `;
        break;
      }
      case "set_goal": {
        const { kidId, goalName, goalAmount } = payload;
        await sql`
          update kids set goal_name = ${goalName}, goal_amount = ${goalAmount}
          where id = ${kidId}
        `;
        break;
      }
      case "verify_pin": {
        const ok = await checkPin(pin);
        return res.status(200).json({ ok });
      }

      // ------- 家長專屬操作（已驗證密碼） -------
      case "approve_chore": {
        const { pendingId } = payload;
        const rows = await sql`select * from pending_chores where id = ${pendingId}`;
        const p = rows[0];
        if (!p) return res.status(404).json({ error: "找不到這筆申請" });

        await sql.transaction([
          sql`
            insert into transactions (kid_id, type, amount, note)
            values (${p.kid_id}, 'income', ${p.amount}, ${"家事：" + p.chore_name})
          `,
          sql`update kids set balance = balance + ${p.amount} where id = ${p.kid_id}`,
          sql`delete from pending_chores where id = ${pendingId}`,
        ]);
        break;
      }
      case "reject_chore": {
        await sql`delete from pending_chores where id = ${payload.pendingId}`;
        break;
      }
      case "adjust_balance": {
        const { kidId, type, amount, note } = payload;
        const delta = type === "income" ? amount : -amount;
        await sql.transaction([
          sql`
            insert into transactions (kid_id, type, amount, note)
            values (${kidId}, ${type}, ${amount}, ${note})
          `,
          sql`update kids set balance = balance + ${delta} where id = ${kidId}`,
        ]);
        break;
      }
      case "add_kid": {
        const { name, avatar, themeId } = payload;
        await sql`
          insert into kids (name, avatar, theme_id, balance)
          values (${name}, ${avatar}, ${themeId}, 0)
        `;
        break;
      }
      case "update_kid": {
        const { kidId, name, avatar, themeId } = payload;
        await sql`
          update kids set
            name = coalesce(${name}, name),
            avatar = coalesce(${avatar}, avatar),
            theme_id = coalesce(${themeId}, theme_id)
          where id = ${kidId}
        `;
        break;
      }
      case "add_chore": {
        const { name, amount } = payload;
        await sql`insert into chores (name, amount) values (${name}, ${amount})`;
        break;
      }
      case "delete_chore": {
        await sql`delete from chores where id = ${payload.choreId}`;
        break;
      }
      case "change_pin": {
        const { newPin } = payload;
        await sql`update app_settings set value = ${newPin} where key = 'parent_pin'`;
        break;
      }
      default:
        return res.status(400).json({ error: "未知的 action" });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "操作失敗" });
  }
}
