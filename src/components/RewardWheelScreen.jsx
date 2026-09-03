import React, { useState, useRef } from "react";
import { ChevronLeft } from "lucide-react";
import { spinRewardWheel } from "../api/client";
import WheelCanvas, { rotationForIndex, SPIN_MS } from "./WheelCanvas";
import { themeOf } from "../utils/format";

// 每日獎勵轉盤（獨立頁）。
// 抽獎是後端決定的（重新整理也沒辦法重抽），前端只負責把轉盤轉到
// 那一格；「今天責任要全做完」跟「一天一次」的限制也都在後端擋。
export default function RewardWheelScreen({ kid, options, doneCount, totalCount, todaySpin, onBack, refetch }) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [resultEmoji, setResultEmoji] = useState("");
  const [isCoupon, setIsCoupon] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const theme = themeOf(kid.theme_id);

  const allDone = totalCount > 0 && doneCount === totalCount;
  const alreadySpun = !!todaySpin;
  const canSpin = allDone && !alreadySpun && options.length > 0;

  const spin = async () => {
    if (spinning || !canSpin) return;
    setError("");
    setSpinning(true);
    try {
      const { optionId, label, emoji, coupon } = await spinRewardWheel(kid.id);
      const index = Math.max(0, options.findIndex((o) => o.id === optionId));
      setRotation((prev) => rotationForIndex(prev, index, options));

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        setSpinning(false);
        setResult(label);
        setResultEmoji(emoji || "");
        setIsCoupon(!!coupon);
        await refetch(); // 有加⭐或加錢的格子，這時候才會更新到畫面
      }, SPIN_MS);
    } catch (e) {
      setSpinning(false);
      setError(e.message || "轉盤失敗");
    }
  };

  const statusText = () => {
    if (result) return "";
    if (totalCount === 0) return "還沒有設定今日責任項目";
    if (alreadySpun) return `今天已經轉過了：${todaySpin.label}`;
    if (!allDone) return `今天的責任完成 ${doneCount}/${totalCount}，全部做完才能轉`;
    if (options.length === 0) return "還沒有設定轉盤獎勵，可以到「管理」→「獎勵轉盤」新增";
    return "今天的責任全部完成了！一天可以轉一次";
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FBF6EF" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px 8px" }}>
        <button onClick={onBack} style={{ background: "#F1E7DC", border: "none", borderRadius: 10, width: 34, height: 34 }}>
          <ChevronLeft size={22} color="#5A4632" />
        </button>
        <span style={{ fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 17 }}>
          {kid.avatar} 獎勵轉盤
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "6px 18px 40px" }}>
        <div style={{ fontSize: 13, color: "#8A7457", fontWeight: 700, textAlign: "center", marginBottom: 14, minHeight: 20 }}>
          {statusText()}
        </div>

        <div style={{ opacity: canSpin || result || alreadySpun ? 1 : 0.45, transition: "opacity .2s" }}>
          <WheelCanvas options={options} rotation={rotation} spinning={spinning} />
        </div>

        {result ? (
          <>
            <div
              style={{
                marginTop: 18,
                background: "#fff",
                border: "2px solid #FFD9C2",
                borderRadius: 16,
                padding: "14px 20px",
                textAlign: "center",
                width: "100%",
                maxWidth: 300,
                boxSizing: "border-box",
                animation: "toastIn .25s ease-out",
              }}
            >
              <div style={{ fontSize: 12, color: "#B4A392", fontWeight: 700 }}>恭喜抽到</div>
              {resultEmoji && <div style={{ fontSize: 44, lineHeight: 1.2 }}>{resultEmoji}</div>}
              <div style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 26, fontWeight: 800, color: "#E86A3A" }}>{result}</div>
              <div style={{ fontSize: 12, color: "#8A7457", marginTop: 6, lineHeight: 1.6 }}>
                {isCoupon ? "🎟️ 已經存成一張兌換券，什麼時候想用再拿出來" : "已經直接入帳囉"}
              </div>
            </div>
            <button
              onClick={onBack}
              style={{ width: "100%", maxWidth: 300, marginTop: 14, border: "none", borderRadius: 16, padding: 15, background: "#5A4632", color: "#fff", fontWeight: 800, fontSize: 16 }}
            >
              好耶，回首頁
            </button>
          </>
        ) : (
          <button
            onClick={spin}
            disabled={!canSpin || spinning}
            style={{
              width: "100%",
              maxWidth: 300,
              marginTop: 18,
              border: "none",
              borderRadius: 16,
              padding: 16,
              background: canSpin ? theme.accentDark : "#C4B4A0",
              color: "#fff",
              fontWeight: 800,
              fontSize: 17,
              opacity: spinning ? 0.6 : 1,
            }}
          >
            {spinning ? "轉動中..." : alreadySpun ? "明天再來轉" : canSpin ? "轉！" : "還不能轉"}
          </button>
        )}

        {error && <div style={{ marginTop: 12, color: "#E85D5D", fontWeight: 700, fontSize: 13 }}>{error}</div>}
      </div>
    </div>
  );
}
