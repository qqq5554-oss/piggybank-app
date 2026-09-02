import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, Gift, Star } from "lucide-react";
import { toggleResponsibility as apiToggleResponsibility, redeemReward as apiRedeemReward, fetchTransactions } from "../api/client";
import { themeOf } from "../utils/format";
import TransactionList from "./TransactionList";
import RewardWheelModal from "./RewardWheelModal";

// 「今日責任」獨立功能頁：上面打卡，下面用責任值兌換獎勵
export default function TodayResponsibilityScreen({
  kid,
  responsibilities,
  responsibilityLogs,
  rewardItems,
  rewardWheelOptions = [],
  todaySpin = null,
  today,
  onBack,
  refetch,
}) {
  const [submittingId, setSubmittingId] = useState(null);
  const [redeemingId, setRedeemingId] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [showWheel, setShowWheel] = useState(false);
  const theme = themeOf(kid.theme_id);

  // 這一頁只看責任值的來龍去脈（打卡加分、家長加減分、兌換扣點）
  const loadHistory = useCallback(async () => {
    try {
      const rows = await fetchTransactions(kid.id);
      setPointsHistory(rows.filter((t) => t.kind === "points"));
    } catch (err) {
      console.error("讀取責任值紀錄失敗", err);
    }
  }, [kid.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const todayDatePart = today ? String(today).slice(0, 10) : null;
  const doneTodayIds = new Set(
    responsibilityLogs.filter((l) => String(l.log_date).slice(0, 10) === todayDatePart).map((l) => l.responsibility_id)
  );
  const doneCount = responsibilities.filter((r) => doneTodayIds.has(r.id)).length;
  const allDone = responsibilities.length > 0 && doneCount === responsibilities.length;

  const toggle = async (resp) => {
    setSubmittingId(resp.id);
    try {
      await apiToggleResponsibility(kid.id, resp.id);
      await refetch();
      await loadHistory();
    } catch (err) {
      alert(err.message || "操作失敗");
    } finally {
      setSubmittingId(null);
    }
  };

  const redeem = async (item) => {
    // numeric 欄位從資料庫回來是字串，一定要轉數字再比大小
    if (Number(kid.character_points || 0) < Number(item.points_cost)) {
      alert("責任值不夠喔，再加油一下！");
      return;
    }
    if (!window.confirm(`確定要用 ${item.points_cost}⭐ 兌換「${item.name}」嗎？`)) return;
    setRedeemingId(item.id);
    try {
      await apiRedeemReward(kid.id, item.id);
      await refetch();
      await loadHistory();
    } catch (err) {
      alert(err.message || "兌換失敗");
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: theme.accent, padding: "16px 14px 20px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,.3)", border: "none", borderRadius: 10, width: 34, height: 34 }}>
            <ChevronLeft size={22} color="#fff" />
          </button>
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>
            {kid.avatar} 今日責任
          </span>
        </div>
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 34, fontWeight: 800 }}>
            {doneCount} / {responsibilities.length}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>目前責任值 ⭐ {kid.character_points || 0}</div>
        </div>
      </div>

      <div style={{ padding: "18px 18px 40px" }}>
        {responsibilities.length === 0 && (
          <div style={{ textAlign: "center", color: "#B4A392", padding: "20px 0" }}>
            還沒有設定生活責任項目，可以到「管理」裡新增
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 26 }}>
          {responsibilities.map((r) => {
            const done = doneTodayIds.has(r.id);
            const busy = submittingId === r.id;
            return (
              <button
                key={r.id}
                disabled={busy}
                onClick={() => toggle(r)}
                style={{
                  border: "none",
                  borderRadius: 16,
                  padding: "16px 16px",
                  background: done ? "#EFE7DC" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 20 }}>{done ? "✅" : "⬜"}</span>
                <span
                  style={{
                    flex: 1,
                    textAlign: "left",
                    fontWeight: 700,
                    fontSize: 15.5,
                    color: done ? "#B4A392" : "#5A4632",
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {r.name}
                </span>
                <span style={{ fontWeight: 800, color: done ? "#C4B4A0" : "#94795F", fontSize: 14 }}>+{r.points}⭐</span>
              </button>
            );
          })}
        </div>

        {allDone && (
          <div style={{ marginBottom: 26 }}>
            {todaySpin ? (
              <div
                style={{
                  background: "#FFF6F0",
                  border: "2px solid #FFE1CC",
                  borderRadius: 16,
                  padding: "14px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12.5, color: "#B4A392", fontWeight: 700 }}>🎡 今天的轉盤獎勵</div>
                <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 20, fontWeight: 800, color: "#E86A3A", marginTop: 2 }}>
                  {todaySpin.label}
                </div>
                <div style={{ fontSize: 11.5, color: "#C4B4A0", marginTop: 4 }}>明天完成責任後可以再轉一次</div>
              </div>
            ) : (
              <button
                onClick={() => setShowWheel(true)}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 16,
                  padding: 16,
                  background: "#E86A3A",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 16,
                  boxShadow: "0 4px 14px rgba(232,106,58,.35)",
                }}
              >
                🎡 今天的獎勵轉盤
              </button>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Gift size={17} color="#94795F" />
          <span style={{ fontWeight: 800, color: "#8A7457" }}>用責任值兌換獎勵</span>
        </div>

        {rewardItems.length === 0 && (
          <div style={{ textAlign: "center", color: "#B4A392", padding: "16px 0", fontSize: 13 }}>
            還沒有設定兌換獎勵，可以到「管理」→「兌換清單」新增
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rewardItems.map((item) => {
            const affordable = Number(kid.character_points || 0) >= Number(item.points_cost);
            const busy = redeemingId === item.id;
            return (
              <button
                key={item.id}
                disabled={busy}
                onClick={() => redeem(item)}
                style={{
                  border: `2px solid ${affordable ? theme.accent : "#EEE4D8"}`,
                  borderRadius: 14,
                  padding: "13px 15px",
                  background: affordable ? "#fff" : "#F7F1E9",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: busy ? 0.5 : 1,
                }}
              >
                <span style={{ fontWeight: 700, color: affordable ? "#5A4632" : "#B4A392" }}>{item.name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: affordable ? theme.accentDark : "#B4A392" }}>
                  {item.points_cost}⭐
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "26px 0 10px" }}>
          <Star size={17} color="#94795F" />
          <span style={{ fontWeight: 800, color: "#8A7457" }}>責任值紀錄</span>
        </div>
        <TransactionList transactions={pointsHistory.slice(0, 20)} />
      </div>

      {showWheel && (
        <RewardWheelModal
          kid={kid}
          options={rewardWheelOptions}
          onClose={() => setShowWheel(false)}
          refetch={refetch}
        />
      )}
    </div>
  );
}
