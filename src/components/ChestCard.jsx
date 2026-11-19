import React, { useState } from "react";
import { openChest } from "../api/client";
import { chestStatus, CHEST_EVERY } from "../../lib/streak.js";

// 今日責任頁上面的「七天寶箱」：連續完成幾天、還差幾天，有寶箱的時候可以開。
export default function ChestCard({ kid, responsibilities, responsibilityLogs, chestOpens, today, theme, refetch }) {
  const [opening, setOpening] = useState(null); // null | { stage: "shake" | "open", prize }
  const [error, setError] = useState("");

  const status = chestStatus({
    responsibilityIds: responsibilities.map((r) => r.id),
    logs: responsibilityLogs,
    openedDates: chestOpens.map((c) => c.milestone_date),
    today,
  });
  if (responsibilities.length === 0) return null;

  const { streak, progress, toNext, todayDone, available } = status;
  const hasChest = available.length > 0;

  const open = async () => {
    setError("");
    setOpening({ stage: "shake" });
    // 先晃一下再打開，比較有開寶箱的感覺
    const wait = new Promise((r) => setTimeout(r, 1400));
    try {
      const [res] = await Promise.all([openChest(kid.id), wait]);
      setOpening({ stage: "open", prize: res.prize });
    } catch (e) {
      await wait;
      setOpening(null);
      setError(e.message || "開寶箱失敗");
    }
  };

  const close = async () => {
    setOpening(null);
    await refetch();
  };

  let hint;
  if (hasChest) hint = available.length > 1 ? `有 ${available.length} 個寶箱可以開！` : "寶箱可以開了！";
  else if (streak === 0) hint = `今天全部做完就是第 1 天，連續 ${CHEST_EVERY} 天可以開寶箱`;
  else if (!todayDone) hint = `已經連續 ${streak} 天！今天也做完，就是連續第 ${streak + 1} 天`;
  else hint = `已經連續 ${streak} 天！再 ${toNext} 天就可以開寶箱`;

  return (
    <div
      style={{
        background: hasChest ? "#FFF4E6" : "#fff",
        border: hasChest ? "2px solid #F2C38F" : "2px solid #F1E7DC",
        borderRadius: 16,
        padding: "13px 14px",
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, color: "#5A4632", fontSize: 14.5 }}>🎁 七天寶箱</div>
        <div style={{ fontWeight: 800, color: theme.accentDark, fontSize: 13 }}>🔥 連續 {streak} 天</div>
      </div>

      {/* 7 格進度：做完的天數亮起來，最後一格是寶箱 */}
      <div style={{ display: "flex", gap: 5, marginTop: 10 }} aria-label={`寶箱進度 ${progress} / ${CHEST_EVERY}`}>
        {Array.from({ length: CHEST_EVERY }).map((_, i) => {
          const lit = i < progress;
          const last = i === CHEST_EVERY - 1;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 30,
                borderRadius: 8,
                background: lit ? theme.accent : "#F4EEE6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: last ? 17 : 12,
                fontWeight: 800,
                color: lit ? "#fff" : "#C4B4A0",
              }}
            >
              {last ? "🎁" : lit ? "✓" : i + 1}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12.5, color: "#8A7457", fontWeight: 700, marginTop: 9, lineHeight: 1.6 }}>{hint}</div>
      {error && <div style={{ fontSize: 12.5, color: "#E85D5D", fontWeight: 700, marginTop: 6 }}>{error}</div>}

      {hasChest && (
        <button
          onClick={open}
          disabled={!!opening}
          style={{
            marginTop: 10,
            width: "100%",
            border: "none",
            borderRadius: 14,
            padding: "13px 16px",
            background: "#E8913A",
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            boxShadow: "0 3px 0 #C06E1E",
          }}
        >
          🎁 打開寶箱！
        </button>
      )}

      {opening && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(40,30,20,.55)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <style>{`
            @keyframes chestShake { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-12deg) } 40% { transform: rotate(10deg) } 60% { transform: rotate(-8deg) } 80% { transform: rotate(6deg) } }
            @keyframes chestPop { 0% { transform: scale(.3); opacity: 0 } 70% { transform: scale(1.15); opacity: 1 } 100% { transform: scale(1) } }
          `}</style>
          <div style={{ background: "#fff", borderRadius: 22, padding: "26px 22px", width: "100%", maxWidth: 320, textAlign: "center" }}>
            {opening.stage === "shake" ? (
              <>
                <div style={{ fontSize: 78, animation: "chestShake .5s ease-in-out infinite" }}>🎁</div>
                <div style={{ marginTop: 12, fontWeight: 800, color: "#8A7457" }}>寶箱打開中⋯⋯</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#B86A1E" }}>🎉 連續完成的寶箱獎勵 🎉</div>
                <div style={{ fontSize: 78, marginTop: 6, animation: "chestPop .5s ease-out" }}>{opening.prize.emoji}</div>
                <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 22, fontWeight: 800, color: "#5A4632", marginTop: 6 }}>
                  {opening.prize.label}
                </div>
                <div style={{ fontSize: 12.5, color: "#94795F", marginTop: 8, lineHeight: 1.7 }}>
                  {opening.prize.coupon
                    ? "已經放進券夾，想用的時候拿給爸爸媽媽看"
                    : [opening.prize.points ? `⭐ +${opening.prize.points} 已經入帳` : "", opening.prize.money ? `💰 +${opening.prize.money} 元已經入帳` : ""]
                        .filter(Boolean)
                        .join("、")}
                </div>
                <button
                  onClick={close}
                  style={{ marginTop: 16, width: "100%", border: "none", borderRadius: 14, padding: 12, background: theme.accentDark, color: "#fff", fontWeight: 800, fontSize: 15 }}
                >
                  太棒了！
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
