import React from "react";
import { HUD_HEART } from "./sprites";

// 飽足度的像素愛心（實心＝有、空心＝沒有）
export default function PixelHeart({ full, size = 20, color = "#fff" }) {
  const sprite = full ? HUD_HEART.full : HUD_HEART.empty;
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" shapeRendering="crispEdges" style={{ display: "block" }}>
      {sprite.pts.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}
