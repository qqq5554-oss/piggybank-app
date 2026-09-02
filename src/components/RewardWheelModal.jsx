import React, { useState, useRef } from "react";
import { spinRewardWheel } from "../api/client";
import WheelCanvas, { rotationForIndex, SPIN_MS } from "./WheelCanvas";

// 今日責任全部完成後的獎勵轉盤。
// 抽獎是後端決定的（重新整理也沒辦法重抽），前端只負責把轉盤
// 轉到那一格，一天一次的限制也在後端擋。
export default function RewardWheelModal({ kid, options, onClose, refetch }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const spin = async () => {
    if (spinning || options.length === 0) return;
    setError("");
    setSpinning(true);
    try {
      const { optionId, label } = await spinRewardWheel(kid.id);
      const index = Math.max(0, options.findIndex((o) => o.id === optionId));
      setRotation((prev) => rotationForIndex(prev, index, options.length));

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setSpinning(false);
        setResult(label);
        await refetch(); // 有加⭐或加錢的格子，這時候才會更新到畫面
      }, SPIN_MS);
    } catch (e) {
      setSpinning(false);
      setError(e.message || "轉盤失敗");
    }
  };

  return (
    <div
      onClick={result || !spinning ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(50,38,28,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
        zIndex: 60,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#FBF6EF", borderRadius: 24, padding: "20px 18px 22px", width: "100%", maxWidth: 360, textAlign: "center" }}
      >
        <div style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18, marginBottom: 2 }}>
          🎡 今天的獎勵轉盤
        </div>
        <div style={{ fontSize: 12.5, color: "#B4A392", marginBottom: 14 }}>
          {kid.name} 今天的責任全部完成了！一天可以轉一次
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <WheelCanvas options={options} rotation={rotation} spinning={spinning} maxWidth={260} />
        </div>

        {result ? (
          <>
            <div
              style={{
                marginTop: 16,
                background: "#fff",
                border: "2px solid #FFD9C2",
                borderRadius: 16,
                padding: "12px 18px",
                animation: "toastIn .25s ease-out",
              }}
            >
              <div style={{ fontSize: 12, color: "#B4A392", fontWeight: 700 }}>恭喜抽到</div>
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 800, color: "#E86A3A" }}>{result}</div>
            </div>
            <button
              onClick={onClose}
              style={{ width: "100%", marginTop: 12, border: "none", borderRadius: 14, padding: 14, background: "#5A4632", color: "#fff", fontWeight: 800, fontSize: 15.5 }}
            >
              好耶，關閉
            </button>
          </>
        ) : (
          <>
            <button
              onClick={spin}
              disabled={spinning || options.length === 0}
              style={{
                width: "100%",
                marginTop: 16,
                border: "none",
                borderRadius: 14,
                padding: 15,
                background: "#E86A3A",
                color: "#fff",
                fontWeight: 800,
                fontSize: 16.5,
                opacity: spinning || options.length === 0 ? 0.45 : 1,
              }}
            >
              {spinning ? "轉動中..." : options.length === 0 ? "還沒有設定獎勵" : "轉！"}
            </button>
            {!spinning && (
              <button
                onClick={onClose}
                style={{ width: "100%", marginTop: 8, border: "none", background: "none", color: "#B4A392", fontWeight: 700, fontSize: 13.5, padding: 6 }}
              >
                等一下再轉
              </button>
            )}
          </>
        )}

        {error && <div style={{ marginTop: 10, color: "#E85D5D", fontWeight: 700, fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );
}
