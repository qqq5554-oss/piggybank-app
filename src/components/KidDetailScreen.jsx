import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { fetchTransactions, requestChore as apiRequestChore, setGoal as apiSetGoal } from "../api/client";
import { currency, themeOf } from "../utils/format";
import PiggyIllustration from "./PiggyIllustration";
import TransactionList from "./TransactionList";

export default function KidDetailScreen({ kid, chores, pendingChores, onBack, refetch }) {
  const [transactions, setTransactions] = useState([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalName, setGoalName] = useState(kid.goal_name || "");
  const [goalAmount, setGoalAmount] = useState(kid.goal_amount || "");
  const [savingGoal, setSavingGoal] = useState(false);
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

  const requestChore = async (chore) => {
    await apiRequestChore(kid.id, chore);
    refetch();
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
        <PiggyIllustration fill={kid.goal_amount ? goalPct : Math.min(100, kid.balance / 10)} color={theme.accent} />
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
                  style={{ flex: 1, border: "none", borderRadius: 10, padding: "10px 12px", background: theme.accent, color: "#fff", fontWeight: 800 }}
                >
                  儲存
                </button>
                <button
                  onClick={() => setEditingGoal(false)}
                  disabled={savingGoal}
                  style={{ border: `2px solid ${theme.accent}`, borderRadius: 10, padding: "10px 12px", background: "#fff", fontWeight: 700, color: theme.accentDark }}
                >
                  取消
                </button>
                {kid.goal_amount > 0 && (
                  <button
                    onClick={clearGoal}
                    disabled={savingGoal}
                    style={{ border: "2px solid #E3D3C2", borderRadius: 10, padding: "10px 12px", background: "#fff", fontWeight: 700, color: "#B4A392" }}
                  >
                    清除目標
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {pendingChores.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 8 }}>⏳ 等待爸媽審核</div>
            {pendingChores.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", background: "#fff", padding: "10px 14px", borderRadius: 12, marginBottom: 6 }}>
                <span>{p.chore_name}</span>
                <span style={{ fontWeight: 800, color: theme.accentDark }}>+{p.amount}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 8 }}>做家事賺錢</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {chores.map((c) => {
            const alreadyPending = pendingChores.some((p) => p.chore_id === c.id);
            return (
              <button
                key={c.id}
                disabled={alreadyPending}
                onClick={() => requestChore(c)}
                style={{
                  border: `2px solid ${theme.accent}`,
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: "#fff",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: alreadyPending ? 0.5 : 1,
                }}
              >
                <span style={{ fontWeight: 800 }}>{c.name}</span>
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
