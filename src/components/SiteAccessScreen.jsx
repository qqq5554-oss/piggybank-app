import React, { useState } from "react";
import { Lock, PiggyBank } from "lucide-react";
import { verifySitePin, setSitePin } from "../api/client";

// 進站密碼畫面：整個 App 的第一道門，跟家長 PIN 是分開的兩組密碼。
// 驗證成功後密碼存進 localStorage，同一台裝置之後不用再輸入。
export default function SiteAccessScreen({ onSuccess }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  const press = (d) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      setChecking(true);
      verifySitePin(next)
        .then((ok) => {
          if (ok) {
            setSitePin(next);
            onSuccess();
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
      <PiggyBank size={34} color="#E86A3A" style={{ marginTop: 40 }} />
      <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 20, marginTop: 10 }}>小小存錢筒</div>
      <Lock size={22} color="#94795F" style={{ marginTop: 16 }} />
      <div style={{ color: "#B4A392", fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        {checking ? "確認中..." : "請輸入進站密碼"}
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
              style={{ aspectRatio: "1", borderRadius: "50%", border: "none", background: "#F1E7DC", fontSize: 20, fontWeight: 800 }}
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
}
