import React, { useState, useEffect } from "react";
import { ChevronLeft, Check, X, Plus } from "lucide-react";
import {
  fetchTransactions,
  approveChore,
  rejectChore,
  adjustBalance,
  addKid,
  updateKid,
  addChore,
  deleteChore,
  changePin,
} from "../api/client";
import { currency, formatDate, themeOf, KID_THEMES, AVATARS } from "../utils/format";
import TransactionList from "./TransactionList";

export default function ParentDashboard({ kids, chores, pendingChores, pin, onBack, refetch }) {
  const [tab, setTab] = useState("review");

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 14px 10px" }}>
        <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800 }}>家長模式</span>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 14px 10px", overflowX: "auto" }}>
        {[
          { id: "review", label: `審核${pendingChores.length ? ` (${pendingChores.length})` : ""}` },
          { id: "kids", label: "管理帳戶" },
          { id: "chores", label: "家事清單" },
          { id: "settings", label: "設定" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 12px",
              borderRadius: 20,
              border: "none",
              whiteSpace: "nowrap",
              fontWeight: 700,
              fontSize: 12.5,
              background: tab === t.id ? "#5A4632" : "#F1E7DC",
              color: tab === t.id ? "#fff" : "#8A7457",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "6px 14px 40px" }}>
        {tab === "review" && <ReviewTab kids={kids} pendingChores={pendingChores} pin={pin} refetch={refetch} />}
        {tab === "kids" && <KidsManageTab kids={kids} pin={pin} refetch={refetch} />}
        {tab === "chores" && <ChoresManageTab chores={chores} pin={pin} refetch={refetch} />}
        {tab === "settings" && <SettingsTab pin={pin} />}
      </div>
    </div>
  );
}

// ---------------- 審核 ----------------
function ReviewTab({ kids, pendingChores, pin, refetch }) {
  const kidMap = Object.fromEntries(kids.map((k) => [k.id, k]));

  const approve = async (p) => {
    try {
      await approveChore(p.id, pin);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };
  const reject = async (p) => {
    await rejectChore(p.id, pin);
    refetch();
  };

  if (pendingChores.length === 0) return <div style={{ textAlign: "center", color: "#B4A392", padding: 30 }}>目前沒有待審核的申請 ✅</div>;

  return (
    <div>
      {pendingChores.map((p) => {
        const kid = kidMap[p.kid_id];
        return (
          <div key={p.id} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{kid?.avatar}</span>
              <div>
                <div style={{ fontWeight: 800 }}>{kid?.name} · {p.chore_name}</div>
                <div style={{ fontSize: 11, color: "#B4A392" }}>{formatDate(p.created_at)}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, color: "#3DB88A" }}>+{p.amount}</span>
              <button onClick={() => reject(p)} style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #F1D4D4", background: "#FFF5F5" }}>
                <X size={16} color="#E85D5D" />
              </button>
              <button onClick={() => approve(p)} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#3DB88A" }}>
                <Check size={16} color="#fff" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- 管理帳戶 ----------------
function KidsManageTab({ kids, pin, refetch }) {
  const [openId, setOpenId] = useState(kids[0]?.id || null);

  const handleAddKid = async () => {
    const usedThemes = kids.map((k) => k.theme_id);
    const theme = KID_THEMES.find((t) => !usedThemes.includes(t.id)) || KID_THEMES[kids.length % KID_THEMES.length];
    try {
      await addKid("新朋友", AVATARS[kids.length % AVATARS.length], theme.id, pin);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      {kids.map((kid) => (
        <KidManageCard key={kid.id} kid={kid} isOpen={openId === kid.id} onToggle={() => setOpenId(openId === kid.id ? null : kid.id)} pin={pin} refetch={refetch} />
      ))}
      <button onClick={handleAddKid} style={{ width: "100%", padding: 12, borderRadius: 14, border: "2px dashed #D8C6B0", background: "none", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Plus size={18} /> 新增小朋友
      </button>
    </div>
  );
}

function KidManageCard({ kid, isOpen, onToggle, pin, refetch }) {
  const theme = themeOf(kid.theme_id);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [type, setType] = useState("income");
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (isOpen) fetchTransactions(kid.id).then((t) => setTransactions(t.slice(0, 5))).catch(console.error);
  }, [isOpen, kid.id]);

  const adjust = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const defaultNote = type === "income" ? "家長加值" : type === "penalty" ? "違規扣款" : "日常花費";
    try {
      await adjustBalance(kid.id, type, amt, note.trim() || defaultNote, pin);
      setAmount("");
      setNote("");
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const rename = async (newName) => {
    if (newName.trim() && newName.trim() !== kid.name) {
      await updateKid(kid.id, { name: newName.trim() }, pin);
      refetch();
    }
  };

  return (
    <div style={{ border: `2px solid ${isOpen ? theme.accent : "#EEE4D8"}`, borderRadius: 16, marginBottom: 10, background: "#fff", overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none" }}>
        <span style={{ fontSize: 22 }}>{kid.avatar}</span>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontWeight: 800 }}>{kid.name}</div>
          <div style={{ fontSize: 12, color: "#B4A392" }}>{currency(kid.balance)}</div>
        </div>
      </button>

      {isOpen && (
        <div style={{ padding: "0 14px 16px" }}>
          <label style={labelStyle}>名字</label>
          <input style={inputStyle} defaultValue={kid.name} onBlur={(e) => rename(e.target.value)} />

          <label style={labelStyle}>頭像</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => updateKid(kid.id, { avatar: a }, pin).then(refetch)}
                style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${kid.avatar === a ? theme.accent : "transparent"}`, background: kid.avatar === a ? theme.bg : "#F7F1E9", fontSize: 18 }}
              >
                {a}
              </button>
            ))}
          </div>

          <label style={labelStyle}>顏色主題</label>
          <div style={{ display: "flex", gap: 6 }}>
            {KID_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => updateKid(kid.id, { themeId: t.id }, pin).then(refetch)}
                style={{ width: 32, height: 32, borderRadius: "50%", background: t.accent, border: `3px solid ${kid.theme_id === t.id ? "#5A4632" : "transparent"}` }}
              />
            ))}
          </div>

          <div style={{ height: 1, background: "#F1E7DC", margin: "16px 0" }} />

          <label style={labelStyle}>加減錢</label>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {[
              { id: "income", label: "加錢" },
              { id: "expense", label: "日常花費" },
              { id: "penalty", label: "懲罰扣款" },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setType(opt.id)}
                style={{
                  flex: 1,
                  padding: "8px 6px",
                  borderRadius: 10,
                  border: `2px solid ${type === opt.id ? theme.accent : "#F1E7DC"}`,
                  background: type === opt.id ? theme.bg : "#fff",
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input style={{ ...inputStyle, flex: 1 }} placeholder="備註（選填）" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <button onClick={adjust} style={{ ...primaryBtnStyle, background: theme.accent, marginTop: 10 }}>
            確認送出
          </button>

          {transactions.length > 0 && (
            <>
              <div style={{ height: 1, background: "#F1E7DC", margin: "16px 0" }} />
              <label style={labelStyle}>最近紀錄</label>
              <TransactionList transactions={transactions} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- 家事清單管理 ----------------
function ChoresManageTab({ chores, pin, refetch }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  const add = async () => {
    if (!name.trim() || !Number(amount) || Number(amount) <= 0) return;
    try {
      await addChore(name.trim(), Number(amount), pin);
      setName("");
      setAmount("");
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const remove = async (id) => {
    await deleteChore(id, pin);
    refetch();
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {chores.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 700 }}>
            <span style={{ flex: 1 }}>{c.name}</span>
            <span style={{ color: "#3DB88A", fontWeight: 800 }}>+{c.amount}</span>
            <button onClick={() => remove(c.id)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9" }}>
              <X size={14} color="#B4A392" />
            </button>
          </div>
        ))}
      </div>
      <label style={labelStyle}>新增家事項目</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="家事名稱" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <button onClick={add} style={{ ...primaryBtnStyle, background: "#E86A3A", marginTop: 10 }}>
        新增
      </button>
    </div>
  );
}

// ---------------- 設定 ----------------
function SettingsTab({ pin }) {
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState("");

  const doChangePin = async () => {
    if (pin1.length !== 4 || !/^\d{4}$/.test(pin1)) return setMsg("密碼需為 4 碼數字");
    if (pin1 !== pin2) return setMsg("兩次密碼不一致");
    try {
      await changePin(pin1, pin);
      setPin1("");
      setPin2("");
      setMsg("密碼已更新 ✅（下次進入家長模式請用新密碼）");
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div>
      <label style={labelStyle}>修改家長密碼</label>
      <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="新密碼（4碼數字）" maxLength={4} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))} />
      <input style={inputStyle} placeholder="再輸入一次" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
      <button onClick={doChangePin} style={{ ...primaryBtnStyle, background: "#94795F", marginTop: 10 }}>
        更新密碼
      </button>
      {msg && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#8A6E3D" }}>{msg}</div>}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 800, color: "#8A7457", marginBottom: 6, marginTop: 12 };
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #F1E7DC", fontSize: 15, outline: "none" };
const primaryBtnStyle = { width: "100%", padding: 12, borderRadius: 12, border: "none", color: "#fff", fontWeight: 800, fontSize: 15 };
