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
  "add_responsibility",
  "delete_responsibility",
  "add_mission",
  "approve_mission",
  "reject_mission",
  "delete_mission",
  "award_points",
  "add_violation",
  "add_allowance_rule",
  "delete_allowance_rule",
  "add_expense_rule",
  "delete_expense_rule",
  "set_interest_rate",
  "update_chore",
  "update_responsibility",
  "update_mission",
  "update_allowance_rule",
  "update_expense_rule",
  "change_site_pin",
]);

async function checkPin(pin) {
  const rows = await sql`select value from app_settings where key = 'parent_pin'`;
  return rows[0]?.value === pin;
}

async function checkSitePin(sitePin) {
  const rows = await sql`select value from app_settings where key = 'site_pin'`;
  return rows[0]?.value === sitePin;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { action, pin, sitePin, payload = {} } = req.body || {};
  if (!action) return res.status(400).json({ error: "缺少 action" });

  try {
    // 全站密碼先驗證（verify_site_pin 本身除外，因為它就是在測試密碼對不對）
    if (action !== "verify_site_pin") {
      const siteOk = await checkSitePin(sitePin);
      if (!siteOk) return res.status(401).json({ error: "網站密碼錯誤" });
    }

    // 家長專屬操作再驗證家長密碼
    if (PARENT_ACTIONS.has(action)) {
      const ok = await checkPin(pin);
      if (!ok) return res.status(401).json({ error: "密碼錯誤" });
    }

    switch (action) {
      case "verify_site_pin": {
        const ok = await checkSitePin(sitePin);
        return res.status(200).json({ ok });
      }
      // ------- 小孩可執行的操作（不需密碼） -------
      case "request_chore": {
        const { kidId, choreId, choreName, amount } = payload;
        await sql`
          insert into pending_chores (kid_id, chore_id, chore_name, amount)
          values (${kidId}, ${choreId}, ${choreName}, ${amount})
        `;
        break;
      }
      case "complete_chore_direct": {
        // 家長直接操作 App 幫小孩記錄家事完成，跳過「送出待審核」，
        // 點擊時前端已經跳出確認視窗，這裡直接入帳。
        const { kidId, choreName, amount } = payload;
        await sql.transaction([
          sql`
            insert into transactions (kid_id, type, amount, note)
            values (${kidId}, 'income', ${amount}, ${"家事：" + choreName})
          `,
          sql`update kids set balance = balance + ${amount} where id = ${kidId}`,
        ]);
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
      case "toggle_responsibility": {
        const { kidId, responsibilityId } = payload;
        const rows = await sql`
          select r.points, r.name, rl.id as log_id
          from responsibilities r
          left join responsibility_logs rl
            on rl.responsibility_id = r.id and rl.kid_id = ${kidId} and rl.log_date = current_date
          where r.id = ${responsibilityId}
        `;
        const r = rows[0];
        if (!r) return res.status(404).json({ error: "找不到這項責任" });

        if (r.log_id) {
          await sql.transaction([
            sql`delete from responsibility_logs where id = ${r.log_id}`,
            sql`insert into character_point_logs (kid_id, delta, reason) values (${kidId}, ${-r.points}, ${"取消打卡：" + r.name})`,
            sql`update kids set character_points = character_points - ${r.points} where id = ${kidId}`,
          ]);
        } else {
          await sql.transaction([
            sql`insert into responsibility_logs (kid_id, responsibility_id, log_date) values (${kidId}, ${responsibilityId}, current_date)`,
            sql`insert into character_point_logs (kid_id, delta, reason) values (${kidId}, ${r.points}, ${"完成：" + r.name})`,
            sql`update kids set character_points = character_points + ${r.points} where id = ${kidId}`,
          ]);
        }
        break;
      }
      case "request_mission_complete": {
        const rows = await sql`
          update missions set status = 'pending'
          where id = ${payload.missionId} and status = 'open'
          returning id
        `;
        if (!rows[0]) return res.status(400).json({ error: "任務狀態不正確" });
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
      case "update_chore": {
        const { choreId, name, amount } = payload;
        await sql`update chores set name = ${name}, amount = ${amount} where id = ${choreId}`;
        break;
      }
      case "change_pin": {
        const { newPin } = payload;
        await sql`update app_settings set value = ${newPin} where key = 'parent_pin'`;
        break;
      }
      case "change_site_pin": {
        const { newSitePin } = payload;
        await sql`update app_settings set value = ${newSitePin} where key = 'site_pin'`;
        break;
      }
      case "add_responsibility": {
        const { name, points } = payload;
        await sql`insert into responsibilities (name, points) values (${name}, ${points})`;
        break;
      }
      case "delete_responsibility": {
        await sql`delete from responsibilities where id = ${payload.responsibilityId}`;
        break;
      }
      case "update_responsibility": {
        const { responsibilityId, name, points } = payload;
        await sql`update responsibilities set name = ${name}, points = ${points} where id = ${responsibilityId}`;
        break;
      }
      case "add_mission": {
        const { kidId, name, amount } = payload;
        await sql`insert into missions (kid_id, name, amount) values (${kidId}, ${name}, ${amount})`;
        break;
      }
      case "approve_mission": {
        const { missionId } = payload;
        const rows = await sql`select * from missions where id = ${missionId}`;
        const m = rows[0];
        if (!m) return res.status(404).json({ error: "找不到這項任務" });

        await sql.transaction([
          sql`
            insert into transactions (kid_id, type, amount, note)
            values (${m.kid_id}, 'income', ${m.amount}, ${"特殊任務：" + m.name})
          `,
          sql`update kids set balance = balance + ${m.amount} where id = ${m.kid_id}`,
          sql`update missions set status = 'done' where id = ${missionId}`,
        ]);
        break;
      }
      case "reject_mission": {
        await sql`update missions set status = 'open' where id = ${payload.missionId}`;
        break;
      }
      case "delete_mission": {
        await sql`delete from missions where id = ${payload.missionId}`;
        break;
      }
      case "update_mission": {
        const { missionId, name, amount } = payload;
        const rows = await sql`
          update missions set name = ${name}, amount = ${amount}
          where id = ${missionId} and status = 'open'
          returning id
        `;
        if (!rows[0]) return res.status(400).json({ error: "任務已送出審核，無法編輯" });
        break;
      }
      case "award_points": {
        const { kidId, delta, reason } = payload;
        await sql.transaction([
          sql`insert into character_point_logs (kid_id, delta, reason) values (${kidId}, ${delta}, ${reason})`,
          sql`update kids set character_points = character_points + ${delta} where id = ${kidId}`,
        ]);
        break;
      }
      case "add_violation": {
        const { kidId, description, moneyDelta = 0, pointsDelta = 0, privilegeNote = null } = payload;
        const queries = [
          sql`
            insert into violations (kid_id, description, money_delta, points_delta, privilege_note)
            values (${kidId}, ${description}, ${moneyDelta}, ${pointsDelta}, ${privilegeNote})
          `,
        ];
        if (moneyDelta) {
          queries.push(sql`
            insert into transactions (kid_id, type, amount, note)
            values (${kidId}, 'penalty', ${Math.abs(moneyDelta)}, ${description})
          `);
          queries.push(sql`update kids set balance = balance + ${moneyDelta} where id = ${kidId}`);
        }
        if (pointsDelta) {
          queries.push(sql`insert into character_point_logs (kid_id, delta, reason) values (${kidId}, ${pointsDelta}, ${description})`);
          queries.push(sql`update kids set character_points = character_points + ${pointsDelta} where id = ${kidId}`);
        }
        await sql.transaction(queries);
        break;
      }
      case "add_allowance_rule": {
        const { kidId, amount, frequency, dayOfWeek = null, dayOfMonth = null } = payload;
        await sql`
          insert into allowance_rules (kid_id, amount, frequency, day_of_week, day_of_month)
          values (${kidId}, ${amount}, ${frequency}, ${dayOfWeek}, ${dayOfMonth})
        `;
        break;
      }
      case "delete_allowance_rule": {
        await sql`delete from allowance_rules where id = ${payload.ruleId}`;
        break;
      }
      case "update_allowance_rule": {
        const { ruleId, amount, frequency, dayOfWeek = null, dayOfMonth = null } = payload;
        await sql`
          update allowance_rules set
            amount = ${amount},
            frequency = ${frequency},
            day_of_week = ${dayOfWeek},
            day_of_month = ${dayOfMonth}
          where id = ${ruleId}
        `;
        break;
      }
      case "add_expense_rule": {
        const { kidId, name, amount, dayOfMonth } = payload;
        await sql`
          insert into expense_rules (kid_id, name, amount, day_of_month)
          values (${kidId}, ${name}, ${amount}, ${dayOfMonth})
        `;
        break;
      }
      case "delete_expense_rule": {
        await sql`delete from expense_rules where id = ${payload.ruleId}`;
        break;
      }
      case "update_expense_rule": {
        const { ruleId, name, amount, dayOfMonth } = payload;
        await sql`update expense_rules set name = ${name}, amount = ${amount}, day_of_month = ${dayOfMonth} where id = ${ruleId}`;
        break;
      }
      case "set_interest_rate": {
        const { kidId, rate } = payload;
        await sql`update kids set interest_rate = ${rate} where id = ${kidId}`;
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
