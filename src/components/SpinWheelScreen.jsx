import React, { useState, useRef } from "react";
import { ChevronLeft, Plus, X, Users } from "lucide-react";
import { addWheelOption, deleteWheelOption } from "../api/client";

const SLICE_COLORS = ["#FFD9C2", "#CFEFE0", "#D9E8FB", "#F6E3B4", "#EAD9F2", "#FFE0E0", "#DDEFD5", "#FBE0D0"];
const SPIN_MS = 4200;
const SIZE = 300;
const R = 140;

// 極座標轉直角座標，0 度在正上方、順時針increasing
const pointAt = (angleDeg, radius) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [SIZE / 2 + radius * Math.cos(rad), SIZE / 2 + radius * Math.sin(rad)];
};

export default function SpinWheelScreen({ wheelOptions, kids, onBack, refetch }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const timerRef = useRef(null);

  const options = wheelOptions;
  const n = options.length;
  const slice = n > 0 ? 360 / n : 360;

  const spin = () => {
    if (spinning || n < 2) return;
    setResult(null);
    setSpinning(true);

    // 先隨機決定要中哪一格，再算出要轉到哪個角度，
    // 這樣畫面停下來的位置一定跟結果一致
    const index = Math.floor(Math.random() * n);
    const centerAngle = index * slice + slice / 2;
    const jitter = (Math.random() - 0.5) * slice * 0.7; // 不要每次都停在正中央
    const turns = 5 + Math.floor(Math.random() * 3);

    // 轉盤順時針轉 R 度之後，指針（正上方）指到的是盤面上 -R 度的位置
    const targetMod = (((-(centerAngle + jitter)) % 360) + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    const delta = (((targetMod - currentMod) % 360) + 360) % 360;

    setRotation(rotation + turns * 360 + delta);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSpinning(false);
      setResult(options[index].label);
    }, SPIN_MS);
  };

  const add = async (label) => {
    const text = (label ?? newLabel).trim();
    if (!text) return;
    setBusy(true);
    try {
      await addWheelOption(text, n + 1);
      setNewLabel("");
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      await deleteWheelOption(id);
      await refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
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
        <div style={{ position: "relative", width: SIZE, maxWidth: "100%" }}>
          {/* 指針 */}
          <div
            style={{
              position: "absolute",
              top: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "13px solid transparent",
              borderRight: "13px solid transparent",
              borderTop: "22px solid #E86A3A",
              zIndex: 2,
              filter: "drop-shadow(0 2px 3px rgba(90,70,50,.3))",
            }}
          />

          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width="100%"
            style={{
              display: "block",
              // 轉盤是方形畫布，轉起來時看不見的四個角會掃到下面的
              // 「轉！」按鈕把點擊吃掉，所以整個 SVG 不收點擊事件
              pointerEvents: "none",
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.17,.67,.16,1)` : "none",
            }}
          >
            <circle cx={SIZE / 2} cy={SIZE / 2} r={R + 6} fill="#fff" stroke="#EEE4D8" strokeWidth="3" />
            {n === 0 && (
              <text x={SIZE / 2} y={SIZE / 2} textAnchor="middle" fontSize="15" fill="#B4A392" fontWeight="700">
                還沒有選項
              </text>
            )}
            {options.map((opt, i) => {
              const start = i * slice;
              const end = start + slice;
              const [x1, y1] = pointAt(start, R);
              const [x2, y2] = pointAt(end, R);
              const largeArc = slice > 180 ? 1 : 0;
              const mid = start + slice / 2;
              const [tx, ty] = pointAt(mid, R * 0.62);
              const color = SLICE_COLORS[i % SLICE_COLORS.length];
              // 只有一個選項時畫整個圓，不然 path 會變成一條線
              return (
                <g key={opt.id}>
                  {n === 1 ? (
                    <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill={color} />
                  ) : (
                    <path
                      d={`M ${SIZE / 2} ${SIZE / 2} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={color}
                      stroke="#fff"
                      strokeWidth="2"
                    />
                  )}
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={n > 8 ? 11 : 13.5}
                    fontWeight="800"
                    fill="#5A4632"
                    transform={`rotate(${mid} ${tx} ${ty})`}
                  >
                    {opt.label.length > 8 ? opt.label.slice(0, 8) + "…" : opt.label}
                  </text>
                </g>
              );
            })}
            <circle cx={SIZE / 2} cy={SIZE / 2} r="20" fill="#fff" stroke="#EEE4D8" strokeWidth="3" />
          </svg>
        </div>

        <button
          onClick={spin}
          disabled={spinning || n < 2}
          style={{
            marginTop: 18,
            width: "100%",
            maxWidth: SIZE,
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
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {options.map((opt, i) => (
                <div
                  key={opt.id}
                  style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", padding: "10px 12px", borderRadius: 12 }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      background: SLICE_COLORS[i % SLICE_COLORS.length],
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ flex: 1, fontWeight: 700 }}>{opt.label}</span>
                  <button
                    onClick={() => remove(opt.id)}
                    disabled={busy}
                    style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "#F7F1E9" }}
                  >
                    <X size={14} color="#B4A392" />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder="新增選項（例如：誰先洗澡）"
                style={{ flex: 1, boxSizing: "border-box", border: "2px solid #F1E7DC", borderRadius: 12, padding: "11px 13px", fontSize: 15, outline: "none", background: "#fff" }}
              />
              <button
                onClick={() => add()}
                disabled={busy || !newLabel.trim()}
                style={{ border: "none", borderRadius: 12, padding: "0 16px", background: "#E86A3A", color: "#fff", fontWeight: 800, opacity: busy || !newLabel.trim() ? 0.5 : 1 }}
              >
                <Plus size={18} />
              </button>
            </div>

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
