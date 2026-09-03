import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { themeOf } from "../utils/format";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const BAR_MAX_H = 74;

// weekStart 是資料庫給的週一日期（YYYY-MM-DD），往後推 7 天
const weekDays = (weekStart) => {
  if (!weekStart) return [];
  const [y, m, d] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }).map((_, i) =>
    new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10)
  );
};

const fmtDate = (iso) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

// 0 就直接寫 0，不要變成「+0」「-0」
const signed = (n, sign) => (n === 0 ? "0" : `${sign}${n}`);

// 單一小孩的本週表現。
// 這頁只放「這一週怎麼樣」——今日責任、收支、券夾那些在首頁都有自己的
// 按鈕了，這裡不重複，改放每天的完成情況跟每一項責任這週做了幾天。
export default function WeeklyReportScreen({
  kid,
  responsibilities,
  responsibilityLogs,
  weekMoney,
  weekPoints,
  weekStart,
  today,
  onBack,
}) {
  const [pickedDay, setPickedDay] = useState(null);
  const theme = themeOf(kid.theme_id);
  const barColor = theme.accentDark; // 深色調才夠對比，淺色在白底上看不清楚

  const days = weekDays(weekStart);
  const total = responsibilities.length;

  const logsOn = (day) => responsibilityLogs.filter((l) => String(l.log_date).slice(0, 10) === day);
  const doneByDay = days.map((day) => ({ day, done: logsOn(day).length }));

  const elapsed = days.filter((d) => d <= today).length;
  const doneSoFar = doneByDay.filter((b) => b.day <= today).reduce((sum, b) => sum + b.done, 0);
  const expected = total * elapsed;
  const rate = expected > 0 ? Math.round((doneSoFar / expected) * 100) : null;

  const income = Math.round(Number(weekMoney?.income || 0));
  const expense = Math.round(Number(weekMoney?.expense || 0));
  const points = Math.round(Number(weekPoints || 0));

  const picked = pickedDay ? doneByDay.find((b) => b.day === pickedDay) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px 8px" }}>
        <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>
          {kid.avatar} {kid.name}的本週表現
        </span>
        {days.length > 0 && (
          <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#C4B4A0" }}>
            {fmtDate(days[0])} – {fmtDate(days[6])}
          </span>
        )}
      </div>

      <div style={{ padding: "8px 18px 40px" }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "16px 16px 12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: "#B4A392", fontWeight: 700 }}>
              {picked ? `${fmtDate(picked.day)} 完成` : "本週完成率"}
            </span>
            <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 30, fontWeight: 800, color: barColor }}>
              {picked ? `${picked.done}/${total}` : rate === null ? "—" : `${rate}%`}
            </span>
            {!picked && rate !== null && (
              <span style={{ marginLeft: "auto", fontSize: 11.5, color: "#C4B4A0" }}>點長條看那一天</span>
            )}
          </div>

          {total > 0 ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 7 }}>
                {doneByDay.map(({ day, done }, i) => {
                  const isToday = day === today;
                  const isFuture = day > today;
                  const ratio = Math.min(1, done / total);
                  const h = Math.max(ratio > 0 ? 7 : 0, Math.round(ratio * BAR_MAX_H));
                  return (
                    <button
                      key={day}
                      onClick={() => setPickedDay((p) => (p === day ? null : day))}
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
                      {/* 數字貼在自己那根長條的正上方，今天跟被點到的那天才標 */}
                      <div
                        style={{
                          width: "100%",
                          height: BAR_MAX_H + 14,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "flex-end",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            lineHeight: 1,
                            color: isToday || day === pickedDay ? barColor : "transparent",
                          }}
                        >
                          {done}
                        </span>
                        <div
                          style={{
                            width: "100%",
                            height: h,
                            borderRadius: "5px 5px 0 0",
                            background: isFuture ? "#F1E7DC" : barColor,
                            opacity: isFuture ? 0.5 : day === pickedDay || !pickedDay ? 1 : 0.4,
                            minHeight: isFuture ? 3 : undefined,
                            transition: "height .3s ease-out, opacity .2s",
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11.5,
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
              {/* 座標軸只需要一條很輕的底線 */}
              <div style={{ height: 1, background: "#F1E7DC", marginTop: 6 }} />
            </>
          ) : (
            <div style={{ textAlign: "center", color: "#B4A392", fontSize: 13, padding: "10px 0 16px" }}>
              還沒設定責任項目
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 7, marginTop: 12 }}>
          <Stat label="打卡" value={total > 0 ? `${doneSoFar}/${expected}` : "—"} />
          <Stat label="收入" value={signed(income, "+")} tone={income > 0 ? "#2A9670" : "#B4A392"} />
          <Stat label="支出" value={signed(expense, "-")} tone={expense > 0 ? "#E85D5D" : "#B4A392"} />
          <Stat label="責任值" value={`${signed(points, points > 0 ? "+" : "")}⭐`} />
        </div>

        {total > 0 && (
          <>
            <div style={{ fontWeight: 800, color: "#8A7457", fontSize: 13.5, margin: "24px 0 10px" }}>
              每一項責任這週做了幾天
            </div>
            <div style={{ background: "#fff", borderRadius: 18, padding: "6px 14px" }}>
              {responsibilities.map((r, idx) => {
                const doneDays = days.filter((d) => logsOn(d).some((l) => l.responsibility_id === r.id));
                return (
                  <div
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "11px 0",
                      borderTop: idx === 0 ? "none" : "1px solid #F7F1E9",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.name}
                    </span>
                    <span style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                      {days.map((d) => {
                        const on = doneDays.includes(d);
                        return (
                          <span
                            key={d}
                            title={fmtDate(d)}
                            style={{
                              width: 9,
                              height: 9,
                              borderRadius: "50%",
                              background: on ? barColor : d > today ? "#F7F1E9" : "#EEE4D8",
                            }}
                          />
                        );
                      })}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: doneDays.length ? "#5A4632" : "#C4B4A0", width: 30, textAlign: "right" }}>
                      {doneDays.length}/7
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "#5A4632" }) {
  return (
    <div style={{ flex: 1, background: "#fff", borderRadius: 14, padding: "10px 4px", textAlign: "center" }}>
      <div style={{ fontSize: 10.5, color: "#B4A392", fontWeight: 700, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 16, fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}
