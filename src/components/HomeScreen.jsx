import React from "react";
import { Lock, Plus } from "lucide-react";
import { currency, themeOf } from "../utils/format";

export default function HomeScreen({ kids, onSelectKid, onParentClick, onQuickRecord }) {
  const totalBalance = kids.reduce((sum, k) => sum + Number(k.balance || 0), 0);
  const totalPoints = kids.reduce((sum, k) => sum + Number(k.character_points || 0), 0);

  return (
    <div style={{ padding: "20px 18px 100px", position: "relative", minHeight: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 800 }}>總覽</div>
          <div style={{ color: "#B4A392", fontSize: 12.5, marginTop: 2 }}>小小存錢筒</div>
        </div>
        <button
          onClick={onParentClick}
          style={{ width: 38, height: 38, borderRadius: 12, border: "none", background: "#F1E7DC" }}
        >
          <Lock size={18} color="#94795F" />
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "#FFF6F0", border: "2px solid #FFE1CC", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "#B4A392", fontWeight: 700 }}>全部存款</div>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 22, fontWeight: 800, color: "#E86A3A", marginTop: 2 }}>
            {currency(totalBalance)}
          </div>
        </div>
        <div style={{ flex: 1, background: "#FBF3EA", border: "2px solid #EEDFC8", borderRadius: 16, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: "#B4A392", fontWeight: 700 }}>全部責任值</div>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 22, fontWeight: 800, color: "#94795F", marginTop: 2 }}>
            ⭐ {totalPoints}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {kids.map((kid) => {
          const theme = themeOf(kid.theme_id);
          const goalPct =
            kid.goal_amount > 0 ? Math.min(100, Math.round((kid.balance / kid.goal_amount) * 100)) : null;
          return (
            <button
              key={kid.id}
              onClick={() => onSelectKid(kid.id)}
              style={{
                border: `2px solid ${theme.accent}`,
                borderRadius: 18,
                padding: "14px 16px",
                background: theme.bg,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 30 }}>{kid.avatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: theme.accentDark, fontSize: 16 }}>
                  {kid.name}
                </div>
                {goalPct !== null && (
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#8A7457", marginTop: 2 }}>
                    🎯 {kid.goal_name} {goalPct}%
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, color: theme.accentDark, fontSize: 20 }}>
                  {currency(kid.balance)}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#8A7457" }}>⭐ {kid.character_points || 0}</div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onQuickRecord}
        aria-label="快速記帳"
        style={{
          position: "fixed",
          // 內容區塊在寬螢幕上會置中並限制在 480px，用 max() 讓按鈕
          // 貼齊那個欄位的右邊，而不是整個瀏覽器視窗的右邊。
          right: "max(20px, calc((100vw - 480px) / 2 + 20px))",
          bottom: 26,
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "#E86A3A",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 6px 16px rgba(232,106,58,.4)",
        }}
      >
        <Plus size={26} />
      </button>
    </div>
  );
}
