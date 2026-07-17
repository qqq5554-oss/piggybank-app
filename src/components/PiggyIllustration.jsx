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

export default function PiggyIllustration({ fill = 0 }) {
  const pct = Math.max(0, Math.min(100, fill));
  const base = "#F6C9CE";
  const line = "#2B2B2B";
  const dark = "#2B2B2B";
  const coinColor = "#F4C430";
  const coinLine = "#C9971A";
  const visibleCoins = COINS.slice(0, Math.round((pct / 100) * COINS.length));

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <svg width="150" height="104" viewBox="0 0 150 104">
        <defs>
          <clipPath id="piggyClip">
            <ellipse cx="80" cy="52" rx="48" ry="34" />
          </clipPath>
        </defs>

        {/* 腳 */}
        <rect x="52" y="82" width="13" height="16" rx="5" fill={base} stroke={line} strokeWidth="2" />
        <rect x="96" y="82" width="13" height="16" rx="5" fill={base} stroke={line} strokeWidth="2" />

        {/* 尾巴 */}
        <path d="M 126 46 q 10 -6 4 6 q -6 8 6 6" fill="none" stroke={line} strokeWidth="2.5" strokeLinecap="round" />

        {/* 耳朵 */}
        <path d="M 46 22 Q 40 4 62 14 Q 60 26 46 22 Z" fill={base} stroke={line} strokeWidth="2" />

        {/* 鼻子（先畫，讓身體蓋住重疊處） */}
        <ellipse cx="24" cy="56" rx="13" ry="10" fill={base} stroke={line} strokeWidth="2" />

        {/* 身體 */}
        <ellipse cx="80" cy="52" rx="48" ry="34" fill={base} stroke={line} strokeWidth="2" />

        {/* 存款金幣，從肚子底部往上堆 */}
        <g clipPath="url(#piggyClip)">
          {visibleCoins.map((c, i) => (
            <g key={i}>
              <circle cx={c.x} cy={c.y} r="6.5" fill={coinColor} stroke={coinLine} strokeWidth="1.2" />
              <path d={`M ${c.x - 3.5} ${c.y + 1.5} Q ${c.x} ${c.y + 4} ${c.x + 3.5} ${c.y + 1.5}`} stroke={coinLine} strokeWidth="1" fill="none" opacity="0.6" />
            </g>
          ))}
        </g>

        {/* 重新描一次身體外框，蓋過金幣蓋住的邊線 */}
        <ellipse cx="80" cy="52" rx="48" ry="34" fill="none" stroke={line} strokeWidth="2" />
        <ellipse cx="24" cy="56" rx="13" ry="10" fill="none" stroke={line} strokeWidth="2" />

        {/* 鼻孔 */}
        <circle cx="15" cy="53" r="1.6" fill={dark} />
        <circle cx="15" cy="59" r="1.6" fill={dark} />

        {/* 眼睛 */}
        <circle cx="34" cy="44" r="3.2" fill={dark} />

        {/* 投幣口 */}
        <rect x="70" y="14" width="24" height="6" rx="3" fill={base} stroke={line} strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 800, color: "#B4A392" }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}
