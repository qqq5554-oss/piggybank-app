import React, { useState } from "react";
import { ChevronLeft, Lock } from "lucide-react";
import { verifyPin } from "../api/client";

export default function ParentPinScreen({ onBack, onSuccess }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const press = (d) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      setChecking(true);
      verifyPin(next)
        .then((ok) => {
          if (ok) {
            onSuccess(next); // 把驗證過的 PIN 往上傳，之後家長操作都會用到
          } else {
            setShake(true);
            setTimeout(() => setShake(false), 400);
            setPin("");
          }
        })
        .catch(() => {
          setShake(true);
          setTimeout(() => setShake(false), 400);
          setPin("");
        })
        .finally(() => setChecking(false));
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 24px" }}>
      <button onClick={onBack} style={{ alignSelf: "flex-start", background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
        <ChevronLeft size={22} color="#5A4632" />
      </button>
      <Lock size={34} color="#94795F" style={{ marginTop: 20 }} />
      <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20, marginTop: 10 }}>家長專區</div>
      <div style={{ color: "#B4A392", fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        {checking ? "確認中..." : "請輸入 4 位數密碼"}
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 30, animation: shake ? "shakeX 0.4s" : "none" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? "#94795F" : "#E3D3C2" }} />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, width: "100%", maxWidth: 260 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
          d === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              disabled={checking}
              onClick={() => (d === "⌫" ? setPin((p) => p.slice(0, -1)) : press(d))}
              style={{ aspectRatio: "1", borderRadius: "50%", border: "none", background: "#fff", fontSize: 20, fontWeight: 800 }}
            >
              {d}
            </button>
          )
        )}
      </div>
      <div style={{ color: "#C4B4A0", fontSize: 11, marginTop: 26 }}>預設密碼是 0000，可在家長模式中修改</div>
    </div>
  );
}
