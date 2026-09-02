import React, { useState } from "react";
import { X, Delete } from "lucide-react";
import { adjustBalance, awardPoints } from "../api/client";
import { themeOf } from "../utils/format";

const TABS = [
  { id: "expense", label: "支出" },
  { id: "income", label: "收入" },
  { id: "points", label: "責任值" },
];

const MONEY_NOTE_SUGGESTIONS = {
  income: ["家長加值", "獎勵"],
  expense: ["日常花費", "買東西"],
};
const POINTS_NOTE_SUGGESTIONS = {
  gain: ["表現良好", "主動幫忙", "有禮貌"],
  loss: ["忘記事情", "態度不佳"],
};

// 給家長快速記一筆的輸入頁：像記帳 app 一樣，數字鍵盤 + 分類，
// 一次只記一筆錢或一筆責任值，存完鍵盤歸零可以馬上記下一筆。
export default function QuickRecordScreen({ kids, pin, initialKidId, initialTab = "expense", onClose, refetch }) {
  const [kidId, setKidId] = useState(initialKidId || kids[0]?.id || "");
  const [tab, setTab] = useState(initialTab);
  const [moneyKind, setMoneyKind] = useState("normal"); // normal | penalty（只有支出用得到）
  const [direction, setDirection] = useState("gain"); // gain | loss（只有責任值用得到）
  const [amountStr, setAmountStr] = useState("0");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  const kid = kids.find((k) => k.id === kidId) || kids[0];
  const theme = themeOf(kid?.theme_id);
  const amount = Number(amountStr) || 0;

  const pressDigit = (d) => {
    setLastSaved("");
    setAmountStr((prev) => {
      if (prev === "0") return d;
      if (prev.replace(".", "").length >= 7) return prev;
      return prev + d;
    });
  };
  const backspace = () => {
    setLastSaved("");
    setAmountStr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  };
  const clearAmount = () => {
    setLastSaved("");
    setAmountStr("0");
  };

  const switchTab = (t) => {
    setTab(t);
    setNote("");
    setLastSaved("");
  };

  const save = async () => {
    if (!amount || amount <= 0 || !kidId) return;
    setSubmitting(true);
    try {
      if (tab === "points") {
        const delta = direction === "gain" ? amount : -amount;
        const reason = note.trim() || (direction === "gain" ? "表現良好" : "扣分");
        await awardPoints(kidId, delta, reason, pin);
        setLastSaved(`已記錄 ${direction === "gain" ? "+" : "-"}${amount}⭐（${kid.name}）`);
      } else {
        const type = tab === "income" ? "income" : moneyKind === "penalty" ? "penalty" : "expense";
        const defaultNote = type === "income" ? "家長加值" : type === "penalty" ? "違規扣款" : "日常花費";
        const finalNote = note.trim() || defaultNote;
        await adjustBalance(kidId, type, amount, finalNote, pin);
        setLastSaved(`已記錄 ${type === "income" ? "+" : "-"}${amount} 元（${kid.name}）`);
      }
      await refetch();
      setAmountStr("0");
      setNote("");
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!kid) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ color: "#B4A392" }}>還沒有新增小朋友</div>
        <button onClick={onClose} style={{ border: "none", borderRadius: 10, padding: "10px 16px", background: "#F1E7DC", fontWeight: 700 }}>
          返回
        </button>
      </div>
    );
  }

  const suggestions = tab === "points" ? POINTS_NOTE_SUGGESTIONS[direction] : MONEY_NOTE_SUGGESTIONS[tab];
  const unit = tab === "points" ? "⭐" : "元";
  const accent = tab === "points" ? "#94795F" : tab === "income" ? "#3DB88A" : "#E85D5D";

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#FBF6EF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 14px 6px" }}>
        <button onClick={onClose} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <X size={20} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800 }}>快速記帳</span>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ display: "flex", gap: 6, padding: "6px 14px 8px", overflowX: "auto" }}>
        {kids.map((k) => (
          <button
            key={k.id}
            onClick={() => setKidId(k.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              whiteSpace: "nowrap",
              fontWeight: 700,
              fontSize: 13.5,
              background: kidId === k.id ? "#5A4632" : "#F1E7DC",
              color: kidId === k.id ? "#fff" : "#8A7457",
            }}
          >
            <span style={{ fontSize: 16 }}>{k.avatar}</span> {k.name}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", padding: "4px 14px 0" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            style={{
              flex: 1,
              padding: "10px 6px",
              border: "none",
              borderBottom: `3px solid ${tab === t.id ? accent : "transparent"}`,
              background: "none",
              fontWeight: 800,
              fontSize: 15,
              color: tab === t.id ? "#5A4632" : "#B4A392",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ textAlign: "center", padding: "18px 20px 6px" }}>
        <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 44, color: accent }}>
          {amountStr}
          <span style={{ fontSize: 22, marginLeft: 4 }}>{unit}</span>
        </div>
      </div>

      {tab === "expense" && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 6 }}>
          {[
            { id: "normal", label: "一般支出" },
            { id: "penalty", label: "違規扣款" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMoneyKind(opt.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `2px solid ${moneyKind === opt.id ? accent : "#F1E7DC"}`,
                background: moneyKind === opt.id ? "#FFF5F0" : "#fff",
                fontWeight: 700,
                fontSize: 12.5,
                color: moneyKind === opt.id ? accent : "#B4A392",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {tab === "points" && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 6 }}>
          {[
            { id: "gain", label: "＋加分" },
            { id: "loss", label: "－扣分" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setDirection(opt.id)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `2px solid ${direction === opt.id ? accent : "#F1E7DC"}`,
                background: direction === opt.id ? "#FBF3EA" : "#fff",
                fontWeight: 700,
                fontSize: 12.5,
                color: direction === opt.id ? accent : "#B4A392",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "4px 18px" }}>
        <input
          placeholder="原因／備註（選填）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", border: "2px solid #F1E7DC", borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setNote(s)}
              style={{ border: "none", borderRadius: 14, padding: "5px 10px", background: "#F1E7DC", color: "#8A7457", fontSize: 12, fontWeight: 700 }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {lastSaved && (
        <div style={{ textAlign: "center", color: "#3DB88A", fontWeight: 700, fontSize: 13, marginBottom: 4 }}>✅ {lastSaved}</div>
      )}

      <div style={{ padding: "6px 18px 10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map((d, i) => {
            if (d === "clear") {
              return (
                <button key={i} onClick={clearAmount} style={keyStyle}>
                  C
                </button>
              );
            }
            if (d === "back") {
              return (
                <button key={i} onClick={backspace} style={keyStyle}>
                  <Delete size={18} />
                </button>
              );
            }
            return (
              <button key={i} onClick={() => pressDigit(d)} style={keyStyle}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 18px 26px" }}>
        <button
          onClick={save}
          disabled={submitting || !amount}
          style={{
            width: "100%",
            border: "none",
            borderRadius: 14,
            padding: 14,
            background: accent,
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            opacity: submitting || !amount ? 0.5 : 1,
          }}
        >
          {submitting ? "記錄中..." : "儲存這筆"}
        </button>
      </div>
    </div>
  );
}

const keyStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "14px 0",
  borderRadius: 12,
  border: "none",
  background: "#fff",
  fontSize: 19,
  fontWeight: 700,
  color: "#5A4632",
};
