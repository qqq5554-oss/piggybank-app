import React from "react";

// 金幣堆的座標，由下往上排列（先出現的先填滿），數量固定、
// 用百分比決定要露出前面幾個，讓存款進度看起來像錢幣真的
// 堆在肚子裡，而不是整隻豬變色。
const COINS = [
  // 最底一排
  { x: 55, y: 80 }, { x: 68, y: 80 }, { x: 81, y: 80 }, { x: 94, y: 80 }, { x: 107, y: 80 },
  { x: 48, y: 70 }, { x: 61, y: 70 }, { x: 74, y: 70 }, { x: 87, y: 70 }, { x: 100, y: 70 }, { x: 113, y: 70 },
  { x: 42, y: 60 }, { x: 55, y: 60 }, { x: 68, y: 60 }, { x: 81, y: 60 }, { x: 94, y: 60 }, { x: 107, y: 60 }, { x: 120, y: 60 },
  { x: 45, y: 50 }, { x: 58, y: 50 }, { x: 71, y: 50 }, { x: 84, y: 50 }, { x: 97, y: 50 }, { x: 110, y: 50 },
  // 最上一排
  { x: 50, y: 40 }, { x: 63, y: 40 }, { x: 76, y: 40 }, { x: 89, y: 40 }, { x: 102, y: 40 },
];

function Coin({ x, y, r = 6.5, color, line }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} stroke={line} strokeWidth="1.2" />
      <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontSize={r * 1.15} fontWeight="700" fill={line}>
        $
      </text>
    </g>
  );
}

export default function PiggyIllustration({ fill = 0 }) {
  const pct = Math.max(0, Math.min(100, fill));
  const base = "#F6C9CE";
  const line = "#2B2B2B";
  const dark = "#2B2B2B";
  const coinColor = "#F4C430";
  const coinLine = "#B8860B";
  const visibleCoins = COINS.slice(0, Math.round((pct / 100) * COINS.length));

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <svg width="150" height="112" viewBox="0 0 150 112">
        <defs>
          <clipPath id="piggyClip">
            <ellipse cx="80" cy="58" rx="48" ry="34" />
          </clipPath>
        </defs>

        {/* 頭頂浮動金幣裝飾 */}
        <Coin x={80} y={10} r={8} color={coinColor} line={coinLine} />

        {/* 腳 */}
        <rect x="52" y="88" width="13" height="16" rx="5" fill={base} stroke={line} strokeWidth="2" />
        <rect x="96" y="88" width="13" height="16" rx="5" fill={base} stroke={line} strokeWidth="2" />

        {/* 尾巴 */}
        <path d="M 126 52 q 10 -6 4 6 q -6 8 6 6" fill="none" stroke={line} strokeWidth="2.5" strokeLinecap="round" />

        {/* 耳朵（外層 + 內層摺痕） */}
        <path d="M 46 28 Q 40 10 62 20 Q 60 32 46 28 Z" fill={base} stroke={line} strokeWidth="2" />
        <path d="M 49 27 Q 47 17 58 21" fill="none" stroke={line} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />

        {/* 鼻子（方形鼻頭，先畫讓身體蓋住重疊處） */}
        <rect x="12" y="50" width="24" height="26" rx="9" fill={base} stroke={line} strokeWidth="2" />

        {/* 身體 */}
        <ellipse cx="80" cy="58" rx="48" ry="34" fill={base} stroke={line} strokeWidth="2" />

        {/* 存款金幣，從肚子底部往上堆 */}
        <g clipPath="url(#piggyClip)">
          {visibleCoins.map((c, i) => (
            <Coin key={i} x={c.x} y={c.y + 6} color={coinColor} line={coinLine} />
          ))}
        </g>

        {/* 重新描一次身體外框，蓋過金幣蓋住的邊線 */}
        <ellipse cx="80" cy="58" rx="48" ry="34" fill="none" stroke={line} strokeWidth="2" />
        <rect x="12" y="50" width="24" height="26" rx="9" fill="none" stroke={line} strokeWidth="2" />

        {/* 眼睛 */}
        <circle cx="36" cy="48" r="3.2" fill={dark} />

        {/* 投幣口 */}
        <rect x="70" y="20" width="24" height="6" rx="3" fill={base} stroke={line} strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 800, color: "#B4A392" }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}
