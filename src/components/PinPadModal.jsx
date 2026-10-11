import React, { useState } from "react";
import { X } from "lucide-react";

// 4 碼數字密碼輸入框（蓋在畫面上）。
// 按滿 4 碼自動送出，onSubmit 回傳 false 或丟錯就搖一下、清空重打。
export default function PinPadModal({ title, hint, onSubmit, onClose }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const fail = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 400);
    setPin("");
  };

  const press = async (d) => {
    if (checking) return;
    if (d === "⌫") return setPin((p) => p.slice(0, -1));
    const next = (pin + d).slice(0, 4);
    setPin(next);
    setError("");
    if (next.length < 4) return;

    setChecking(true);
    try {
      const ok = await onSubmit(next);
      if (ok === false) fail("密碼錯誤");
    } catch (e) {
      fail(e.message || "密碼錯誤");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(60,45,30,.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#FBF6EF",
          borderRadius: "22px 22px 0 0",
          padding: "16px 24px calc(26px + env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          animation: "toastIn .2s ease-out",
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} aria-label="關閉" style={{ border: "none", background: "#F1E7DC", borderRadius: 10, width: 32, height: 32 }}>
            <X size={17} color="#8A7457" />
          </button>
        </div>
        <div style={{ textAlign: "center", fontWeight: 800, fontSize: 17, marginTop: -6 }}>{title}</div>
        {hint && <div style={{ textAlign: "center", fontSize: 12.5, color: "#B4A392", marginTop: 6, lineHeight: 1.6, whiteSpace: "pre-line" }}>{hint}</div>}

        <div style={{ display: "flex", justifyContent: "center", gap: 14, margin: "18px 0 6px", animation: shake ? "shakeX 0.4s" : "none" }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? "#94795F" : "#E3D3C2" }} />
          ))}
        </div>
        <div style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#E85D5D", minHeight: 18 }}>
          {checking ? <span style={{ color: "#B4A392" }}>確認中...</span> : error}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 260, margin: "10px auto 0" }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
            d === "" ? (
              <div key={i} />
            ) : (
              <button
                key={i}
                onClick={() => press(d)}
                disabled={checking}
                style={{
                  height: 54,
                  borderRadius: 16,
                  border: "none",
                  background: "#fff",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#5A4632",
                  opacity: checking ? 0.5 : 1,
                }}
              >
                {d}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
