import React, { useState } from "react";
import { BarChart3 } from "lucide-react";
import { themeOf } from "../utils/format";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const BAR_MAX_H = 52;

// weekStart 是資料庫給的週一日期（YYYY-MM-DD），往後推 7 天
const weekDays = (weekStart) => {
  if (!weekStart) return [];
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(Date.UTC(y, m - 1, d + i));
    return date.toISOString().slice(0, 10);
  });
};

const fmtDate = (iso) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

// 本週表現：每個小孩一張卡，上面是每天的責任完成長條圖，
// 下面是本週的打卡、收入、支出、責任值四個數字。
// 每張卡只有一個資料序列（就是這個小孩），所以不需要圖例，
// 頭像加名字本身就是標題。
export default function WeeklyDashboard({ kids, responsibilities, responsibilityLogs, weekMoney, weekPoints, weekStart, today }) {
  const [picked, setPicked] = useState({}); // 點某一天看那天的細節：{ kidId: 日期 }

  const days = weekDays(weekStart);
  if (days.length === 0 || kids.length === 0) return null;

  const moneyOf = (kidId) => weekMoney.find((w) => w.kid_id === kidId) || { income: 0, expense: 0 };
  // 0 就直接寫 0，不要變成「+0」「-0」
  const signed = (n, sign) => (n === 0 ? "0" : `${sign}${n}`);
  const pointsOf = (kidId) => Number(weekPoints.find((w) => w.kid_id === kidId)?.points || 0);

  return (
    <div style={{ marginTop: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <BarChart3 size={17} color="#94795F" />
        <span style={{ fontWeight: 800, color: "#8A7457", fontSize: 15 }}>本週表現</span>
        <span style={{ fontSize: 11.5, color: "#C4B4A0", marginLeft: "auto" }}>
          {fmtDate(days[0])} – {fmtDate(days[6])}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {kids.map((kid) => {
          const theme = themeOf(kid.theme_id);
          const barColor = theme.accentDark; // 深色調才夠對比，淺色在白底上看不清楚
          const total = responsibilities.filter((r) => r.kid_id === kid.id).length;

          const doneByDay = days.map((day) => ({
            day,
            done: responsibilityLogs.filter(
              (l) => l.kid_id === kid.id && String(l.log_date).slice(0, 10) === day
            ).length,
          }));

          const elapsed = days.filter((d) => d <= today).length;
          const doneSoFar = doneByDay.filter((b) => b.day <= today).reduce((sum, b) => sum + b.done, 0);
          const expected = total * elapsed;
          const rate = expected > 0 ? Math.round((doneSoFar / expected) * 100) : null;

          const money = moneyOf(kid.id);
          const points = pointsOf(kid.id);
          const pickedDay = picked[kid.id];
          const pickedInfo = pickedDay ? doneByDay.find((b) => b.day === pickedDay) : null;

          return (
            <div key={kid.id} style={{ background: "#fff", borderRadius: 18, padding: "14px 16px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 20 }}>{kid.avatar}</span>
                <span style={{ fontWeight: 800, fontSize: 15 }}>{kid.name}</span>
                <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#8A7457", fontWeight: 700 }}>
                  {pickedInfo
                    ? `${fmtDate(pickedInfo.day)} 完成 ${pickedInfo.done}/${total}`
                    : rate === null
                    ? "還沒設定責任項目"
                    : `本週完成率 ${rate}%`}
                </span>
              </div>

              {total > 0 && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 6, marginBottom: 4 }}>
                  {doneByDay.map(({ day, done }, i) => {
                    const isToday = day === today;
                    const isFuture = day > today;
                    const ratio = total > 0 ? Math.min(1, done / total) : 0;
                    const h = Math.max(ratio > 0 ? 6 : 0, Math.round(ratio * BAR_MAX_H));
                    return (
                      <button
                        key={day}
                        onClick={() =>
                          setPicked((p) => ({ ...p, [kid.id]: p[kid.id] === day ? null : day }))
                        }
                        style={{
                          flex: 1,
                          border: "none",
                          background: "none",
                          padding: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        {/* 今天直接標出數字，其他天靠長度就夠了 */}
                        <span style={{ fontSize: 10, fontWeight: 800, color: isToday ? barColor : "transparent", lineHeight: 1 }}>
                          {done}
                        </span>
                        <div
                          style={{
                            width: "100%",
                            height: BAR_MAX_H,
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: "100%",
                              height: h,
                              borderRadius: "4px 4px 0 0",
                              background: isFuture ? "#F1E7DC" : barColor,
                              opacity: isFuture ? 0.5 : 1,
                              minHeight: isFuture ? 3 : undefined,
                              transition: "height .3s ease-out",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: isToday ? 800 : 600,
                            color: isToday ? "#5A4632" : "#B4A392",
                          }}
                        >
                          {WEEKDAYS[i]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 座標軸只需要一條很輕的底線 */}
              <div style={{ height: 1, background: "#F1E7DC", margin: total > 0 ? "2px 0 12px" : "0 0 12px" }} />

              <div style={{ display: "flex", gap: 6 }}>
                <Stat label="打卡" value={total > 0 ? `${doneSoFar}/${expected}` : "—"} />
                <Stat label="收入" value={signed(Math.round(Number(money.income)), "+")} tone={Number(money.income) > 0 ? "#2A9670" : "#B4A392"} />
                <Stat label="支出" value={signed(Math.round(Number(money.expense)), "-")} tone={Number(money.expense) > 0 ? "#E85D5D" : "#B4A392"} />
                <Stat label="責任值" value={`${signed(Math.round(points), points > 0 ? "+" : "")}⭐`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "#5A4632" }) {
  return (
    <div style={{ flex: 1, background: "#FBF6EF", borderRadius: 12, padding: "8px 4px", textAlign: "center" }}>
      <div style={{ fontSize: 10.5, color: "#B4A392", fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 15, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}
