import React from "react";

export const SLICE_COLORS = ["#FFD9C2", "#CFEFE0", "#D9E8FB", "#F6E3B4", "#EAD9F2", "#FFE0E0", "#DDEFD5", "#FBE0D0"];
export const SPIN_MS = 6800; // 轉久一點，期待感拉長
const SIZE = 300;
const R = 140;

// 文字可以用的半徑區間：內側離輪心遠一點，字才不會全部擠成放射狀星芒
const R_TEXT_IN = R * 0.34;
const R_TEXT_OUT = R * 0.93;
const TEXT_LEN = R_TEXT_OUT - R_TEXT_IN; // 一行字最多能有多長
const FONT_MAX = 13;
const FONT_MIN = 8;
const LINE_H = 1.15;
// 跟 global.css 的內文字體一致，量出來的寬度才等於畫出來的寬度
const FONT_STACK = '"Nunito", system-ui, -apple-system, "PingFang TC", "Noto Sans TC", sans-serif';

// 用 canvas 實際量字寬（中英標點混在一起時，用字數估會差很多）。
// 量一次 100px 換算成「幾個 em」，之後乘字級就好，結果存起來重複用。
const emCache = new Map();
let ctx2d = null;
const charW = (ch) => (/[\x00-\xff]/.test(ch) ? 0.55 : 1); // 量不到時的備案
const emWidth = (str) => {
  if (emCache.has(str)) return emCache.get(str);
  let em;
  try {
    if (!ctx2d) ctx2d = document.createElement("canvas").getContext("2d");
    ctx2d.font = `800 100px ${FONT_STACK}`;
    em = ctx2d.measureText(str).width / 100;
  } catch {
    em = [...str].reduce((w, ch) => w + charW(ch), 0);
  }
  if (!em) em = [...str].reduce((w, ch) => w + charW(ch), 0);
  emCache.set(str, em);
  return em;
};

// 太長的字拆成兩行：在「可以斷的地方」裡挑最接近正中間的那一個。
// 不可以斷的地方＝英數字中間（會把 Daddy 切成 Dadd / y）、
// 收尾標點前面（）」，。等不能跑到下一行開頭）、開頭標點後面。
const CLOSING = "）〉》」』】、，。．：；！？…～)]}!?,.:;";
const OPENING = "（〈《「『【([{";
const splitLabel = (label) => {
  const chars = [...label];
  if (chars.length < 2) return [label];
  const isWordChar = (ch) => ch && /[A-Za-z0-9]/.test(ch);
  const half = emWidth(label) / 2;

  let acc = 0;
  let best = null;
  for (let i = 1; i < chars.length; i++) {
    acc += emWidth(chars[i - 1]);
    const prev = chars[i - 1];
    const next = chars[i];
    if (isWordChar(prev) && isWordChar(next)) continue;
    if (CLOSING.includes(next) || OPENING.includes(prev)) continue;
    const dist = Math.abs(acc - half);
    // 一樣近的話取後面那個，第一行長一點比較好讀
    if (!best || dist <= best.dist) best = { cut: i, dist };
  }
  if (!best) return [label];
  return [chars.slice(0, best.cut).join("").trim(), chars.slice(best.cut).join("").trim()].filter(Boolean);
};

const clip = (line, fontSize, maxLen) => {
  // 留 0.5 的容差，剛好卡在邊界時不要為了半個 pixel 就砍字加「…」
  if (emWidth(line) * fontSize <= maxLen + 0.5) return line;
  const chars = [...line];
  while (chars.length > 1 && emWidth(chars.join("") + "…") * fontSize > maxLen) chars.pop();
  return chars.join("") + "…";
};

// 一行（或兩行）字要多寬的扇形才放得下：字級乘行數，上下再留一半的空白
const arcNeeded = (fontSize, lineCount) =>
  lineCount === 1 ? fontSize / 0.62 : (fontSize * lineCount * LINE_H) / 0.66;

// 算某個行數下能用多大的字。
// 扇形愈往外愈寬，所以窄格（機率低的稀有格）的字會自動往外挪，
// 不會從輪心就開始畫、壓到隔壁格。
const fitLines = (lines, sweepRad) => {
  const widest = Math.max(...lines.map(emWidth));
  const k = arcNeeded(1, lines.length) / sweepRad; // 放得下這個字級的最小內半徑 = k × 字級
  const fontSize = Math.min(FONT_MAX, TEXT_LEN / widest, R_TEXT_OUT / (widest + k));
  // 字都靠外緣排，輪心附近留白，整體不會擠成一團
  const rIn = Math.max(R_TEXT_IN, k * fontSize, R_TEXT_OUT - widest * fontSize);
  return { fontSize, rIn, maxLen: R_TEXT_OUT - rIn };
};

// 決定字級與行數：長字先試著折成兩行（比整行一直縮小好讀多了）
const layoutLabel = (label, sweep) => {
  const sweepRad = (Math.min(sweep, 360) * Math.PI) / 180;
  let best = { lines: [label], ...fitLines([label], sweepRad) };

  if (best.fontSize < FONT_MAX * 0.95) {
    const two = splitLabel(label);
    if (two.length === 2) {
      const fit = fitLines(two, sweepRad);
      if (fit.fontSize > best.fontSize) best = { lines: two, ...fit };
    }
  }

  const fontSize = Math.max(FONT_MIN, best.fontSize);
  return {
    lines: best.lines.map((l) => clip(l, fontSize, best.maxLen)),
    fontSize,
    rMid: (best.rIn + R_TEXT_OUT) / 2,
  };
};

// emoji 的大小與位置：放在扇形中段偏外，最大 42、窄格會自動縮小；
// 縮到比 EMOJI_MIN 還小的話就往外挪到放得下的半徑，不要壓到隔壁格
const EMOJI_MAX = 42;
const EMOJI_MIN = 20;
const emojiLayout = (emoji, sweep) => {
  const sweepRad = (Math.min(sweep, 360) * Math.PI) / 180;
  const wide = [...emoji].length > 1 ? 2.1 : 1.15; // 兩個 emoji 並排會比較寬
  let rMid = R * 0.62;
  let fontSize = Math.min(EMOJI_MAX, (sweepRad * rMid) / wide);
  if (fontSize < EMOJI_MIN) {
    fontSize = Math.min(EMOJI_MAX, (sweepRad * R * 0.86) / wide);
    rMid = R * 0.86 - fontSize * 0.1;
  }
  return { fontSize: Math.max(9, fontSize), rMid };
};

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
          const color = SLICE_COLORS[i % SLICE_COLORS.length];
          const emoji = (opt.emoji || "").trim();
          const layout = emoji ? null : layoutLabel(opt.label, sweep);
          // 有設 emoji 就放一個大圖示（格子窄的話跟著縮小、往外挪），
          // 沒設的才退回畫文字
          const emojiSize = emoji ? emojiLayout(emoji, sweep) : null;
          const [tx, ty] = pointAt(mid, emoji ? emojiSize.rMid : layout.rMid);
          // 左半邊的字如果照半徑方向排會變成上下顛倒，多轉 180 度翻正
          const flip = mid > 90 && mid < 270;
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
              {/* emoji 是圖不是字，跟著扇形轉會變成躺著；
                  反向轉回來，盤子停下來時每個圖都是正的 */}
              {emoji ? (
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={emojiSize.fontSize}
                  transform={`rotate(${-rotation} ${tx} ${ty})`}
                >
                  {emoji}
                </text>
              ) : (
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily={FONT_STACK}
                  fontSize={layout.fontSize}
                  fontWeight="800"
                  fill="#5A4632"
                  transform={`rotate(${flip ? mid + 180 : mid} ${tx} ${ty})`}
                >
                  {layout.lines.map((line, li) => (
                    <tspan key={li} x={tx} dy={li === 0 ? -((layout.lines.length - 1) * layout.fontSize * LINE_H) / 2 : layout.fontSize * LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}
        <circle cx={SIZE / 2} cy={SIZE / 2} r="20" fill="#fff" stroke="#EEE4D8" strokeWidth="3" />
      </svg>
    </div>
  );
}
