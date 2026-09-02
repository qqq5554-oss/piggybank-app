import React, { useState, useRef, useEffect } from "react";
import { GripVertical, Plus, X, Pencil, Check } from "lucide-react";
import { SLICE_COLORS } from "./WheelCanvas";

const ROW_H = 52; // 每一列的高度（含間距），拖曳時用來算要換到第幾個位置

// 轉盤選項的編輯器：可以改文字、拖曳把手上下調整順序、刪除、新增。
// 兩個轉盤（決定事情用的、每日獎勵用的）共用這一個元件，
// withRewards = true 時多出「完成給幾⭐／幾元」兩個欄位。
export default function WheelOptionsEditor({ options, withRewards = false, withWeights = false, onAdd, onUpdate, onDelete, onReorder }) {
  const [items, setItems] = useState(options);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editMoney, setEditMoney] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newPoints, setNewPoints] = useState("");
  const [newMoney, setNewMoney] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(null); // { index, delta }
  const dragRef = useRef(null);

  // 外部資料變了就同步，但正在拖曳時不要打斷
  useEffect(() => {
    if (!drag) setItems(options);
  }, [options, drag]);

  // 中獎機率 = 這格份數 ÷ 全部份數
  const totalWeight = items.reduce((sum, o) => sum + Math.max(0.01, Number(o.weight ?? 1)), 0) || 1;
  const pctOf = (opt) => Math.round((Math.max(0.01, Number(opt.weight ?? 1)) / totalWeight) * 100);

  const targetIndex = drag
    ? Math.max(0, Math.min(items.length - 1, drag.index + Math.round(drag.delta / ROW_H)))
    : null;

  const startDrag = (e, index) => {
    if (editingId) return;
    e.preventDefault();
    const startY = e.touches ? e.touches[0].clientY : e.clientY;
    dragRef.current = { index, startY };
    setDrag({ index, delta: 0 });
  };

  useEffect(() => {
    if (!drag) return;

    const move = (e) => {
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      if (e.cancelable) e.preventDefault();
      setDrag((d) => (d ? { ...d, delta: y - dragRef.current.startY } : d));
    };

    const end = async () => {
      const info = dragRef.current;
      const current = drag;
      dragRef.current = null;
      setDrag(null);
      if (!info || !current) return;

      const from = info.index;
      const to = Math.max(0, Math.min(items.length - 1, from + Math.round(current.delta / ROW_H)));
      if (from === to) return;

      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setItems(next); // 先在畫面上換好，不要等伺服器
      setBusy(true);
      try {
        await onReorder(next.map((o) => o.id));
      } catch (err) {
        alert(err.message);
        setItems(options); // 失敗就還原
      } finally {
        setBusy(false);
      }
    };

    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", end);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", end);
    return () => {
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", end);
    };
  }, [drag, items, options, onReorder]);

  // 拖曳時其他列要讓出位置
  const offsetFor = (i) => {
    if (!drag || targetIndex === null) return 0;
    if (i === drag.index) return drag.delta;
    if (drag.index < targetIndex && i > drag.index && i <= targetIndex) return -ROW_H;
    if (drag.index > targetIndex && i < drag.index && i >= targetIndex) return ROW_H;
    return 0;
  };

  const startEdit = (opt) => {
    setEditingId(opt.id);
    setEditLabel(opt.label);
    setEditPoints(Number(opt.reward_points) ? String(Number(opt.reward_points)) : "");
    setEditMoney(Number(opt.reward_money) ? String(Number(opt.reward_money)) : "");
    setEditWeight(String(Number(opt.weight ?? 1)));
  };

  const saveEdit = async () => {
    if (!editLabel.trim()) return;
    setBusy(true);
    try {
      await onUpdate(editingId, {
        label: editLabel.trim(),
        rewardPoints: Number(editPoints) || 0,
        rewardMoney: Number(editMoney) || 0,
        weight: Number(editWeight) || 1,
      });
      setEditingId(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!newLabel.trim()) return;
    setBusy(true);
    try {
      await onAdd({
        label: newLabel.trim(),
        rewardPoints: Number(newPoints) || 0,
        rewardMoney: Number(newMoney) || 0,
        weight: Number(newWeight) || 1,
      });
      setNewLabel("");
      setNewPoints("");
      setNewMoney("");
      setNewWeight("");
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await onDelete(id);
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const rewardLabel = (opt) => {
    const parts = [];
    if (Number(opt.reward_points) > 0) parts.push(`+${Number(opt.reward_points)}⭐`);
    if (Number(opt.reward_money) > 0) parts.push(`+${Number(opt.reward_money)}元`);
    return parts.join(" ");
  };

  return (
    <div>
      <div style={{ position: "relative" }}>
        {items.map((opt, i) =>
          editingId === opt.id ? (
            <div key={opt.id} style={{ background: "#fff", borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
              <input
                style={inputStyle}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="選項名稱"
              />
              {withRewards && (
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="給幾⭐（選填）" value={editPoints} onChange={(e) => setEditPoints(e.target.value)} />
                  <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="給幾元（選填）" value={editMoney} onChange={(e) => setEditMoney(e.target.value)} />
                </div>
              )}
              {withWeights && (
                <div style={{ marginTop: 8 }}>
                  <input
                    style={inputStyle}
                    type="number"
                    min={1}
                    placeholder="機率份數（預設 1）"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                  />
                  <div style={{ fontSize: 11, color: "#B4A392", marginTop: 4 }}>
                    份數越大越容易中；想做稀有的神秘獎品就填比別人小的份數。
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={saveEdit}
                  disabled={busy}
                  style={{ flex: 1, border: "none", borderRadius: 10, padding: "9px 0", background: "#3DB88A", color: "#fff", fontWeight: 800, opacity: busy ? 0.6 : 1 }}
                >
                  <Check size={15} style={{ verticalAlign: "-2px" }} /> 儲存
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{ border: "2px solid #E3D3C2", borderRadius: 10, padding: "8px 14px", background: "#fff", color: "#B4A392", fontWeight: 700 }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div
              key={opt.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#fff",
                padding: "10px 12px",
                borderRadius: 12,
                marginBottom: 6,
                height: ROW_H - 6,
                boxSizing: "border-box",
                transform: `translateY(${offsetFor(i)}px)`,
                transition: drag && i !== drag.index ? "transform .16s ease-out" : "none",
                boxShadow: drag && i === drag.index ? "0 6px 18px rgba(90,70,50,.22)" : "none",
                position: drag && i === drag.index ? "relative" : "static",
                zIndex: drag && i === drag.index ? 5 : 1,
                opacity: busy ? 0.7 : 1,
              }}
            >
              <span
                onTouchStart={(e) => startDrag(e, i)}
                onMouseDown={(e) => startDrag(e, i)}
                style={{ display: "flex", alignItems: "center", padding: "4px 2px", cursor: "grab", touchAction: "none", color: "#C4B4A0" }}
              >
                <GripVertical size={17} />
              </span>
              <span
                style={{ width: 12, height: 12, borderRadius: 4, background: SLICE_COLORS[i % SLICE_COLORS.length], flexShrink: 0 }}
              />
              <span style={{ flex: 1, fontWeight: 700, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {opt.label}
              </span>
              {withRewards && rewardLabel(opt) && (
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "#3DB88A" }}>{rewardLabel(opt)}</span>
              )}
              {withWeights && (
                <span style={{ fontSize: 11.5, fontWeight: 800, color: "#94795F", whiteSpace: "nowrap" }}>{pctOf(opt)}%</span>
              )}
              <button onClick={() => startEdit(opt)} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F1E7DC", flexShrink: 0 }}>
                <Pencil size={12} color="#8A7457" />
              </button>
              <button onClick={() => remove(opt.id)} disabled={busy} style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9", flexShrink: 0 }}>
                <X size={14} color="#B4A392" />
              </button>
            </div>
          )
        )}
      </div>

      {items.length === 0 && (
        <div style={{ textAlign: "center", color: "#B4A392", padding: "14px 0", fontSize: 13 }}>還沒有選項</div>
      )}

      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="新增選項"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={add}
            disabled={busy || !newLabel.trim()}
            style={{ border: "none", borderRadius: 12, padding: "0 16px", background: "#E86A3A", color: "#fff", fontWeight: 800, opacity: busy || !newLabel.trim() ? 0.5 : 1 }}
          >
            <Plus size={18} />
          </button>
        </div>
        {withRewards && (
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="給幾⭐（選填）" value={newPoints} onChange={(e) => setNewPoints(e.target.value)} />
            <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="給幾元（選填）" value={newMoney} onChange={(e) => setNewMoney(e.target.value)} />
            {withWeights && (
              <input style={{ ...inputStyle, flex: 1 }} type="number" min={1} placeholder="份數（預設1）" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
            )}
          </div>
        )}
      </div>

      <div style={{ fontSize: 11.5, color: "#C4B4A0", marginTop: 10, lineHeight: 1.7 }}>
        按住左邊的 ⠿ 上下拖曳可以調整順序，鉛筆可以改文字{withWeights ? "與中獎機率" : ""}。
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  border: "2px solid #F1E7DC",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 15,
  outline: "none",
  background: "#fff",
};
