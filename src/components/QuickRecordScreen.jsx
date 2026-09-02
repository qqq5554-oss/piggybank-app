import React, { useState, useEffect, useCallback } from "react";
import { X, Delete } from "lucide-react";
import { adjustBalance, awardPoints, fetchTransactions } from "../api/client";
import TransactionList from "./TransactionList";

const TABS = [
  { id: "expense", label: "支出" },
  { id: "income", label: "收入" },
  { id: "points", label: "責任值" },
];

// 進哪個分頁就預設哪個正負號，之後可以用鍵盤上的 + − 自己改
const DEFAULT_SIGN = { expense: "-", income: "+", points: "+" };

const NOTE_SUGGESTIONS = {
  "money+": ["家長加值", "獎勵", "紅包"],
  "money-": ["日常花費", "買東西", "違規扣款"],
  "points+": ["表現良好", "主動幫忙", "有禮貌"],
  "points-": ["忘記事情", "態度不佳", "違規"],
};

const POSITIVE = "#3DB88A";
const NEGATIVE = "#E85D5D";

// 快速記帳頁：上面是計算機式的數字鍵盤（正負號自己按 + −），
// 中間填原因，下面用一張卡片顯示這一類的相關紀錄。
export default function QuickRecordScreen({ kids, pin, initialKidId, initialTab = "expense", onClose, refetch }) {
  const [kidId, setKidId] = useState(initialKidId || kids[0]?.id || "");
  const [tab, setTab] = useState(initialTab);
  const [sign, setSign] = useState(DEFAULT_SIGN[initialTab] || "-");
  const [amountStr, setAmountStr] = useState("0");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState("");
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async (id) => {
    if (!id) return;
    try {
      setHistory(await fetchTransactions(id));
    } catch (err) {
      console.error("讀取紀錄失敗", err);
    }
  }, []);

  useEffect(() => {
    loadHistory(kidId);
  }, [kidId, loadHistory]);

  const kid = kids.find((k) => k.id === kidId) || kids[0];
  const amount = Number(amountStr) || 0;
  const isPoints = tab === "points";
  const unit = isPoints ? "⭐" : "元";
  const accent = sign === "-" ? NEGATIVE : POSITIVE;

  const press = (key) => {
    setLastSaved("");
    if (key === "+" || key === "-") return setSign(key);
    if (key === "C") return setAmountStr("0");
    if (key === "back") return setAmountStr((p) => (p.length <= 1 ? "0" : p.slice(0, -1)));
    setAmountStr((prev) => {
      const next = prev === "0" ? key : prev + key;
      return next.length > 7 ? prev : next;
    });
  };

  const switchTab = (t) => {
    setTab(t);
    setSign(DEFAULT_SIGN[t]);
    setNote("");
    setLastSaved("");
  };

  const save = async () => {
    if (!amount || amount <= 0 || !kidId) return;
    setSubmitting(true);
    try {
      if (isPoints) {
        const delta = sign === "-" ? -amount : amount;
        const reason = note.trim() || (delta > 0 ? "表現良好" : "扣分");
        await awardPoints(kidId, delta, reason, pin);
      } else {
        const type = sign === "-" ? "expense" : "income";
        const finalNote = note.trim() || (type === "income" ? "家長加值" : "日常花費");
        await adjustBalance(kidId, type, amount, finalNote, pin);
      }
      setLastSaved(`已記錄 ${sign}${amount}${unit}（${kid.name}）`);
      await refetch();
      await loadHistory(kidId);
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

  // 下面那張卡片只顯示「這次要記的這一類」的紀錄
  const historyLabel = isPoints ? "責任值" : sign === "-" ? "支出" : "收入";
  const tabHistory = history.filter((t) => {
    if (isPoints) return t.kind === "points";
    if (t.kind !== "money") return false;
    return sign === "-" ? t.type === "expense" || t.type === "penalty" : t.type === "income";
  });

  const suggestions = NOTE_SUGGESTIONS[`${isPoints ? "points" : "money"}${sign}`] || [];

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EF", paddingBottom: 40 }}>
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
              borderBottom: `3px solid ${tab === t.id ? "#5A4632" : "transparent"}`,
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

      {/* ---- 計算機 ---- */}
      <div style={{ margin: "14px 14px 0", background: "#fff", borderRadius: 20, padding: 14 }}>
        <div
          style={{
            textAlign: "right",
            fontFamily: "'Baloo 2', sans-serif",
            fontWeight: 800,
            fontSize: 46,
            color: accent,
            padding: "6px 8px 14px",
            lineHeight: 1.1,
            wordBreak: "break-all",
          }}
        >
          {sign === "-" ? "−" : "+"}
          {amountStr}
          <span style={{ fontSize: 22, marginLeft: 4 }}>{unit}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[
            { k: "7" }, { k: "8" }, { k: "9" }, { k: "back", node: <Delete size={18} />, tone: "func" },
            { k: "4" }, { k: "5" }, { k: "6" }, { k: "C", tone: "func" },
            { k: "1" }, { k: "2" }, { k: "3" }, { k: "-", label: "−", tone: "sign" },
            { k: "0", span: 2 }, { k: "00" }, { k: "+", label: "＋", tone: "sign" },
          ].map(({ k, label, node, tone, span }) => {
            const activeSign = tone === "sign" && sign === k;
            return (
              <button
                key={k}
                onClick={() => press(k)}
                style={{
                  gridColumn: span ? `span ${span}` : undefined,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "16px 0",
                  borderRadius: 14,
                  border: activeSign ? `2px solid ${k === "-" ? NEGATIVE : POSITIVE}` : "none",
                  background:
                    tone === "sign"
                      ? activeSign
                        ? k === "-"
                          ? "#FFF0EC"
                          : "#EAF8F2"
                        : "#F7F1E9"
                      : tone === "func"
                      ? "#F1E7DC"
                      : "#FBF6EF",
                  color: tone === "sign" ? (k === "-" ? NEGATIVE : POSITIVE) : "#5A4632",
                  fontSize: tone === "sign" ? 22 : 20,
                  fontWeight: 800,
                }}
              >
                {node || label || k}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- 原因／備註 ---- */}
      <div style={{ padding: "14px 18px 0" }}>
        <input
          placeholder="原因／備註（選填）"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", border: "2px solid #F1E7DC", borderRadius: 12, padding: "12px 14px", fontSize: 15, outline: "none", background: "#fff" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setNote(s)}
              style={{ border: "none", borderRadius: 14, padding: "6px 11px", background: "#F1E7DC", color: "#8A7457", fontSize: 12.5, fontWeight: 700 }}
            >
              {s}
            </button>
          ))}
        </div>

        <button
          onClick={save}
          disabled={submitting || !amount}
          style={{
            width: "100%",
            marginTop: 12,
            border: "none",
            borderRadius: 14,
            padding: 15,
            background: accent,
            color: "#fff",
            fontWeight: 800,
            fontSize: 16,
            opacity: submitting || !amount ? 0.45 : 1,
          }}
        >
          {submitting ? "記錄中..." : `儲存 ${sign === "-" ? "−" : "+"}${amount}${unit}`}
        </button>

        {lastSaved && (
          <div style={{ textAlign: "center", color: POSITIVE, fontWeight: 700, fontSize: 13, marginTop: 8 }}>✅ {lastSaved}</div>
        )}
      </div>

      {/* ---- 相關紀錄 ---- */}
      <div style={{ margin: "20px 14px 0", background: "#fff", borderRadius: 20, padding: "14px 14px 16px" }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "#8A7457", marginBottom: 10 }}>
          {kid.name} 最近的{historyLabel}紀錄
        </div>
        <TransactionList transactions={tabHistory.slice(0, 20)} />
      </div>
    </div>
  );
}
