import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

// month 為 1-12（一般人習慣的月份），回傳該月最後一天是幾號
function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// 月結日超過當月天數時（例如設定 31 號但 2 月只有 28 天），改用月底那天
function isDueMonthly(dayOfMonth, today) {
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const effectiveDay = Math.min(dayOfMonth, daysInMonth(year, month));
  return today.getUTCDate() === effectiveDay;
}

async function alreadyRan(ruleType, ruleId, dateStr) {
  const rows = await sql`
    select 1 from scheduled_run_logs
    where rule_type = ${ruleType} and rule_id = ${ruleId} and run_date = ${dateStr}
  `;
  return rows.length > 0;
}

export default async function handler(req, res) {
  // Vercel Cron 呼叫時會帶上這組密鑰，避免任何人隨便打這支 API 觸發結算
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const dow = today.getUTCDay();
  const result = { date: dateStr, allowance: 0, expense: 0, interest: 0 };

  try {
    // ------- 固定零用錢 -------
    const allowanceRules = await sql`select * from allowance_rules where active = true`;
    for (const rule of allowanceRules) {
      const due = rule.frequency === "weekly" ? rule.day_of_week === dow : isDueMonthly(rule.day_of_month, today);
      if (!due || (await alreadyRan("allowance", rule.id, dateStr))) continue;

      try {
        await sql.transaction([
          sql`insert into transactions (kid_id, type, amount, note) values (${rule.kid_id}, 'income', ${rule.amount}, '固定零用錢')`,
          sql`update kids set balance = balance + ${rule.amount} where id = ${rule.kid_id}`,
          sql`insert into scheduled_run_logs (rule_type, rule_id, run_date) values ('allowance', ${rule.id}, ${dateStr})`,
        ]);
        result.allowance++;
      } catch (err) {
        console.error("allowance rule 執行失敗", rule.id, err.message);
      }
    }

    // ------- 固定支出 -------
    const expenseRules = await sql`select * from expense_rules where active = true`;
    for (const rule of expenseRules) {
      if (!isDueMonthly(rule.day_of_month, today) || (await alreadyRan("expense", rule.id, dateStr))) continue;

      try {
        await sql.transaction([
          sql`insert into transactions (kid_id, type, amount, note) values (${rule.kid_id}, 'expense', ${rule.amount}, ${rule.name})`,
          sql`update kids set balance = balance - ${rule.amount} where id = ${rule.kid_id}`,
          sql`insert into scheduled_run_logs (rule_type, rule_id, run_date) values ('expense', ${rule.id}, ${dateStr})`,
        ]);
        result.expense++;
      } catch (err) {
        console.error("expense rule 執行失敗", rule.id, err.message);
      }
    }

    // ------- 存錢利息：每月 1 號，依上個月底餘額結算 -------
    if (today.getUTCDate() === 1) {
      const kids = await sql`select id, balance, interest_rate from kids where interest_rate > 0`;
      for (const kid of kids) {
        if (await alreadyRan("interest", kid.id, dateStr)) continue;
        const interest = Math.round(kid.balance * kid.interest_rate * 100) / 100;
        if (interest <= 0) continue;

        try {
          await sql.transaction([
            sql`insert into transactions (kid_id, type, amount, note) values (${kid.id}, 'income', ${interest}, '存款利息')`,
            sql`update kids set balance = balance + ${interest} where id = ${kid.id}`,
            sql`insert into scheduled_run_logs (rule_type, rule_id, run_date) values ('interest', ${kid.id}, ${dateStr})`,
          ]);
          result.interest++;
        } catch (err) {
          console.error("interest 結算失敗", kid.id, err.message);
        }
      }
    }

    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "結算失敗" });
  }
}
