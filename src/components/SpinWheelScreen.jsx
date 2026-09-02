import React, { useState, useRef } from "react";
import { ChevronLeft, Users } from "lucide-react";
import { addWheelOption, updateWheelOption, deleteWheelOption, reorderWheelOptions } from "../api/client";
import WheelCanvas, { rotationForIndex, SPIN_MS } from "./WheelCanvas";
import WheelOptionsEditor from "./WheelOptionsEditor";

export default function SpinWheelScreen({ wheelOptions, kids, onBack, refetch }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const timerRef = useRef(null);

  const options = wheelOptions;
  const n = options.length;

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

  const fillWithKids = async () => {
    setBusy(true);
    try {
      for (let i = 0; i < kids.length; i++) await addWheelOption(kids[i].name, n + i + 1);
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

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 18px 0" }}>
        <WheelCanvas options={options} rotation={rotation} spinning={spinning} />

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
          onClick={() => setEditing((v) => !v)}
          style={{ width: "100%", border: "2px dashed #D8C6B0", borderRadius: 14, padding: 12, background: "none", fontWeight: 800, color: "#8A7457" }}
        >
          {editing ? "完成編輯" : `編輯轉盤選項（目前 ${n} 個）`}
        </button>

        {editing && (
          <div style={{ marginTop: 12 }}>
            <WheelOptionsEditor
              options={options}
              onAdd={async ({ label }) => {
                await addWheelOption(label, n + 1);
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
