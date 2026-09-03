import React, { useState } from "react";
import { ChevronLeft, Ticket } from "lucide-react";
import { useCoupon } from "../api/client";
import { themeOf, formatDate } from "../utils/format";

// 券夾：轉盤抽到但當下用不到的獎勵會存成一張券放在這裡，
// 想用的時候再核銷（用掉就不能再用）。
export default function CouponScreen({ kid, coupons, onBack, refetch }) {
  const [usingId, setUsingId] = useState(null);
  const theme = themeOf(kid.theme_id);

  const unused = coupons.filter((c) => c.status === "unused");
  const used = coupons.filter((c) => c.status === "used");

  const spend = async (coupon) => {
    if (!window.confirm(`要使用「${coupon.label}」這張券嗎？用掉之後就不能再用了。`)) return;
    setUsingId(coupon.id);
    try {
      await useCoupon(coupon.id);
      await refetch();
    } catch (err) {
      alert(err.message || "使用失敗");
    } finally {
      setUsingId(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px 8px" }}>
        <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>
          {kid.avatar} 券夾
        </span>
      </div>

      <div style={{ padding: "8px 18px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <Ticket size={17} color="#94795F" />
          <span style={{ fontWeight: 800, color: "#8A7457" }}>可以使用的券（{unused.length} 張）</span>
        </div>

        {unused.length === 0 && (
          <div style={{ textAlign: "center", color: "#B4A392", padding: "26px 0", fontSize: 13.5, lineHeight: 1.9 }}>
            目前沒有券
            <br />
            <span style={{ fontSize: 12.5, color: "#C4B4A0" }}>每天把今日責任全部完成，就可以轉獎勵轉盤抽券</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {unused.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "#FFF9F2",
                border: "2px dashed #E8C9A8",
                borderRadius: 16,
                padding: "14px 16px",
                opacity: usingId === c.id ? 0.5 : 1,
              }}
            >
              <span style={{ fontSize: 24 }}>🎟️</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 15.5 }}>{c.label}</div>
                <div style={{ fontSize: 11.5, color: "#B4A392", marginTop: 2 }}>{formatDate(c.created_at)} 抽到</div>
              </div>
              <button
                onClick={() => spend(c)}
                disabled={usingId === c.id}
                style={{ border: "none", borderRadius: 12, padding: "11px 18px", background: theme.accentDark, color: "#fff", fontWeight: 800, fontSize: 14 }}
              >
                使用
              </button>
            </div>
          ))}
        </div>

        {used.length > 0 && (
          <>
            <div style={{ fontWeight: 800, color: "#8A7457", fontSize: 13.5, margin: "26px 0 10px" }}>最近用掉的券</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {used.map((c) => (
                <div
                  key={c.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "#F7F1E9", borderRadius: 14, padding: "11px 14px" }}
                >
                  <span style={{ fontSize: 17, opacity: 0.5 }}>🎟️</span>
                  <span style={{ flex: 1, fontWeight: 700, color: "#B4A392", textDecoration: "line-through" }}>{c.label}</span>
                  {c.used_at && <span style={{ fontSize: 11, color: "#C4B4A0" }}>{formatDate(c.used_at)} 用掉</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
