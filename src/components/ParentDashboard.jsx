import React, { useState, useEffect } from "react";
import { ChevronLeft, Check, X, Plus, Pencil } from "lucide-react";
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
  addResponsibility,
  deleteResponsibility,
  addMission,
  approveMission,
  rejectMission,
  deleteMission,
  awardPoints,
  addViolation,
  addAllowanceRule,
  deleteAllowanceRule,
  addExpenseRule,
  deleteExpenseRule,
  setInterestRate,
  updateChore,
  updateResponsibility,
  updateMission,
  updateAllowanceRule,
  updateExpenseRule,
} from "../api/client";
import { currency, formatDate, themeOf, KID_THEMES, AVATARS } from "../utils/format";
import TransactionList from "./TransactionList";

const WEEKDAY_LABELS = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

export default function ParentDashboard({
  kids,
  chores,
  pendingChores,
  responsibilities,
  missions,
  allowanceRules,
  expenseRules,
  pin,
  onBack,
  refetch,
}) {
  const [tab, setTab] = useState("review");
  const pendingMissionCount = missions.filter((m) => m.status === "pending").length;
  const reviewCount = pendingChores.length + pendingMissionCount;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 14px 10px" }}>
        <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800 }}>家長模式</span>
        <div style={{ width: 34 }} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 14px 10px" }}>
        {[
          { id: "review", label: `審核${reviewCount ? ` (${reviewCount})` : ""}` },
          { id: "kids", label: "管理帳戶" },
          { id: "chores", label: "家事清單" },
          { id: "responsibilities", label: "生活責任" },
          { id: "missions", label: "特殊任務" },
          { id: "recurring", label: "定期收支" },
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
        {tab === "review" && <ReviewTab kids={kids} pendingChores={pendingChores} missions={missions} pin={pin} refetch={refetch} />}
        {tab === "kids" && <KidsManageTab kids={kids} pin={pin} refetch={refetch} />}
        {tab === "chores" && <ChoresManageTab chores={chores} pin={pin} refetch={refetch} />}
        {tab === "responsibilities" && <ResponsibilitiesManageTab responsibilities={responsibilities} pin={pin} refetch={refetch} />}
        {tab === "missions" && <MissionsManageTab kids={kids} missions={missions} pin={pin} refetch={refetch} />}
        {tab === "recurring" && (
          <RecurringManageTab kids={kids} allowanceRules={allowanceRules} expenseRules={expenseRules} pin={pin} refetch={refetch} />
        )}
        {tab === "settings" && <SettingsTab pin={pin} />}
      </div>
    </div>
  );
}

// ---------------- 審核 ----------------
function ReviewTab({ kids, pendingChores, missions, pin, refetch }) {
  const kidMap = Object.fromEntries(kids.map((k) => [k.id, k]));
  const [processingId, setProcessingId] = useState(null);
  const pendingMissions = missions.filter((m) => m.status === "pending");

  const approve = async (p) => {
    setProcessingId(p.id);
    try {
      await approveChore(p.id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };
  const reject = async (p) => {
    setProcessingId(p.id);
    try {
      await rejectChore(p.id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  const approveMissionItem = async (m) => {
    setProcessingId(m.id);
    try {
      await approveMission(m.id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };
  const rejectMissionItem = async (m) => {
    setProcessingId(m.id);
    try {
      await rejectMission(m.id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingChores.length === 0 && pendingMissions.length === 0) {
    return <div style={{ textAlign: "center", color: "#B4A392", padding: 30 }}>目前沒有待審核的申請 ✅</div>;
  }

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
              <button
                onClick={() => reject(p)}
                disabled={processingId === p.id}
                style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #F1D4D4", background: "#FFF5F5", opacity: processingId === p.id ? 0.5 : 1 }}
              >
                <X size={16} color="#E85D5D" />
              </button>
              <button
                onClick={() => approve(p)}
                disabled={processingId === p.id}
                style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#3DB88A", opacity: processingId === p.id ? 0.5 : 1 }}
              >
                <Check size={16} color="#fff" />
              </button>
            </div>
          </div>
        );
      })}

      {pendingMissions.map((m) => {
        const kid = kidMap[m.kid_id];
        return (
          <div key={m.id} style={{ background: "#fff", borderRadius: 14, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{kid?.avatar}</span>
              <div>
                <div style={{ fontWeight: 800 }}>{kid?.name} · 🎯 {m.name}</div>
                <div style={{ fontSize: 11, color: "#B4A392" }}>特殊任務</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 800, color: "#3DB88A" }}>+{m.amount}</span>
              <button
                onClick={() => rejectMissionItem(m)}
                disabled={processingId === m.id}
                style={{ width: 30, height: 30, borderRadius: "50%", border: "1.5px solid #F1D4D4", background: "#FFF5F5", opacity: processingId === m.id ? 0.5 : 1 }}
              >
                <X size={16} color="#E85D5D" />
              </button>
              <button
                onClick={() => approveMissionItem(m)}
                disabled={processingId === m.id}
                style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: "#3DB88A", opacity: processingId === m.id ? 0.5 : 1 }}
              >
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
  const [addingKid, setAddingKid] = useState(false);

  const handleAddKid = async () => {
    const usedThemes = kids.map((k) => k.theme_id);
    const theme = KID_THEMES.find((t) => !usedThemes.includes(t.id)) || KID_THEMES[kids.length % KID_THEMES.length];
    setAddingKid(true);
    try {
      await addKid("新朋友", AVATARS[kids.length % AVATARS.length], theme.id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAddingKid(false);
    }
  };

  return (
    <div>
      {kids.map((kid) => (
        <KidManageCard key={kid.id} kid={kid} isOpen={openId === kid.id} onToggle={() => setOpenId(openId === kid.id ? null : kid.id)} pin={pin} refetch={refetch} />
      ))}
      <button
        onClick={handleAddKid}
        disabled={addingKid}
        style={{ width: "100%", padding: 12, borderRadius: 14, border: "2px dashed #D8C6B0", background: "none", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: addingKid ? 0.6 : 1 }}
      >
        <Plus size={18} /> {addingKid ? "新增中..." : "新增小朋友"}
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
  const [savingField, setSavingField] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [pointsDelta, setPointsDelta] = useState("");
  const [pointsReason, setPointsReason] = useState("");
  const [awardingPoints, setAwardingPoints] = useState(false);
  const [violationDesc, setViolationDesc] = useState("");
  const [violationMoney, setViolationMoney] = useState("");
  const [violationPoints, setViolationPoints] = useState("");
  const [violationPrivilege, setViolationPrivilege] = useState("");
  const [savingViolation, setSavingViolation] = useState(false);

  useEffect(() => {
    if (isOpen) fetchTransactions(kid.id).then((t) => setTransactions(t.slice(0, 5))).catch(console.error);
  }, [isOpen, kid.id]);

  const updateField = async (fields) => {
    setSavingField(true);
    try {
      await updateKid(kid.id, fields, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingField(false);
    }
  };

  const adjust = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const defaultNote = type === "income" ? "家長加值" : type === "penalty" ? "違規扣款" : "日常花費";
    setAdjusting(true);
    try {
      await adjustBalance(kid.id, type, amt, note.trim() || defaultNote, pin);
      setAmount("");
      setNote("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdjusting(false);
    }
  };

  const rename = async (newName) => {
    if (newName.trim() && newName.trim() !== kid.name) {
      await updateField({ name: newName.trim() });
    }
  };

  const doAwardPoints = async () => {
    const d = Number(pointsDelta);
    if (!d) return;
    setAwardingPoints(true);
    try {
      await awardPoints(kid.id, d, pointsReason.trim() || (d > 0 ? "表現良好" : "扣分"), pin);
      setPointsDelta("");
      setPointsReason("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAwardingPoints(false);
    }
  };

  const submitViolation = async () => {
    if (!violationDesc.trim()) return;
    const moneyDelta = violationMoney ? -Math.abs(Number(violationMoney)) : 0;
    const pointsDeltaVal = violationPoints ? -Math.abs(Number(violationPoints)) : 0;
    setSavingViolation(true);
    try {
      await addViolation(kid.id, violationDesc.trim(), moneyDelta, pointsDeltaVal, violationPrivilege.trim() || null, pin);
      setViolationDesc("");
      setViolationMoney("");
      setViolationPoints("");
      setViolationPrivilege("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingViolation(false);
    }
  };

  return (
    <div style={{ border: `2px solid ${isOpen ? theme.accent : "#EEE4D8"}`, borderRadius: 16, marginBottom: 10, background: "#fff", overflow: "hidden" }}>
      <button onClick={onToggle} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "none", border: "none" }}>
        <span style={{ fontSize: 22 }}>{kid.avatar}</span>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ fontWeight: 800 }}>{kid.name}</div>
          <div style={{ fontSize: 12, color: "#B4A392" }}>{currency(kid.balance)} · ⭐ {kid.character_points || 0}</div>
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
                disabled={savingField}
                onClick={() => updateField({ avatar: a })}
                style={{ width: 36, height: 36, borderRadius: 10, border: `2px solid ${kid.avatar === a ? theme.accent : "transparent"}`, background: kid.avatar === a ? theme.bg : "#F7F1E9", fontSize: 18, opacity: savingField ? 0.5 : 1 }}
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
                disabled={savingField}
                onClick={() => updateField({ themeId: t.id })}
                style={{ width: 32, height: 32, borderRadius: "50%", background: t.accent, border: `3px solid ${kid.theme_id === t.id ? "#5A4632" : "transparent"}`, opacity: savingField ? 0.5 : 1 }}
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
          <button onClick={adjust} disabled={adjusting} style={{ ...primaryBtnStyle, background: theme.accent, marginTop: 10, opacity: adjusting ? 0.6 : 1 }}>
            {adjusting ? "送出中..." : "確認送出"}
          </button>

          <div style={{ height: 1, background: "#F1E7DC", margin: "16px 0" }} />

          <label style={labelStyle}>⭐ 責任值增減（主動幫忙、禮貌、分享...）</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="+/-" value={pointsDelta} onChange={(e) => setPointsDelta(e.target.value)} />
            <input style={{ ...inputStyle, flex: 1 }} placeholder="原因（選填）" value={pointsReason} onChange={(e) => setPointsReason(e.target.value)} />
          </div>
          <button onClick={doAwardPoints} disabled={awardingPoints} style={{ ...primaryBtnStyle, background: "#94795F", marginTop: 10, opacity: awardingPoints ? 0.6 : 1 }}>
            {awardingPoints ? "送出中..." : "送出"}
          </button>

          <div style={{ height: 1, background: "#F1E7DC", margin: "16px 0" }} />

          <label style={labelStyle}>❌ 違規紀錄</label>
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="發生什麼事？" value={violationDesc} onChange={(e) => setViolationDesc(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="扣多少錢（選填）" value={violationMoney} onChange={(e) => setViolationMoney(e.target.value)} />
            <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="扣多少責任值（選填）" value={violationPoints} onChange={(e) => setViolationPoints(e.target.value)} />
          </div>
          <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="禁止的權利（選填，例如：今天不能玩 Switch）" value={violationPrivilege} onChange={(e) => setViolationPrivilege(e.target.value)} />
          <button onClick={submitViolation} disabled={savingViolation} style={{ ...primaryBtnStyle, background: "#E85D5D", opacity: savingViolation ? 0.6 : 1 }}>
            {savingViolation ? "送出中..." : "登記違規"}
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
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const add = async () => {
    if (!name.trim() || !Number(amount) || Number(amount) <= 0) return;
    setAdding(true);
    try {
      await addChore(name.trim(), Number(amount), pin);
      setName("");
      setAmount("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    setRemovingId(id);
    try {
      await deleteChore(id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditAmount(String(c.amount));
  };

  const saveEdit = async () => {
    if (!editName.trim() || !Number(editAmount) || Number(editAmount) <= 0) return;
    setSavingEdit(true);
    try {
      await updateChore(editingId, editName.trim(), Number(editAmount), pin);
      setEditingId(null);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {chores.map((c) =>
          editingId === c.id ? (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input style={{ ...inputStyle, width: 70 }} type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#3DB88A", opacity: savingEdit ? 0.5 : 1 }}
              >
                <Check size={14} color="#fff" />
              </button>
              <button onClick={() => setEditingId(null)} disabled={savingEdit} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#F7F1E9" }}>
                <X size={14} color="#B4A392" />
              </button>
            </div>
          ) : (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 700 }}>
              <span style={{ flex: 1 }}>{c.name}</span>
              <span style={{ color: "#3DB88A", fontWeight: 800 }}>+{c.amount}</span>
              <button onClick={() => startEdit(c)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F1E7DC" }}>
                <Pencil size={12} color="#8A7457" />
              </button>
              <button
                onClick={() => remove(c.id)}
                disabled={removingId === c.id}
                style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9", opacity: removingId === c.id ? 0.5 : 1 }}
              >
                <X size={14} color="#B4A392" />
              </button>
            </div>
          )
        )}
      </div>
      <label style={labelStyle}>新增家事項目</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="家事名稱" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <button onClick={add} disabled={adding} style={{ ...primaryBtnStyle, background: "#E86A3A", marginTop: 10, opacity: adding ? 0.6 : 1 }}>
        {adding ? "新增中..." : "新增"}
      </button>
    </div>
  );
}

// ---------------- 生活責任管理 ----------------
function ResponsibilitiesManageTab({ responsibilities, pin, refetch }) {
  const [name, setName] = useState("");
  const [points, setPoints] = useState("1");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const add = async () => {
    if (!name.trim() || !Number(points) || Number(points) <= 0) return;
    setAdding(true);
    try {
      await addResponsibility(name.trim(), Number(points), pin);
      setName("");
      setPoints("1");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    setRemovingId(id);
    try {
      await deleteResponsibility(id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditName(r.name);
    setEditPoints(String(r.points));
  };

  const saveEdit = async () => {
    if (!editName.trim() || !Number(editPoints) || Number(editPoints) <= 0) return;
    setSavingEdit(true);
    try {
      await updateResponsibility(editingId, editName.trim(), Number(editPoints), pin);
      setEditingId(null);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {responsibilities.map((r) =>
          editingId === r.id ? (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input style={{ ...inputStyle, width: 60 }} type="number" value={editPoints} onChange={(e) => setEditPoints(e.target.value)} />
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#3DB88A", opacity: savingEdit ? 0.5 : 1 }}
              >
                <Check size={14} color="#fff" />
              </button>
              <button onClick={() => setEditingId(null)} disabled={savingEdit} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#F7F1E9" }}>
                <X size={14} color="#B4A392" />
              </button>
            </div>
          ) : (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 700 }}>
              <span style={{ flex: 1 }}>{r.name}</span>
              <span style={{ color: "#94795F", fontWeight: 800 }}>+{r.points}⭐</span>
              <button onClick={() => startEdit(r)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F1E7DC" }}>
                <Pencil size={12} color="#8A7457" />
              </button>
              <button
                onClick={() => remove(r.id)}
                disabled={removingId === r.id}
                style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9", opacity: removingId === r.id ? 0.5 : 1 }}
              >
                <X size={14} color="#B4A392" />
              </button>
            </div>
          )
        )}
      </div>
      <label style={labelStyle}>新增生活責任項目</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="項目名稱" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...inputStyle, width: 70 }} type="number" placeholder="⭐" value={points} onChange={(e) => setPoints(e.target.value)} />
      </div>
      <button onClick={add} disabled={adding} style={{ ...primaryBtnStyle, background: "#94795F", marginTop: 10, opacity: adding ? 0.6 : 1 }}>
        {adding ? "新增中..." : "新增"}
      </button>
    </div>
  );
}

// ---------------- 特殊任務管理 ----------------
function MissionsManageTab({ kids, missions, pin, refetch }) {
  const [kidId, setKidId] = useState(kids[0]?.id || "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const kidMap = Object.fromEntries(kids.map((k) => [k.id, k]));
  const statusLabel = { open: "待完成", pending: "審核中", done: "已完成" };
  const statusColor = { open: "#B4A392", pending: "#E8A23D", done: "#3DB88A" };

  const add = async () => {
    if (!kidId || !name.trim() || !Number(amount) || Number(amount) <= 0) return;
    setAdding(true);
    try {
      await addMission(kidId, name.trim(), Number(amount), pin);
      setName("");
      setAmount("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id) => {
    setRemovingId(id);
    try {
      await deleteMission(id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditAmount(String(m.amount));
  };

  const saveEdit = async () => {
    if (!editName.trim() || !Number(editAmount) || Number(editAmount) <= 0) return;
    setSavingEdit(true);
    try {
      await updateMission(editingId, editName.trim(), Number(editAmount), pin);
      setEditingId(null);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
        {missions.map((m) =>
          editingId === m.id ? (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12 }}>
              <span style={{ fontSize: 20 }}>{kidMap[m.kid_id]?.avatar}</span>
              <input style={{ ...inputStyle, flex: 1 }} value={editName} onChange={(e) => setEditName(e.target.value)} />
              <input style={{ ...inputStyle, width: 70 }} type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#3DB88A", opacity: savingEdit ? 0.5 : 1 }}
              >
                <Check size={14} color="#fff" />
              </button>
              <button onClick={() => setEditingId(null)} disabled={savingEdit} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#F7F1E9" }}>
                <X size={14} color="#B4A392" />
              </button>
            </div>
          ) : (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 700 }}>
              <span style={{ fontSize: 20 }}>{kidMap[m.kid_id]?.avatar}</span>
              <span style={{ flex: 1 }}>{m.name}</span>
              <span style={{ color: "#3DB88A", fontWeight: 800 }}>+{m.amount}</span>
              <span style={{ fontSize: 11, color: statusColor[m.status], fontWeight: 800 }}>{statusLabel[m.status]}</span>
              {m.status === "open" && (
                <button onClick={() => startEdit(m)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F1E7DC" }}>
                  <Pencil size={12} color="#8A7457" />
                </button>
              )}
              <button
                onClick={() => remove(m.id)}
                disabled={removingId === m.id}
                style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9", opacity: removingId === m.id ? 0.5 : 1 }}
              >
                <X size={14} color="#B4A392" />
              </button>
            </div>
          )
        )}
      </div>

      <label style={labelStyle}>指定小孩</label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {kids.map((k) => (
          <button
            key={k.id}
            onClick={() => setKidId(k.id)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              background: kidId === k.id ? "#5A4632" : "#F1E7DC",
              color: kidId === k.id ? "#fff" : "#8A7457",
            }}
          >
            {k.avatar} {k.name}
          </button>
        ))}
      </div>
      <label style={labelStyle}>新增特殊任務</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="任務名稱" value={name} onChange={(e) => setName(e.target.value)} />
        <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="金額" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <button onClick={add} disabled={adding} style={{ ...primaryBtnStyle, background: "#E86A3A", marginTop: 10, opacity: adding ? 0.6 : 1 }}>
        {adding ? "新增中..." : "新增任務"}
      </button>
    </div>
  );
}

// ---------------- 定期收支（零用錢 / 固定支出 / 利息） ----------------
function RecurringManageTab({ kids, allowanceRules, expenseRules, pin, refetch }) {
  const kidMap = Object.fromEntries(kids.map((k) => [k.id, k]));

  const [allowanceKidId, setAllowanceKidId] = useState(kids[0]?.id || "");
  const [allowanceAmount, setAllowanceAmount] = useState("");
  const [allowanceFrequency, setAllowanceFrequency] = useState("weekly");
  const [allowanceDayOfWeek, setAllowanceDayOfWeek] = useState(0);
  const [allowanceDayOfMonth, setAllowanceDayOfMonth] = useState("1");
  const [addingAllowance, setAddingAllowance] = useState(false);
  const [removingAllowanceId, setRemovingAllowanceId] = useState(null);

  const [expenseKidId, setExpenseKidId] = useState(kids[0]?.id || "");
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDayOfMonth, setExpenseDayOfMonth] = useState("1");
  const [addingExpense, setAddingExpense] = useState(false);
  const [removingExpenseId, setRemovingExpenseId] = useState(null);

  const [rateInputs, setRateInputs] = useState({});
  const [savingRateId, setSavingRateId] = useState(null);

  const [editingAllowanceId, setEditingAllowanceId] = useState(null);
  const [editAllowanceAmount, setEditAllowanceAmount] = useState("");
  const [editAllowanceFrequency, setEditAllowanceFrequency] = useState("weekly");
  const [editAllowanceDayOfWeek, setEditAllowanceDayOfWeek] = useState(0);
  const [editAllowanceDayOfMonth, setEditAllowanceDayOfMonth] = useState("1");
  const [savingAllowanceEdit, setSavingAllowanceEdit] = useState(false);

  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [editExpenseName, setEditExpenseName] = useState("");
  const [editExpenseAmount, setEditExpenseAmount] = useState("");
  const [editExpenseDayOfMonth, setEditExpenseDayOfMonth] = useState("1");
  const [savingExpenseEdit, setSavingExpenseEdit] = useState(false);

  const addAllowance = async () => {
    const amt = Number(allowanceAmount);
    if (!allowanceKidId || !amt || amt <= 0) return;
    setAddingAllowance(true);
    try {
      await addAllowanceRule(
        allowanceKidId,
        amt,
        allowanceFrequency,
        allowanceFrequency === "weekly" ? Number(allowanceDayOfWeek) : null,
        allowanceFrequency === "monthly" ? Number(allowanceDayOfMonth) : null,
        pin
      );
      setAllowanceAmount("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAddingAllowance(false);
    }
  };

  const removeAllowance = async (id) => {
    setRemovingAllowanceId(id);
    try {
      await deleteAllowanceRule(id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setRemovingAllowanceId(null);
    }
  };

  const addExpense = async () => {
    const amt = Number(expenseAmount);
    if (!expenseKidId || !expenseName.trim() || !amt || amt <= 0) return;
    setAddingExpense(true);
    try {
      await addExpenseRule(expenseKidId, expenseName.trim(), amt, Number(expenseDayOfMonth), pin);
      setExpenseName("");
      setExpenseAmount("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAddingExpense(false);
    }
  };

  const removeExpense = async (id) => {
    setRemovingExpenseId(id);
    try {
      await deleteExpenseRule(id, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setRemovingExpenseId(null);
    }
  };

  const startEditAllowance = (r) => {
    setEditingAllowanceId(r.id);
    setEditAllowanceAmount(String(r.amount));
    setEditAllowanceFrequency(r.frequency);
    setEditAllowanceDayOfWeek(r.day_of_week ?? 0);
    setEditAllowanceDayOfMonth(String(r.day_of_month ?? 1));
  };

  const saveEditAllowance = async () => {
    const amt = Number(editAllowanceAmount);
    if (!amt || amt <= 0) return;
    setSavingAllowanceEdit(true);
    try {
      await updateAllowanceRule(
        editingAllowanceId,
        amt,
        editAllowanceFrequency,
        editAllowanceFrequency === "weekly" ? Number(editAllowanceDayOfWeek) : null,
        editAllowanceFrequency === "monthly" ? Number(editAllowanceDayOfMonth) : null,
        pin
      );
      setEditingAllowanceId(null);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingAllowanceEdit(false);
    }
  };

  const startEditExpense = (r) => {
    setEditingExpenseId(r.id);
    setEditExpenseName(r.name);
    setEditExpenseAmount(String(r.amount));
    setEditExpenseDayOfMonth(String(r.day_of_month));
  };

  const saveEditExpense = async () => {
    if (!editExpenseName.trim() || !Number(editExpenseAmount) || Number(editExpenseAmount) <= 0) return;
    setSavingExpenseEdit(true);
    try {
      await updateExpenseRule(editingExpenseId, editExpenseName.trim(), Number(editExpenseAmount), Number(editExpenseDayOfMonth), pin);
      setEditingExpenseId(null);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingExpenseEdit(false);
    }
  };

  const saveRate = async (kid) => {
    const pct = Number(rateInputs[kid.id] ?? kid.interest_rate * 100);
    if (Number.isNaN(pct) || pct < 0) return;
    setSavingRateId(kid.id);
    try {
      await setInterestRate(kid.id, pct / 100, pin);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingRateId(null);
    }
  };

  return (
    <div>
      <label style={labelStyle}>💸 固定零用錢</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {allowanceRules.map((r) =>
          editingAllowanceId === r.id ? (
            <div key={r.id} style={{ background: "#fff", padding: "10px 12px", borderRadius: 12 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[
                  { id: "weekly", label: "每週" },
                  { id: "monthly", label: "每月" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setEditAllowanceFrequency(opt.id)}
                    style={{
                      flex: 1,
                      padding: "6px 6px",
                      borderRadius: 10,
                      border: "none",
                      fontWeight: 700,
                      fontSize: 12.5,
                      background: editAllowanceFrequency === opt.id ? "#5A4632" : "#F1E7DC",
                      color: editAllowanceFrequency === opt.id ? "#fff" : "#8A7457",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {editAllowanceFrequency === "weekly" ? (
                  <select style={{ ...inputStyle, flex: 1 }} value={editAllowanceDayOfWeek} onChange={(e) => setEditAllowanceDayOfWeek(e.target.value)}>
                    {WEEKDAY_LABELS.map((label, i) => (
                      <option key={i} value={i}>
                        每{label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    type="number"
                    min={1}
                    max={31}
                    value={editAllowanceDayOfMonth}
                    onChange={(e) => setEditAllowanceDayOfMonth(e.target.value)}
                  />
                )}
                <input style={{ ...inputStyle, width: 90 }} type="number" value={editAllowanceAmount} onChange={(e) => setEditAllowanceAmount(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveEditAllowance}
                  disabled={savingAllowanceEdit}
                  style={{ flex: 1, border: "none", borderRadius: 10, padding: "8px 12px", background: "#3DB88A", color: "#fff", fontWeight: 700, opacity: savingAllowanceEdit ? 0.6 : 1 }}
                >
                  {savingAllowanceEdit ? "儲存中..." : "儲存"}
                </button>
                <button
                  onClick={() => setEditingAllowanceId(null)}
                  disabled={savingAllowanceEdit}
                  style={{ border: "2px solid #E3D3C2", borderRadius: 10, padding: "8px 12px", background: "#fff", fontWeight: 700, color: "#B4A392" }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 700 }}>
              <span style={{ fontSize: 20 }}>{kidMap[r.kid_id]?.avatar}</span>
              <span style={{ flex: 1, fontSize: 13 }}>
                {r.frequency === "weekly" ? `每${WEEKDAY_LABELS[r.day_of_week]}` : `每月 ${r.day_of_month} 號`}
              </span>
              <span style={{ color: "#3DB88A", fontWeight: 800 }}>+{r.amount}</span>
              <button onClick={() => startEditAllowance(r)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F1E7DC" }}>
                <Pencil size={12} color="#8A7457" />
              </button>
              <button
                onClick={() => removeAllowance(r.id)}
                disabled={removingAllowanceId === r.id}
                style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9", opacity: removingAllowanceId === r.id ? 0.5 : 1 }}
              >
                <X size={14} color="#B4A392" />
              </button>
            </div>
          )
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {kids.map((k) => (
          <button
            key={k.id}
            onClick={() => setAllowanceKidId(k.id)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              background: allowanceKidId === k.id ? "#5A4632" : "#F1E7DC",
              color: allowanceKidId === k.id ? "#fff" : "#8A7457",
            }}
          >
            {k.avatar} {k.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {[
          { id: "weekly", label: "每週" },
          { id: "monthly", label: "每月" },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setAllowanceFrequency(opt.id)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              background: allowanceFrequency === opt.id ? "#5A4632" : "#F1E7DC",
              color: allowanceFrequency === opt.id ? "#fff" : "#8A7457",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {allowanceFrequency === "weekly" ? (
          <select style={{ ...inputStyle, flex: 1 }} value={allowanceDayOfWeek} onChange={(e) => setAllowanceDayOfWeek(e.target.value)}>
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={i} value={i}>
                每{label}
              </option>
            ))}
          </select>
        ) : (
          <input
            style={{ ...inputStyle, flex: 1 }}
            type="number"
            min={1}
            max={31}
            placeholder="每月幾號（1-31）"
            value={allowanceDayOfMonth}
            onChange={(e) => setAllowanceDayOfMonth(e.target.value)}
          />
        )}
        <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="金額" value={allowanceAmount} onChange={(e) => setAllowanceAmount(e.target.value)} />
      </div>
      <button onClick={addAllowance} disabled={addingAllowance} style={{ ...primaryBtnStyle, background: "#3DB88A", opacity: addingAllowance ? 0.6 : 1 }}>
        {addingAllowance ? "新增中..." : "新增零用錢規則"}
      </button>

      <div style={{ height: 1, background: "#F1E7DC", margin: "20px 0" }} />

      <label style={labelStyle}>🏠 固定支出</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {expenseRules.map((r) =>
          editingExpenseId === r.id ? (
            <div key={r.id} style={{ background: "#fff", padding: "10px 12px", borderRadius: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input style={{ ...inputStyle, flex: 1 }} value={editExpenseName} onChange={(e) => setEditExpenseName(e.target.value)} />
                <input style={{ ...inputStyle, width: 90 }} type="number" value={editExpenseAmount} onChange={(e) => setEditExpenseAmount(e.target.value)} />
              </div>
              <input
                style={{ ...inputStyle, marginBottom: 8 }}
                type="number"
                min={1}
                max={31}
                value={editExpenseDayOfMonth}
                onChange={(e) => setEditExpenseDayOfMonth(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={saveEditExpense}
                  disabled={savingExpenseEdit}
                  style={{ flex: 1, border: "none", borderRadius: 10, padding: "8px 12px", background: "#E85D5D", color: "#fff", fontWeight: 700, opacity: savingExpenseEdit ? 0.6 : 1 }}
                >
                  {savingExpenseEdit ? "儲存中..." : "儲存"}
                </button>
                <button
                  onClick={() => setEditingExpenseId(null)}
                  disabled={savingExpenseEdit}
                  style={{ border: "2px solid #E3D3C2", borderRadius: 10, padding: "8px 12px", background: "#fff", fontWeight: 700, color: "#B4A392" }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12, fontWeight: 700 }}>
              <span style={{ fontSize: 20 }}>{kidMap[r.kid_id]?.avatar}</span>
              <span style={{ flex: 1 }}>{r.name}</span>
              <span style={{ fontSize: 13, color: "#B4A392" }}>每月 {r.day_of_month} 號</span>
              <span style={{ color: "#E85D5D", fontWeight: 800 }}>-{r.amount}</span>
              <button onClick={() => startEditExpense(r)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F1E7DC" }}>
                <Pencil size={12} color="#8A7457" />
              </button>
              <button
                onClick={() => removeExpense(r.id)}
                disabled={removingExpenseId === r.id}
                style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9", opacity: removingExpenseId === r.id ? 0.5 : 1 }}
              >
                <X size={14} color="#B4A392" />
              </button>
            </div>
          )
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {kids.map((k) => (
          <button
            key={k.id}
            onClick={() => setExpenseKidId(k.id)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 10,
              border: "none",
              fontWeight: 700,
              fontSize: 13,
              background: expenseKidId === k.id ? "#5A4632" : "#F1E7DC",
              color: expenseKidId === k.id ? "#fff" : "#8A7457",
            }}
          >
            {k.avatar} {k.name}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input style={{ ...inputStyle, flex: 1 }} placeholder="支出名稱（例如：手機費）" value={expenseName} onChange={(e) => setExpenseName(e.target.value)} />
        <input style={{ ...inputStyle, width: 90 }} type="number" placeholder="金額" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} />
      </div>
      <input
        style={{ ...inputStyle, marginBottom: 8 }}
        type="number"
        min={1}
        max={31}
        placeholder="每月幾號扣款（1-31）"
        value={expenseDayOfMonth}
        onChange={(e) => setExpenseDayOfMonth(e.target.value)}
      />
      <button onClick={addExpense} disabled={addingExpense} style={{ ...primaryBtnStyle, background: "#E85D5D", opacity: addingExpense ? 0.6 : 1 }}>
        {addingExpense ? "新增中..." : "新增固定支出"}
      </button>

      <div style={{ height: 1, background: "#F1E7DC", margin: "20px 0" }} />

      <label style={labelStyle}>📈 存錢利息（每月 1 號依當時餘額結算）</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {kids.map((k) => (
          <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", padding: "10px 12px", borderRadius: 12 }}>
            <span style={{ fontSize: 20 }}>{k.avatar}</span>
            <span style={{ flex: 1, fontWeight: 700 }}>{k.name}</span>
            <input
              style={{ ...inputStyle, width: 70 }}
              type="number"
              step="0.1"
              placeholder="%"
              value={rateInputs[k.id] ?? k.interest_rate * 100}
              onChange={(e) => setRateInputs({ ...rateInputs, [k.id]: e.target.value })}
            />
            <span style={{ fontSize: 13, color: "#B4A392" }}>%</span>
            <button
              onClick={() => saveRate(k)}
              disabled={savingRateId === k.id}
              style={{ border: "none", borderRadius: 10, padding: "8px 14px", background: "#94795F", color: "#fff", fontWeight: 700, fontSize: 12.5, opacity: savingRateId === k.id ? 0.6 : 1 }}
            >
              {savingRateId === k.id ? "儲存中..." : "儲存"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------- 設定 ----------------
function SettingsTab({ pin }) {
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const doChangePin = async () => {
    if (pin1.length !== 4 || !/^\d{4}$/.test(pin1)) return setMsg("密碼需為 4 碼數字");
    if (pin1 !== pin2) return setMsg("兩次密碼不一致");
    setSaving(true);
    try {
      await changePin(pin1, pin);
      setPin1("");
      setPin2("");
      setMsg("密碼已更新 ✅（下次進入家長模式請用新密碼）");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <label style={labelStyle}>修改家長密碼</label>
      <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="新密碼（4碼數字）" maxLength={4} value={pin1} onChange={(e) => setPin1(e.target.value.replace(/\D/g, ""))} />
      <input style={inputStyle} placeholder="再輸入一次" maxLength={4} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
      <button onClick={doChangePin} disabled={saving} style={{ ...primaryBtnStyle, background: "#94795F", marginTop: 10, opacity: saving ? 0.6 : 1 }}>
        {saving ? "更新中..." : "更新密碼"}
      </button>
      {msg && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#8A6E3D" }}>{msg}</div>}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 800, color: "#8A7457", marginBottom: 6, marginTop: 12 };
const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "2px solid #F1E7DC", fontSize: 15, outline: "none" };
const primaryBtnStyle = { width: "100%", padding: 12, borderRadius: 12, border: "none", color: "#fff", fontWeight: 800, fontSize: 15 };
