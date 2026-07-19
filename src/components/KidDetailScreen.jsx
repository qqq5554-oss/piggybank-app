import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import {
  fetchTransactions,
  completeChoreDirect as apiCompleteChoreDirect,
  setGoal as apiSetGoal,
  toggleResponsibility as apiToggleResponsibility,
  requestMissionComplete as apiRequestMissionComplete,
} from "../api/client";
import { currency, themeOf, computeStreak } from "../utils/format";
import SavingsMeter from "./SavingsMeter";
import TransactionList from "./TransactionList";

export default function KidDetailScreen({ kid, chores, responsibilities, responsibilityLogs, missions, today, onBack, refetch }) {
  const [transactions, setTransactions] = useState([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalName, setGoalName] = useState(kid.goal_name || "");
  const [goalAmount, setGoalAmount] = useState(kid.goal_amount || "");
  const [savingGoal, setSavingGoal] = useState(false);
  const [submittingChoreId, setSubmittingChoreId] = useState(null);
  const [submittingRespId, setSubmittingRespId] = useState(null);
  const [submittingMissionId, setSubmittingMissionId] = useState(null);
  const theme = themeOf(kid.theme_id);

  useEffect(() => {
    fetchTransactions(kid.id).then(setTransactions).catch(console.error);
  }, [kid.id]);

  useEffect(() => {
    if (!editingGoal) {
      setGoalName(kid.goal_name || "");
      setGoalAmount(kid.goal_amount || "");
    }
  }, [kid.goal_name, kid.goal_amount, editingGoal]);

  const completeChore = async (chore) => {
    const ok = window.confirm(`「${chore.name}」完成了嗎？\n將記錄 +${currency(chore.amount)}`);
    if (!ok) return;
    setSubmittingChoreId(chore.id);
    try {
      await apiCompleteChoreDirect(kid.id, chore);
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingChoreId(null);
    }
  };

  const saveGoal = async () => {
    const amount = Number(goalAmount);
    if (!goalName.trim() || !amount || amount <= 0) return;
    setSavingGoal(true);
    try {
      await apiSetGoal(kid.id, { name: goalName.trim(), amount });
      await refetch();
      setEditingGoal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingGoal(false);
    }
  };

  const clearGoal = async () => {
    setSavingGoal(true);
    try {
      await apiSetGoal(kid.id, null);
      await refetch();
      setEditingGoal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingGoal(false);
    }
  };

  const goalPct = kid.goal_amount > 0 ? Math.min(100, Math.round((kid.balance / kid.goal_amount) * 100)) : 0;

  const doneTodayIds = new Set(responsibilityLogs.filter((l) => l.log_date === today).map((l) => l.responsibility_id));
  const streak = computeStreak(responsibilityLogs, responsibilities.length, today);

  const toggleResponsibility = async (resp) => {
    setSubmittingRespId(resp.id);
    try {
      await apiToggleResponsibility(kid.id, resp.id);
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingRespId(null);
    }
  };

  const completeMission = async (mission) => {
    setSubmittingMissionId(mission.id);
    try {
      await apiRequestMissionComplete(mission.id);
      await refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingMissionId(null);
    }
  };

  return (
    <div style={{ background: theme.light, minHeight: "100vh" }}>
      <div style={{ background: theme.accent, display: "flex", alignItems: "center", padding: "14px 12px" }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,.25)", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#fff" />
        </button>
        <span style={{ color: "#fff", fontWeight: 800, marginLeft: 10 }}>
          {kid.avatar} {kid.name}的帳戶
        </span>
      </div>

      <div style={{ textAlign: "center", padding: "18px 20px 8px" }}>
        <div style={{ color: "#B4A392", fontWeight: 700, fontSize: 13 }}>目前存款</div>
        <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 40, fontWeight: 800, color: theme.accentDark }}>
          {currency(kid.balance)}
        </div>
        <SavingsMeter fill={kid.goal_amount ? goalPct : Math.min(100, kid.balance / 10)} color={theme.accent} />
        <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 10, fontSize: 13, fontWeight: 700, color: "#8A7457" }}>
          <span>⭐ 責任值 {kid.character_points || 0}</span>
          <span>🔥 連續 {streak} 天</span>
        </div>
      </div>

      <div style={{ padding: "26px 18px 40px" }}>
        <div style={{ marginBottom: 16 }}>
          {!editingGoal && kid.goal_amount > 0 && (
            <div style={{ background: "#fff", borderRadius: 16, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 800, color: "#8A7457" }}>🎯 目標：{kid.goal_name}</div>
                  <div style={{ fontSize: 13, color: "#B4A392" }}>
                    {currency(kid.balance)} / {currency(kid.goal_amount)}（{goalPct}%）
                  </div>
                </div>
                <button
                  onClick={() => setEditingGoal(true)}
                  style={{ border: `2px solid ${theme.accent}`, borderRadius: 10, padding: "6px 12px", background: "#fff", fontWeight: 700, color: theme.accentDark }}
                >
                  編輯
                </button>
              </div>
            </div>
          )}

          {!editingGoal && !(kid.goal_amount > 0) && (
            <button
              onClick={() => setEditingGoal(true)}
              style={{ width: "100%", border: `2px dashed ${theme.accent}`, borderRadius: 16, padding: "14px 16px", background: "#fff", fontWeight: 800, color: theme.accentDark }}
            >
              ＋ 設定存錢目標
            </button>
          )}

          {editingGoal && (
            <div style={{ background: "#fff", borderRadius: 16, padding: "14px 16px" }}>
              <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 10 }}>🎯 設定目標</div>
              <input
                placeholder="想買什麼？"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", border: "2px solid #E3D3C2", borderRadius: 10, padding: "10px 12px", marginBottom: 8, fontSize: 15 }}
              />
              <input
                type="number"
                placeholder="需要多少錢？"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", border: "2px solid #E3D3C2", borderRadius: 10, padding: "10px 12px", marginBottom: 12, fontSize: 15 }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveGoal}
                  disabled={savingGoal}
                  style={{ flex: 1, border: "none", borderRadius: 10, padding: "10px 12px", background: theme.accent, color: "#fff", fontWeight: 800, opacity: savingGoal ? 0.6 : 1 }}
                >
                  {savingGoal ? "處理中..." : "儲存"}
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  disabled={savingGoal}
                  style={{ border: `2px solid ${theme.accent}`, borderRadius: 10, padding: "10px 12px", background: "#fff", fontWeight: 700, color: theme.accentDark, opacity: savingGoal ? 0.6 : 1 }}
                >
                  取消
                </button>
                {kid.goal_amount > 0 && (
                  <button
                    onClick={clearGoal}
                    disabled={savingGoal}
                    style={{ border: "2px solid #E3D3C2", borderRadius: 10, padding: "10px 12px", background: "#fff", fontWeight: 700, color: "#B4A392", opacity: savingGoal ? 0.6 : 1 }}
                  >
                    清除目標
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {responsibilities.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 8 }}>🏠 今日責任</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {responsibilities.map((r) => {
                const isDone = doneTodayIds.has(r.id);
                const submitting = submittingRespId === r.id;
                return (
                  <button
                    key={r.id}
                    disabled={submitting || isDone}
                    onClick={() => toggleResponsibility(r)}
                    style={{
                      border: `2px solid ${isDone ? "#D8D0C5" : "#EEE4D8"}`,
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: isDone ? "#E9E4DB" : "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      opacity: submitting ? 0.5 : 1,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: isDone ? "#9C917F" : "inherit", textDecoration: isDone ? "line-through" : "none" }}>
                      {isDone ? "✅ " : "⬜ "}
                      {r.name}
                    </span>
                    <span style={{ fontSize: 12, color: "#B4A392", textDecoration: isDone ? "line-through" : "none" }}>+{r.points}⭐</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {missions.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 8 }}>🎯 特殊任務</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {missions.map((m) => {
                const submitting = submittingMissionId === m.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      border: `2px solid ${theme.accent}`,
                      borderRadius: 14,
                      padding: "12px 14px",
                      background: "#fff",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>{m.name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 800, color: theme.accentDark }}>+{m.amount}</span>
                      {m.status === "open" && (
                        <button
                          disabled={submitting}
                          onClick={() => completeMission(m)}
                          style={{ border: "none", borderRadius: 10, padding: "6px 12px", background: theme.accent, color: "#fff", fontWeight: 700, fontSize: 12.5, opacity: submitting ? 0.6 : 1 }}
                        >
                          {submitting ? "送出中..." : "完成"}
                        </button>
                      )}
                      {m.status === "pending" && <span style={{ fontSize: 12, color: "#B4A392" }}>⏳ 審核中</span>}
                      {m.status === "done" && <span style={{ fontSize: 12, color: "#3DB88A" }}>✅ 已完成</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 8 }}>做家事賺錢</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {chores.map((c) => {
            const submitting = submittingChoreId === c.id;
            return (
              <button
                key={c.id}
                disabled={submitting}
                onClick={() => completeChore(c)}
                style={{
                  border: `2px solid ${theme.accent}`,
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: submitting ? 0.5 : 1,
                }}
              >
                <span style={{ fontWeight: 800 }}>{submitting ? "記錄中..." : c.name}</span>
                <span style={{ fontWeight: 800, color: theme.accentDark }}>+{c.amount}</span>
              </button>
            );
          })}
        </div>

        <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 8 }}>最近紀錄</div>
        <TransactionList transactions={transactions.slice(0, 8)} />
      </div>
    </div>
  );
}
