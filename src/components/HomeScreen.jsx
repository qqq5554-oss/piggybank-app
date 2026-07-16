import React from "react";
import { Lock, PiggyBank } from "lucide-react";
import { currency, themeOf } from "../utils/format";

export default function HomeScreen({ kids, onSelectKid, onParentClick }) {
  return (
    <div style={{ padding: "20px 18px 90px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PiggyBank size={30} color="#E86A3A" />
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 22, fontWeight: 800 }}>小小存錢筒</span>
        </div>
        <button
          onClick={onParentClick}
          style={{ width: 38, height: 38, borderRadius: 12, border: "none", background: "#F1E7DC" }}
        >
          <Lock size={18} color="#94795F" />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {kids.map((kid) => {
          const theme = themeOf(kid.theme_id);
          const goalPct =
            kid.goal_amount > 0 ? Math.min(100, Math.round((kid.balance / kid.goal_amount) * 100)) : null;
          return (
            <button
              key={kid.id}
              onClick={() => onSelectKid(kid.id)}
              style={{
                border: `2.5px solid ${theme.accent}`,
                borderRadius: 20,
                padding: "18px 16px",
                background: theme.bg,
                textAlign: "left",
                position: "relative",
              }}
            >
              <div style={{ fontSize: 32 }}>{kid.avatar}</div>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: theme.accentDark, fontSize: 18 }}>
                {kid.name}
              </div>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: theme.accentDark, fontSize: 26 }}>
                {currency(kid.balance)}
              </div>
              {goalPct !== null && (
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#8A7457" }}>
                  🎯 {kid.goal_name} {goalPct}%
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
