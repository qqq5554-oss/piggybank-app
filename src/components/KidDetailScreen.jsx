import React, { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { fetchTransactions, requestChore as apiRequestChore } from "../api/client";
import { currency, themeOf } from "../utils/format";
import PiggyIllustration from "./PiggyIllustration";
import TransactionList from "./TransactionList";

export default function KidDetailScreen({ kid, chores, pendingChores, onBack, refetch }) {
  const [transactions, setTransactions] = useState([]);
  const theme = themeOf(kid.theme_id);

  useEffect(() => {
    fetchTransactions(kid.id).then(setTransactions).catch(console.error);
  }, [kid.id]);

  const requestChore = async (chore) => {
    await apiRequestChore(kid.id, chore);
    refetch();
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
