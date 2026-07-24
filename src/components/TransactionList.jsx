import React from "react";
import { TrendingUp, TrendingDown, ShieldAlert, Star } from "lucide-react";
import { formatDate } from "../utils/format";

export default function TransactionList({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return <div style={{ textAlign: "center", color: "#B4A392", padding: "20px 0" }}>還沒有任何紀錄</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {transactions.map((t) => {
        const isPoints = t.kind === "points";
        const positive = isPoints ? t.type === "point_gain" : t.type === "income";
        return (
          <div
            key={t.id}
            style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: "10px 12px", borderRadius: 14 }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 10, background: "#F7F1E9", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isPoints ? (
                <Star size={16} color={positive ? "#E8A23D" : "#B4A392"} />
              ) : t.type === "income" ? (
                <TrendingUp size={16} color="#3DB88A" />
              ) : t.type === "penalty" ? (
                <ShieldAlert size={16} color="#E85D5D" />
              ) : (
                <TrendingDown size={16} color="#E8A03D" />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{t.note}</div>
              <div style={{ fontSize: 11, color: "#B4A392" }}>{formatDate(t.created_at)}</div>
            </div>
            <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: positive ? "#2A9670" : "#E85D5D" }}>
              {positive ? "+" : "-"}
              {Math.abs(t.amount)}
              {isPoints ? "⭐" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
