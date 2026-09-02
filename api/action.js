import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// 家長專區的 PIN 已經取消，所有操作只要通過「進站密碼」就能執行。
// 這個集合先留空（不是刪掉），之後想恢復某些動作的密碼保護時，
// 只要把 action 名稱加回來就會重新要求 PIN。
const PARENT_ACTIONS = new Set([]);

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
      case "redeem_reward": {
        // 小孩用責任值兌換獎勵：先鎖定成本足夠才扣點，避免點數變負數。
        const { kidId, rewardItemId } = payload;
        const rows = await sql`select name, points_cost, active from reward_items where id = ${rewardItemId}`;
        const item = rows[0];
        if (!item || !item.active) return res.status(404).json({ error: "找不到這個兌換項目" });

        const updated = await sql`
          update kids set character_points = character_points - ${item.points_cost}
          where id = ${kidId} and character_points >= ${item.points_cost}
          returning id
        `;
        if (!updated[0]) return res.status(400).json({ error: "責任值不足，無法兌換" });

        await sql`insert into character_point_logs (kid_id, delta, reason) values (${kidId}, ${-item.points_cost}, ${"兌換：" + item.name})`;
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
        const { kidId, name, points } = payload;
        await sql`insert into responsibilities (kid_id, name, points) values (${kidId}, ${name}, ${points})`;
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
      // ------- 挑戰 -------
      case "add_challenge": {
        const { kidId, name, targetCount = 1, rewardMoney = 0, rewardPoints = 0 } = payload;
        await sql`
          insert into challenges (kid_id, name, target_count, reward_money, reward_points)
          values (${kidId}, ${name}, ${targetCount}, ${rewardMoney}, ${rewardPoints})
        `;
        break;
      }
      case "update_challenge": {
        const { challengeId, name, targetCount, rewardMoney = 0, rewardPoints = 0 } = payload;
        await sql`
          update challenges set
            name = ${name},
            target_count = ${targetCount},
            reward_money = ${rewardMoney},
            reward_points = ${rewardPoints}
          where id = ${challengeId} and status = 'open'
        `;
        break;
      }
      case "delete_challenge": {
        await sql`delete from challenges where id = ${payload.challengeId}`;
        break;
      }
      case "tick_challenge": {
        // 完成一次挑戰：次數 +1，累積到目標次數就標記完成並自動發獎勵
        const { challengeId } = payload;
        const rows = await sql`
          update challenges set done_count = done_count + 1
          where id = ${challengeId} and status = 'open' and done_count < target_count
          returning *
        `;
        const c = rows[0];
        if (!c) return res.status(400).json({ error: "挑戰已完成或不存在" });

        if (c.done_count >= c.target_count) {
          const queries = [
            sql`update challenges set status = 'done', completed_at = now() where id = ${challengeId}`,
          ];
          if (Number(c.reward_money) > 0) {
            queries.push(sql`
              insert into transactions (kid_id, type, amount, note)
              values (${c.kid_id}, 'income', ${c.reward_money}, ${"挑戰完成：" + c.name})
            `);
            queries.push(sql`update kids set balance = balance + ${c.reward_money} where id = ${c.kid_id}`);
          }
          if (Number(c.reward_points) > 0) {
            queries.push(sql`
              insert into character_point_logs (kid_id, delta, reason)
              values (${c.kid_id}, ${c.reward_points}, ${"挑戰完成：" + c.name})
            `);
            queries.push(sql`update kids set character_points = character_points + ${c.reward_points} where id = ${c.kid_id}`);
          }
          await sql.transaction(queries);
          return res.status(200).json({ ok: true, completed: true });
        }
        return res.status(200).json({ ok: true, completed: false });
      }
      case "untick_challenge": {
        // 打錯了可以退回一次（已完成的挑戰不能退，避免獎勵要跟著倒扣）
        const rows = await sql`
          update challenges set done_count = done_count - 1
          where id = ${payload.challengeId} and status = 'open' and done_count > 0
          returning id
        `;
        if (!rows[0]) return res.status(400).json({ error: "沒有可以取消的紀錄" });
        break;
      }

      // ------- 每日獎勵轉盤 -------
      case "spin_reward_wheel": {
        const { kidId } = payload;

        // 條件一：今天的責任要全部完成。這裡自己查資料庫確認，
        // 不能只信前端傳來的狀態。
        const progress = await sql`
          select count(r.id) as total, count(rl.id) as done
          from responsibilities r
          left join responsibility_logs rl
            on rl.responsibility_id = r.id and rl.kid_id = ${kidId} and rl.log_date = current_date
          where r.kid_id = ${kidId}
        `;
        const total = Number(progress[0]?.total || 0);
        const done = Number(progress[0]?.done || 0);
        if (total === 0) return res.status(400).json({ error: "還沒有設定今日責任" });
        if (done < total) return res.status(400).json({ error: "今天的責任還沒有全部完成喔" });

        // 條件二：一天只能轉一次
        const already = await sql`select label from reward_spins where kid_id = ${kidId} and spin_date = current_date`;
        if (already[0]) return res.status(400).json({ error: `今天已經轉過了（${already[0].label}）` });

        const options = await sql`select * from reward_wheel_options order by sort_order, created_at`;
        if (options.length === 0) return res.status(400).json({ error: "還沒有設定獎勵轉盤的格子" });

        // 抽獎在後端決定，重新整理也沒辦法重抽
        const win = options[Math.floor(Math.random() * options.length)];
        const queries = [
          sql`
            insert into reward_spins (kid_id, spin_date, option_id, label)
            values (${kidId}, current_date, ${win.id}, ${win.label})
          `,
        ];
        if (Number(win.reward_points) > 0) {
          queries.push(sql`
            insert into character_point_logs (kid_id, delta, reason)
            values (${kidId}, ${win.reward_points}, ${"轉盤獎勵：" + win.label})
          `);
          queries.push(sql`update kids set character_points = character_points + ${win.reward_points} where id = ${kidId}`);
        }
        if (Number(win.reward_money) > 0) {
          queries.push(sql`
            insert into transactions (kid_id, type, amount, note)
            values (${kidId}, 'income', ${win.reward_money}, ${"轉盤獎勵：" + win.label})
          `);
          queries.push(sql`update kids set balance = balance + ${win.reward_money} where id = ${kidId}`);
        }
        await sql.transaction(queries);

        return res.status(200).json({ ok: true, optionId: win.id, label: win.label });
      }
      case "add_reward_wheel_option": {
        const { label, rewardPoints = 0, rewardMoney = 0, sortOrder = 0 } = payload;
        await sql`
          insert into reward_wheel_options (label, reward_points, reward_money, sort_order)
          values (${label}, ${rewardPoints}, ${rewardMoney}, ${sortOrder})
        `;
        break;
      }
      case "update_reward_wheel_option": {
        const { optionId, label, rewardPoints = 0, rewardMoney = 0 } = payload;
        await sql`
          update reward_wheel_options
          set label = ${label}, reward_points = ${rewardPoints}, reward_money = ${rewardMoney}
          where id = ${optionId}
        `;
        break;
      }
      case "delete_reward_wheel_option": {
        await sql`delete from reward_wheel_options where id = ${payload.optionId}`;
        break;
      }
      case "reorder_reward_wheel_options": {
        // 前端傳來排好的 id 陣列，依序寫回 sort_order
        const ids = payload.ids || [];
        await sql.transaction(
          ids.map((id, i) => sql`update reward_wheel_options set sort_order = ${i + 1} where id = ${id}`)
        );
        break;
      }

      // ------- 小轉盤 -------
      case "add_wheel_option": {
        const { label, sortOrder = 0 } = payload;
        await sql`insert into wheel_options (label, sort_order) values (${label}, ${sortOrder})`;
        break;
      }
      case "update_wheel_option": {
        await sql`update wheel_options set label = ${payload.label} where id = ${payload.optionId}`;
        break;
      }
      case "delete_wheel_option": {
        await sql`delete from wheel_options where id = ${payload.optionId}`;
        break;
      }
      case "reorder_wheel_options": {
        const ids = payload.ids || [];
        await sql.transaction(
          ids.map((id, i) => sql`update wheel_options set sort_order = ${i + 1} where id = ${id}`)
        );
        break;
      }

      // ------- 手機推播訂閱 -------
      case "save_push_subscription": {
        const { endpoint, p256dh, auth: authKey, label = null } = payload;
        await sql`
          insert into push_subscriptions (endpoint, p256dh, auth, label)
          values (${endpoint}, ${p256dh}, ${authKey}, ${label})
          on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth
        `;
        break;
      }
      case "delete_push_subscription": {
        await sql`delete from push_subscriptions where endpoint = ${payload.endpoint}`;
        break;
      }

      case "add_reward_item": {
        const { name, pointsCost } = payload;
        await sql`insert into reward_items (name, points_cost) values (${name}, ${pointsCost})`;
        break;
      }
      case "delete_reward_item": {
        await sql`delete from reward_items where id = ${payload.rewardItemId}`;
        break;
      }
      case "update_reward_item": {
        const { rewardItemId, name, pointsCost } = payload;
        await sql`update reward_items set name = ${name}, points_cost = ${pointsCost} where id = ${rewardItemId}`;
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
