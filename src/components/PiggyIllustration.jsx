import React from "react";

export default function PiggyIllustration({ fill = 0, color = "#FF8B5E" }) {
  const pct = Math.max(0, Math.min(100, fill));
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <svg width="120" height="90" viewBox="0 0 120 90">
        <defs>
          <clipPath id="piggyClip">
            <ellipse cx="60" cy="50" rx="48" ry="32" />
          </clipPath>
        </defs>
        <ellipse cx="60" cy="50" rx="48" ry="32" fill="#F1E7DC" stroke="#E3D3C2" strokeWidth="2" />
        <g clipPath="url(#piggyClip)">
          <rect x="0" y={82 - pct * 0.62} width="120" height="90" fill={color} opacity="0.85" />
        </g>
        <ellipse cx="60" cy="50" rx="48" ry="32" fill="none" stroke="#E3D3C2" strokeWidth="2" />
        <circle cx="98" cy="42" r="9" fill="#F1E7DC" stroke="#E3D3C2" strokeWidth="2" />
        <circle cx="15" cy="55" r="6" fill="#F1E7DC" stroke="#E3D3C2" strokeWidth="2" />
        <rect x="28" y="76" width="8" height="10" rx="3" fill="#F1E7DC" stroke="#E3D3C2" strokeWidth="2" />
        <rect x="80" y="76" width="8" height="10" rx="3" fill="#F1E7DC" stroke="#E3D3C2" strokeWidth="2" />
        <rect x="52" y="18" width="16" height="5" rx="2.5" fill="#E3D3C2" />
      </svg>
      <div style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 12, fontWeight: 800, color: "#B4A392" }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}
