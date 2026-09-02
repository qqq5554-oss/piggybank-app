import React from "react";

export const SLICE_COLORS = ["#FFD9C2", "#CFEFE0", "#D9E8FB", "#F6E3B4", "#EAD9F2", "#FFE0E0", "#DDEFD5", "#FBE0D0"];
export const SPIN_MS = 6800; // 轉久一點，期待感拉長
const SIZE = 300;
const R = 140;

// 極座標轉直角座標，0 度在正上方、順時針遞增
const pointAt = (angleDeg, radius) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [SIZE / 2 + radius * Math.cos(rad), SIZE / 2 + radius * Math.sin(rad)];
};

// 每一格的角度：weight 就是「這格佔幾份」，沒設就是 1 份。
// 機率高的格子畫得寬、稀有的畫得窄，轉盤看起來才誠實。
export function sliceAngles(options) {
  const weights = options.map((o) => Math.max(0.01, Number(o.weight ?? 1)));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return options.map((_, i) => {
    const sweep = (weights[i] / totalWeight) * 360;
    const start = acc;
    acc += sweep;
    return { start, sweep, mid: start + sweep / 2, pct: weights[i] / totalWeight };
  });
}

// 給定要中的格子，算出轉盤要轉到的新角度（含多轉幾圈與格內隨機偏移），
// 這樣畫面停下來的位置一定跟結果一致
export function rotationForIndex(currentRotation, index, options) {
  const slices = sliceAngles(options);
  const slice = slices[index] || { mid: 0, sweep: 360 };
  const jitter = (Math.random() - 0.5) * slice.sweep * 0.7;
  const turns = 7 + Math.floor(Math.random() * 4);

  // 轉盤順時針轉 R 度之後，指針（正上方）指到的是盤面上 -R 度的位置
  const targetMod = ((-(slice.mid + jitter) % 360) + 360) % 360;
  const currentMod = ((currentRotation % 360) + 360) % 360;
  const delta = (((targetMod - currentMod) % 360) + 360) % 360;
  return currentRotation + turns * 360 + delta;
}

// 純畫面：轉盤本體加上方的指針
export default function WheelCanvas({ options, rotation, spinning, maxWidth = SIZE }) {
  const n = options.length;
  const slices = sliceAngles(options);

  return (
    <div style={{ position: "relative", width: maxWidth, maxWidth: "100%" }}>
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
          // 轉盤是方形畫布，轉起來時看不見的四個角會掃到下面的按鈕
          // 把點擊吃掉，所以整個 SVG 不收點擊事件
          pointerEvents: "none",
          transform: `rotate(${rotation}deg)`,
          // 前段轉很快、後段拖很長慢慢停，最後那幾格特別磨人
          transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(.08,.72,.04,1)` : "none",
        }}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R + 6} fill="#fff" stroke="#EEE4D8" strokeWidth="3" />
        {n === 0 && (
          <text x={SIZE / 2} y={SIZE / 2} textAnchor="middle" fontSize="15" fill="#B4A392" fontWeight="700">
            還沒有選項
          </text>
        )}
        {options.map((opt, i) => {
          const { start, sweep, mid } = slices[i];
          const [x1, y1] = pointAt(start, R);
          const [x2, y2] = pointAt(start + sweep, R);
          const largeArc = sweep > 180 ? 1 : 0;
          const [tx, ty] = pointAt(mid, R * 0.62);
          const color = SLICE_COLORS[i % SLICE_COLORS.length];
          // 很窄的格子塞不下長字，字級縮小、字數也砍短
          const narrow = sweep < 26;
          const maxChars = narrow ? 4 : sweep < 40 ? 6 : 9;
          return (
            <g key={opt.id}>
              {/* 只有一個選項時畫整個圓，不然扇形會退化成一條線 */}
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
                fontSize={narrow ? 9.5 : n > 8 ? 10.5 : 13}
                fontWeight="800"
                fill="#5A4632"
                transform={`rotate(${mid} ${tx} ${ty})`}
              >
                {opt.label.length > maxChars ? opt.label.slice(0, maxChars) + "…" : opt.label}
              </text>
            </g>
          );
        })}
        <circle cx={SIZE / 2} cy={SIZE / 2} r="20" fill="#fff" stroke="#EEE4D8" strokeWidth="3" />
      </svg>
    </div>
  );
}
