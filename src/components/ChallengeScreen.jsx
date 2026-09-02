import React, { useState } from "react";
import { ChevronLeft, Plus, X, Pencil, Check } from "lucide-react";
import { addChallenge, updateChallenge, deleteChallenge, tickChallenge, untickChallenge } from "../api/client";
import { themeOf, formatDate } from "../utils/format";

// 「挑戰」獨立功能頁：
// 次數挑戰（例如吃不喜歡的食物 10 次）每完成一次打一個勾，
// 單次挑戰（例如可以念 1~100）打一個勾就完成。
// 完成的當下自動發放設定好的獎勵（錢／責任值）。
export default function ChallengeScreen({ kid, challenges, onBack, refetch }) {
  const theme = themeOf(kid.theme_id);
  const [busyId, setBusyId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState("");
  const [targetCount, setTargetCount] = useState("1");
  const [rewardMoney, setRewardMoney] = useState("");
  const [rewardPoints, setRewardPoints] = useState("");

  const open = challenges.filter((c) => c.status === "open");
  const done = challenges.filter((c) => c.status === "done");

  const resetForm = () => {
    setName("");
    setTargetCount("1");
    setRewardMoney("");
    setRewardPoints("");
    setEditingId(null);
    setShowForm(false);
  };

  const save = async () => {
    if (!name.trim()) return;
    const target = Math.max(1, Number(targetCount) || 1);
    setAdding(true);
    try {
      if (editingId) {
        await updateChallenge(editingId, name.trim(), target, Number(rewardMoney) || 0, Number(rewardPoints) || 0);
      } else {
        await addChallenge(kid.id, name.trim(), target, Number(rewardMoney) || 0, Number(rewardPoints) || 0);
      }
      resetForm();
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setName(c.name);
    setTargetCount(String(c.target_count));
    setRewardMoney(Number(c.reward_money) ? String(Number(c.reward_money)) : "");
    setRewardPoints(Number(c.reward_points) ? String(Number(c.reward_points)) : "");
    setShowForm(true);
  };

  const tick = async (c) => {
    const remaining = Number(c.target_count) - Number(c.done_count);
    const isLast = remaining === 1;
    const rewardText = [
      Number(c.reward_money) > 0 ? `${Number(c.reward_money)} 元` : null,
      Number(c.reward_points) > 0 ? `${Number(c.reward_points)}⭐` : null,
    ]
      .filter(Boolean)
      .join("、");
    const msg = isLast
      ? `完成「${c.name}」挑戰！${rewardText ? `確認後會發放 ${rewardText}` : ""}`
      : `「${c.name}」完成一次？（${Number(c.done_count) + 1}/${c.target_count}）`;
    if (!window.confirm(msg)) return;

    setBusyId(c.id);
    try {
      await tickChallenge(c.id);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const untick = async (c) => {
    setBusyId(c.id);
    try {
      await untickChallenge(c.id);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`確定要刪除「${c.name}」這個挑戰嗎？`)) return;
    setBusyId(c.id);
    try {
      await deleteChallenge(c.id);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const rewardLabel = (c) => {
    const parts = [];
    if (Number(c.reward_money) > 0) parts.push(`+${Number(c.reward_money)} 元`);
    if (Number(c.reward_points) > 0) parts.push(`+${Number(c.reward_points)}⭐`);
    return parts.join("　");
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: theme.accent, padding: "16px 14px 18px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,.3)", border: "none", borderRadius: 10, width: 34, height: 34 }}>
            <ChevronLeft size={22} color="#fff" />
          </button>
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>
            {kid.avatar} 挑戰
          </span>
        </div>
        <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, opacity: 0.92 }}>
          進行中 {open.length} 個　已完成 {done.length} 個
        </div>
      </div>

      <div style={{ padding: "18px 18px 40px" }}>
        {open.length === 0 && !showForm && (
          <div style={{ textAlign: "center", color: "#B4A392", padding: "20px 0" }}>目前沒有進行中的挑戰</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {open.map((c) => {
            const target = Number(c.target_count);
            const doneCount = Number(c.done_count);
            const busy = busyId === c.id;
            return (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ flex: 1, fontWeight: 800, fontSize: 15.5 }}>{c.name}</span>
                  <button onClick={() => startEdit(c)} style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#F1E7DC" }}>
                    <Pencil size={12} color="#8A7457" />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={busy}
                    style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: "#F7F1E9", opacity: busy ? 0.5 : 1 }}
                  >
                    <X size={14} color="#B4A392" />
                  </button>
                </div>

                {rewardLabel(c) && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#3DB88A", marginBottom: 8 }}>完成獎勵 {rewardLabel(c)}</div>
                )}

                {target > 1 && (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                      {Array.from({ length: target }).map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 8,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: i < doneCount ? theme.accent : "#F1E7DC",
                            color: "#fff",
                          }}
                        >
                          {i < doneCount ? <Check size={14} color="#fff" /> : null}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#B4A392", fontWeight: 700, marginBottom: 8 }}>
                      已完成 {doneCount} / {target} 次
                    </div>
                  </>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => tick(c)}
                    disabled={busy}
                    style={{
                      flex: 1,
                      border: "none",
                      borderRadius: 12,
                      padding: "11px 0",
                      background: theme.accent,
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 14.5,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {target > 1 ? "完成一次 ✓" : "完成挑戰 ✓"}
                  </button>
                  {doneCount > 0 && (
                    <button
                      onClick={() => untick(c)}
                      disabled={busy}
                      style={{
                        border: "2px solid #E3D3C2",
                        borderRadius: 12,
                        padding: "10px 14px",
                        background: "#fff",
                        color: "#B4A392",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      退回一次
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showForm ? (
          <div style={{ background: "#fff", borderRadius: 16, padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 800, color: "#8A7457", marginBottom: 10 }}>
              {editingId ? "編輯挑戰" : "新增挑戰"}
            </div>
            <input
              style={inputStyle}
              placeholder="挑戰內容（例如：吃不喜歡的食物）"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label style={labelStyle}>要完成幾次？（填 1 就是單次挑戰）</label>
            <input style={inputStyle} type="number" min={1} value={targetCount} onChange={(e) => setTargetCount(e.target.value)} />
            <label style={labelStyle}>完成後的獎勵（都可以留空）</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="錢" value={rewardMoney} onChange={(e) => setRewardMoney(e.target.value)} />
              <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="責任值⭐" value={rewardPoints} onChange={(e) => setRewardPoints(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                onClick={save}
                disabled={adding}
                style={{ flex: 1, border: "none", borderRadius: 12, padding: 12, background: theme.accent, color: "#fff", fontWeight: 800, opacity: adding ? 0.6 : 1 }}
              >
                {adding ? "儲存中..." : "儲存"}
              </button>
              <button
                onClick={resetForm}
                style={{ border: "2px solid #E3D3C2", borderRadius: 12, padding: "12px 18px", background: "#fff", color: "#B4A392", fontWeight: 700 }}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: "100%",
              marginTop: 14,
              padding: 13,
              borderRadius: 14,
              border: "2px dashed #D8C6B0",
              background: "none",
              fontWeight: 800,
              color: "#8A7457",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Plus size={18} /> 新增挑戰
          </button>
        )}

        {done.length > 0 && (
          <>
            <div style={{ fontWeight: 800, color: "#8A7457", margin: "26px 0 10px" }}>🏆 已完成的挑戰</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {done.map((c) => (
                <div
                  key={c.id}
                  style={{ background: "#F7F1E9", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span style={{ fontSize: 18 }}>🏆</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: "#8A7457" }}>{c.name}</div>
                    {c.completed_at && (
                      <div style={{ fontSize: 11, color: "#B4A392" }}>{formatDate(c.completed_at)} 完成</div>
                    )}
                  </div>
                  {rewardLabel(c) && <span style={{ fontSize: 12, fontWeight: 800, color: "#3DB88A" }}>{rewardLabel(c)}</span>}
                  <button
                    onClick={() => remove(c)}
                    disabled={busyId === c.id}
                    style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#EFE7DC" }}
                  >
                    <X size={13} color="#B4A392" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 800, color: "#8A7457", marginBottom: 6, marginTop: 12 };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "2px solid #F1E7DC", fontSize: 15, outline: "none" };
