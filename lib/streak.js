// 連續完成今日責任 → 每 7 天開一個寶箱。前端（顯示進度）和後端（真的開寶箱）共用。
//
// 「完成的一天」＝那天把現在設定的每一項責任都打卡了。
// 連續天數：今天做完了就算到今天；今天還沒做完，就算到昨天（今天還有機會，不算中斷）。
// 寶箱：每一段連續的第 7、14、21… 天各一個。開過的記在 chest_opens（用那一天的日期當編號），
// 沒開的寶箱留 14 天，過了就沒有了。

export const CHEST_EVERY = 7;
export const CHEST_KEEP_DAYS = 14;

const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// responsibilityIds：這個小孩現在的責任；logs：{ responsibility_id, log_date }；
// openedDates：開過的寶箱日期；today：YYYY-MM-DD；lookback：往回看幾天
export function chestStatus({ responsibilityIds, logs, openedDates = [], today, lookback = 60 }) {
  const empty = { streak: 0, progress: 0, toNext: CHEST_EVERY, todayDone: false, available: [] };
  if (!today || responsibilityIds.length === 0) return empty;

  const ids = new Set(responsibilityIds);
  const doneByDay = new Map();
  logs.forEach((l) => {
    if (!ids.has(l.responsibility_id)) return;
    const day = String(l.log_date).slice(0, 10);
    if (!doneByDay.has(day)) doneByDay.set(day, new Set());
    doneByDay.get(day).add(l.responsibility_id);
  });
  const complete = (day) => (doneByDay.get(day)?.size || 0) >= ids.size;

  // 從最早往今天走，找出每一段連續完成的日子，記下每段的第 7、14… 天
  const milestones = [];
  let run = 0;
  for (let i = lookback; i >= 0; i--) {
    const day = addDays(today, -i);
    if (complete(day)) {
      run += 1;
      if (run % CHEST_EVERY === 0) milestones.push(day);
    } else if (i > 0) {
      run = 0; // 今天還沒做完不算中斷
    }
  }

  const todayDone = complete(today);
  // run 現在是「算到今天（做完的話）或昨天」的連續天數
  const streak = run;
  const opened = new Set(openedDates.map((d) => String(d).slice(0, 10)));
  const oldest = addDays(today, -(CHEST_KEEP_DAYS - 1));
  const available = milestones.filter((d) => d >= oldest && !opened.has(d));
  const progress = streak === 0 ? 0 : streak % CHEST_EVERY || CHEST_EVERY;
  return { streak, progress, toNext: CHEST_EVERY - (streak % CHEST_EVERY), todayDone, available };
}
