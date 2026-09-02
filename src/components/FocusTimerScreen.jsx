import React, { useState, useRef } from "react";
import { ChevronLeft, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R_FACE = 132; // 錶面外緣
const R_SECTOR = 118; // 色塊半徑
const FULL_MIN = 60; // 一圈 60 分鐘
const PRESETS = [5, 10, 15, 25, 30];

const polar = (angleDeg, radius) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(rad), CY + radius * Math.sin(rad)];
};

// 從 12 點鐘方向順時針畫一塊扇形（代表還剩多少時間）
const sectorPath = (sweepDeg) => {
  if (sweepDeg <= 0) return "";
  if (sweepDeg >= 359.99) {
    // 整圈的話用兩段半圓，避免起點終點重合畫不出來
    return `M ${CX} ${CY - R_SECTOR} A ${R_SECTOR} ${R_SECTOR} 0 1 1 ${CX - 0.01} ${CY - R_SECTOR} Z`;
  }
  const [x, y] = polar(sweepDeg, R_SECTOR);
  const largeArc = sweepDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${CX} ${CY - R_SECTOR} A ${R_SECTOR} ${R_SECTOR} 0 ${largeArc} 1 ${x} ${y} Z`;
};

const mmss = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

// 視覺化的專注計時器（Time Timer 風格）：
// 剩餘時間用色塊表示，時間過去色塊會跟著縮小，小孩不用看懂數字
// 也能知道「還剩多久」。刻度一圈 60 分鐘，每 5 分鐘一個數字。
// 計時狀態放在 App 層（useFocusTimer），所以離開這一頁、回首頁、
// 甚至關掉 App 再打開，時間都還在繼續跑。
export default function FocusTimerScreen({ timer, onBack }) {
  const { totalMs, remainingMs, running, finished, soundOn, start, pause, reset, setMinutes, toggleSound } = timer;
  const [dragging, setDragging] = useState(false);

  const svgRef = useRef(null);

  // 直接在錶面上拖曳設定時間（跟實體 Time Timer 一樣的操作）
  const angleFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    const x = point.clientX - (rect.left + rect.width / 2);
    const y = point.clientY - (rect.top + rect.height / 2);
    const deg = (Math.atan2(x, -y) * 180) / Math.PI;
    return (deg + 360) % 360;
  };

  const handleDial = (e) => {
    if (running) return;
    const minutes = Math.round(angleFromEvent(e) / 6); // 6 度 = 1 分鐘
    setMinutes(minutes === 0 ? FULL_MIN : minutes);
  };

  const remainingMinutes = remainingMs / 60000;
  const sweep = (remainingMinutes / FULL_MIN) * 360;

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EF" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 14px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
            <ChevronLeft size={22} color="#5A4632" />
          </button>
          <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>⏱️ 專注鐘</span>
        </div>
        <button
          onClick={toggleSound}
          aria-label={soundOn ? "關閉提示音" : "開啟提示音"}
          style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: "#F1E7DC", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {soundOn ? <Volume2 size={17} color="#94795F" /> : <VolumeX size={17} color="#C4B4A0" />}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 18px 0" }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          style={{ display: "block", maxWidth: SIZE, touchAction: "none" }}
          onTouchStart={(e) => {
            setDragging(true);
            handleDial(e);
          }}
          onTouchMove={(e) => dragging && handleDial(e)}
          onTouchEnd={() => setDragging(false)}
          onMouseDown={(e) => {
            setDragging(true);
            handleDial(e);
          }}
          onMouseMove={(e) => dragging && handleDial(e)}
          onMouseUp={() => setDragging(false)}
          onMouseLeave={() => setDragging(false)}
        >
          <circle cx={CX} cy={CY} r={R_FACE + 8} fill="#fff" stroke="#EEE4D8" strokeWidth="3" />

          {/* 剩餘時間的色塊 */}
          <path d={sectorPath(sweep)} fill={finished ? "#F1E7DC" : "#3DB88A"} opacity={running ? 1 : 0.85} />

          {/* 刻度：每分鐘一格，每 5 分鐘一個長刻度加數字 */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = i * 6;
            const isMajor = i % 5 === 0;
            const [x1, y1] = polar(angle, R_FACE - (isMajor ? 13 : 6));
            const [x2, y2] = polar(angle, R_FACE);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isMajor ? "#8A7457" : "#D8C6B0"}
                strokeWidth={isMajor ? 2.5 : 1.2}
                strokeLinecap="round"
              />
            );
          })}
          {Array.from({ length: 12 }).map((_, i) => {
            const minute = i * 5;
            const [x, y] = polar(minute * 6, R_FACE - 30);
            return (
              <text
                key={minute}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="16"
                fontWeight="800"
                fill="#5A4632"
              >
                {minute}
              </text>
            );
          })}

          <circle cx={CX} cy={CY} r="17" fill="#fff" stroke="#EEE4D8" strokeWidth="3" />
        </svg>

        <div style={{ textAlign: "center", marginTop: 10 }}>
          <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 40, fontWeight: 800, color: finished ? "#E86A3A" : "#5A4632", lineHeight: 1.1 }}>
            {finished ? "時間到！" : mmss(remainingMs)}
          </div>
          <div style={{ fontSize: 12.5, color: "#B4A392", marginTop: 4 }}>
            {running ? "專注中，色塊會慢慢變少" : finished ? "辛苦了，休息一下吧" : "轉動錶面或按下面的按鈕設定時間"}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginTop: 14 }}>
          {PRESETS.map((m) => {
            const active = !running && Math.round(totalMs / 60000) === m;
            return (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                style={{
                  border: `2px solid ${active ? "#3DB88A" : "#F1E7DC"}`,
                  borderRadius: 20,
                  padding: "8px 15px",
                  background: active ? "#EAF8F2" : "#fff",
                  color: active ? "#2A9670" : "#8A7457",
                  fontWeight: 800,
                  fontSize: 13.5,
                }}
              >
                {m} 分
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: SIZE, marginTop: 16 }}>
          <button
            onClick={running ? pause : start}
            disabled={remainingMs <= 0 && !running}
            style={{
              flex: 1,
              border: "none",
              borderRadius: 16,
              padding: 16,
              background: running ? "#94795F" : "#3DB88A",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              opacity: remainingMs <= 0 && !running ? 0.45 : 1,
            }}
          >
            {running ? <Pause size={19} /> : <Play size={19} />}
            {running ? "暫停" : finished ? "再一次" : "開始"}
          </button>
          <button
            onClick={reset}
            style={{
              border: "2px solid #E3D3C2",
              borderRadius: 16,
              padding: "0 20px",
              background: "#fff",
              color: "#8A7457",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <RotateCcw size={17} /> 重設
          </button>
        </div>

        <div style={{ fontSize: 11.5, color: "#C4B4A0", marginTop: 14, textAlign: "center", lineHeight: 1.8, paddingBottom: 30 }}>
          一圈 60 分鐘，每 5 分鐘一個刻度。計時中會盡量讓螢幕不要自動關掉。
        </div>
      </div>
    </div>
  );
}
