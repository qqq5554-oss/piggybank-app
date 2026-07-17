import React from "react";

export default function PiggyIllustration({ fill = 0, color = "#FF8B5E" }) {
  const pct = Math.max(0, Math.min(100, fill));
  const base = "#F1E7DC";
  const line = "#D8C2A8";
  const dark = "#5A4632";

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <svg width="120" height="104" viewBox="0 0 120 104">
        <defs>
          <clipPath id="piggyClip">
            <ellipse cx="60" cy="54" rx="42" ry="30" />
          </clipPath>
        </defs>

        {/* 腳 */}
        <rect x="36" y="78" width="11" height="16" rx="5" fill={base} stroke={line} strokeWidth="2" />
        <rect x="73" y="78" width="11" height="16" rx="5" fill={base} stroke={line} strokeWidth="2" />

        {/* 尾巴 */}
        <path d="M 100 50 q 11 -6 5 6 q -6 9 6 7" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />

        {/* 耳朵 */}
        <ellipse cx="34" cy="27" rx="10" ry="9" fill={base} stroke={line} strokeWidth="2" />
        <ellipse cx="86" cy="27" rx="10" ry="9" fill={base} stroke={line} strokeWidth="2" />

        {/* 身體（先畫底色，蓋掉腳跟耳朵重疊的部分） */}
        <ellipse cx="60" cy="54" rx="42" ry="30" fill={base} stroke={line} strokeWidth="2" />

        {/* 存款填色，依百分比從身體底部往上升 */}
        <g clipPath="url(#piggyClip)">
          <rect x="0" y={84 - pct * 0.6} width="120" height="104" fill={color} opacity="0.85" />
        </g>

        {/* 重新描一次身體外框，蓋過填色蓋住的邊線 */}
        <ellipse cx="60" cy="54" rx="42" ry="30" fill="none" stroke={line} strokeWidth="2" />

        {/* 鼻子 */}
        <ellipse cx="60" cy="70" rx="17" ry="11" fill={base} stroke={line} strokeWidth="2" />
        <ellipse cx="53" cy="70" rx="2.3" ry="3.2" fill={line} />
        <ellipse cx="67" cy="70" rx="2.3" ry="3.2" fill={line} />

        {/* 眼睛 */}
        <circle cx="40" cy="46" r="3.3" fill={dark} />
        <circle cx="80" cy="46" r="3.3" fill={dark} />

        {/* 投幣口 */}
        <rect x="48" y="22" width="24" height="7" rx="3.5" fill={base} stroke={line} strokeWidth="2" />
      </svg>
      <div style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 800, color: "#B4A392" }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}
