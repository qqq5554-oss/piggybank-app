import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, Users, Plus, Check, X } from "lucide-react";
import {
  addWheelOption,
  updateWheelOption,
  deleteWheelOption,
  reorderWheelOptions,
  addWheelPreset,
  renameWheelPreset,
  deleteWheelPreset,
} from "../api/client";
import WheelCanvas, { rotationForIndex, SPIN_MS } from "./WheelCanvas";
import WheelOptionsEditor from "./WheelOptionsEditor";

const LAST_PRESET_KEY = "piggybank_last_wheel_preset";

// 小轉盤：可以存好幾組不同內容的轉盤（例如「誰洗碗」「晚餐吃什麼」），
// 用上面的頁籤切換，不用每次換場合都重編一次選項。
export default function SpinWheelScreen({ wheelOptions, wheelPresets, kids, onBack, refetch }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [slide, setSlide] = useState(0); // 換組時的滑入動畫
  const timerRef = useRef(null);
  const swipeRef = useRef({ x: 0, y: 0, active: false });

  // 記住上次用的是哪一組，下次打開直接是同一個
  const [presetId, setPresetId] = useState(() => localStorage.getItem(LAST_PRESET_KEY) || null);
  const activePreset = wheelPresets.find((p) => p.id === presetId) || wheelPresets[0] || null;

  useEffect(() => {
    if (activePreset && activePreset.id !== presetId) setPresetId(activePreset.id);
  }, [activePreset, presetId]);

  useEffect(() => {
    if (activePreset) {
      try {
        localStorage.setItem(LAST_PRESET_KEY, activePreset.id);
      } catch (err) {
        /* 無痕模式寫不進去就算了 */
      }
    }
  }, [activePreset]);

  const options = activePreset ? wheelOptions.filter((o) => o.preset_id === activePreset.id) : [];
  const n = options.length;

  const switchPreset = (id) => {
    setPresetId(id);
    setResult(null);
    setRotation(0);
    setEditing(false);
  };

  // 左右滑動換下一組／上一組轉盤
  const goPreset = (dir) => {
    if (spinning || !activePreset) return;
    const idx = wheelPresets.findIndex((p) => p.id === activePreset.id);
    const next = idx + dir;
    if (next < 0 || next >= wheelPresets.length) return;

    switchPreset(wheelPresets[next].id);
    // 先跳到偏移的位置，下一幀再滑回原位，做出「換頁」的感覺
    setSlide(dir > 0 ? 30 : -30);
    requestAnimationFrame(() => requestAnimationFrame(() => setSlide(0)));
  };

  const onSwipeStart = (e) => {
    const t = e.touches[0];
    swipeRef.current = { x: t.clientX, y: t.clientY, active: true };
  };

  const onSwipeEnd = (e) => {
    if (!swipeRef.current.active) return;
    swipeRef.current.active = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - swipeRef.current.x;
    const dy = t.clientY - swipeRef.current.y;
    // 要夠明顯的水平滑動才算，避免上下捲動時誤觸
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    goPreset(dx < 0 ? 1 : -1);
  };

  const spin = () => {
    if (spinning || n < 2) return;
    setResult(null);
    setSpinning(true);

    // 先隨機抽中哪一格，再回推要轉到的角度，畫面停下來的位置一定跟結果一致
    const index = Math.floor(Math.random() * n);
    setRotation((prev) => rotationForIndex(prev, index, n));

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSpinning(false);
      setResult(options[index].label);
    }, SPIN_MS);
  };

  const createPreset = async () => {
    const name = newPresetName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const { preset } = await addWheelPreset(name);
      setNewPresetName("");
      setCreating(false);
      await refetch();
      if (preset?.id) {
        switchPreset(preset.id);
        setEditing(true); // 新轉盤是空的，直接進編輯模式加選項
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const doRename = async () => {
    const name = renameValue.trim();
    if (!name || !activePreset || name === activePreset.name) return;
    setBusy(true);
    try {
      await renameWheelPreset(activePreset.id, name);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removePreset = async () => {
    if (!activePreset) return;
    if (!window.confirm(`確定要刪除「${activePreset.name}」這組轉盤嗎？裡面的選項也會一起刪掉。`)) return;
    setBusy(true);
    try {
      await deleteWheelPreset(activePreset.id);
      setPresetId(null);
      setEditing(false);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const fillWithKids = async () => {
    if (!activePreset) return;
    setBusy(true);
    try {
      for (let i = 0; i < kids.length; i++) await addWheelOption(activePreset.id, kids[i].name, n + i + 1);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px 8px" }}>
        <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>🎡 小轉盤</span>
      </div>

      {/* 轉盤組頁籤 */}
      <div style={{ display: "flex", gap: 6, padding: "2px 14px 10px", overflowX: "auto" }}>
        {wheelPresets.map((p) => (
          <button
            key={p.id}
            onClick={() => switchPreset(p.id)}
            style={{
              padding: "8px 14px",
              borderRadius: 20,
              border: "none",
              whiteSpace: "nowrap",
              fontWeight: 700,
              fontSize: 13.5,
              background: activePreset?.id === p.id ? "#5A4632" : "#F1E7DC",
              color: activePreset?.id === p.id ? "#fff" : "#8A7457",
            }}
          >
            {p.name}
          </button>
        ))}
        <button
          onClick={() => setCreating((v) => !v)}
          aria-label="新增轉盤"
          style={{
            padding: "8px 12px",
            borderRadius: 20,
            border: "2px dashed #D8C6B0",
            background: "none",
            color: "#8A7457",
            fontWeight: 800,
            display: "flex",
            alignItems: "center",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={15} />
        </button>
      </div>

      {wheelPresets.length > 1 && !creating && (
        <div style={{ textAlign: "center", fontSize: 11.5, color: "#C4B4A0", paddingBottom: 6 }}>
          在轉盤上左右滑動可以換一組
        </div>
      )}

      {creating && (
        <div style={{ display: "flex", gap: 8, padding: "0 14px 12px" }}>
          <input
            autoFocus
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createPreset()}
            placeholder="新轉盤名稱（例如：晚餐吃什麼）"
            style={{ flex: 1, boxSizing: "border-box", border: "2px solid #F1E7DC", borderRadius: 12, padding: "10px 12px", fontSize: 14.5, outline: "none", background: "#fff" }}
          />
          <button
            onClick={createPreset}
            disabled={busy || !newPresetName.trim()}
            style={{ border: "none", borderRadius: 12, padding: "0 16px", background: "#E86A3A", color: "#fff", fontWeight: 800, opacity: busy || !newPresetName.trim() ? 0.5 : 1 }}
          >
            <Check size={17} />
          </button>
          <button
            onClick={() => {
              setCreating(false);
              setNewPresetName("");
            }}
            style={{ border: "2px solid #E3D3C2", borderRadius: 12, padding: "0 12px", background: "#fff", color: "#B4A392" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div
        data-no-swipe-back="true"
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2px 18px 0" }}
      >
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            transform: `translateX(${slide}px)`,
            opacity: slide ? 0.3 : 1,
            transition: slide ? "none" : "transform .22s ease-out, opacity .22s ease-out",
          }}
        >
          <WheelCanvas options={options} rotation={rotation} spinning={spinning} />
        </div>

        <button
          onClick={spin}
          disabled={spinning || n < 2}
          style={{
            marginTop: 18,
            width: "100%",
            maxWidth: 300,
            border: "none",
            borderRadius: 16,
            padding: 16,
            background: "#E86A3A",
            color: "#fff",
            fontWeight: 800,
            fontSize: 17,
            opacity: spinning || n < 2 ? 0.45 : 1,
          }}
        >
          {spinning ? "轉動中..." : n < 2 ? "至少要兩個選項" : "轉！"}
        </button>

        <div style={{ minHeight: 58, marginTop: 12, textAlign: "center" }}>
          {result && (
            <div
              style={{
                background: "#fff",
                border: "2px solid #FFD9C2",
                borderRadius: 16,
                padding: "12px 22px",
                display: "inline-block",
                animation: "toastIn .25s ease-out",
              }}
            >
              <div style={{ fontSize: 12, color: "#B4A392", fontWeight: 700 }}>結果</div>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 800, color: "#E86A3A" }}>{result}</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "6px 18px 40px" }}>
        <button
          onClick={() => {
            setEditing((v) => !v);
            setRenameValue(activePreset?.name || "");
          }}
          style={{ width: "100%", border: "2px dashed #D8C6B0", borderRadius: 14, padding: 12, background: "none", fontWeight: 800, color: "#8A7457" }}
        >
          {editing ? "完成編輯" : `編輯「${activePreset?.name || "轉盤"}」（目前 ${n} 個選項）`}
        </button>

        {editing && activePreset && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#8A7457", marginBottom: 6 }}>轉盤名稱</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={doRename}
                style={{ flex: 1, boxSizing: "border-box", border: "2px solid #F1E7DC", borderRadius: 12, padding: "10px 12px", fontSize: 15, outline: "none", background: "#fff" }}
              />
              <button
                onClick={removePreset}
                disabled={busy || wheelPresets.length <= 1}
                style={{
                  border: "2px solid #F1D4D4",
                  borderRadius: 12,
                  padding: "0 14px",
                  background: "#FFF5F5",
                  color: "#E85D5D",
                  fontWeight: 700,
                  fontSize: 13,
                  opacity: wheelPresets.length <= 1 ? 0.4 : 1,
                }}
              >
                刪除轉盤
              </button>
            </div>

            <WheelOptionsEditor
              options={options}
              onAdd={async ({ label }) => {
                await addWheelOption(activePreset.id, label, n + 1);
                await refetch();
              }}
              onUpdate={async (id, { label }) => {
                await updateWheelOption(id, label);
                await refetch();
              }}
              onDelete={async (id) => {
                await deleteWheelOption(id);
                await refetch();
              }}
              onReorder={async (ids) => {
                await reorderWheelOptions(ids);
                await refetch();
              }}
            />

            <button
              onClick={fillWithKids}
              disabled={busy}
              style={{
                width: "100%",
                marginTop: 10,
                border: "none",
                borderRadius: 12,
                padding: 11,
                background: "#F1E7DC",
                color: "#8A7457",
                fontWeight: 700,
                fontSize: 13.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Users size={16} /> 加入小孩的名字（決定誰要做）
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
