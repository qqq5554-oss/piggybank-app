import React from "react";

// 簡單的圓形存款進度指示：顏色依百分比從底部往上填滿，
// 百分比數字直接寫在圓圈正中間。
export default function SavingsMeter({ fill = 0, color = "#FF8B5E" }) {
  const pct = Math.max(0, Math.min(100, fill));
  const fillY = 96 - pct * 0.92;

  return (
    <svg width="110" height="110" viewBox="0 0 100 100">
      <defs>
        <clipPath id="meterClip">
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="46" fill="#F1E7DC" stroke="#E3D3C2" strokeWidth="3" />

      <g clipPath="url(#meterClip)">
        <rect x="0" y={fillY} width="100" height="100" fill={color} />
      </g>

      <circle cx="50" cy="50" r="46" fill="none" stroke="#E3D3C2" strokeWidth="3" />

      <text
        x="50"
        y="52"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="26"
        fontWeight="800"
        fill="#fff"
        stroke="#5A4632"
        strokeWidth="4"
        paintOrder="stroke"
      >
        {Math.round(pct)}%
      </text>
    </svg>
  );
}
