import React, { useEffect, useId, useReducer, useRef } from "react";
import { EYES, MOUTHS, TEAR, FOODS, FX, SPECIES, MYSTERY_EGG, CRACKS } from "./sprites";
import { moodOf } from "../../../lib/petRules.js";

// 經典電子雞的單色液晶：淡綠底、深綠點，還有沒亮的格子淡淡的殘影
export const LCD_BG = "#C7D1A6";
const LCD_GHOST = "#BCC69A";
const INK = "#2F3A24";

const TICK_MS = 420; // 一格一格跳的速度，刻意不做流暢動畫，才有液晶的感覺
const isNight = () => {
  const h = new Date().getHours();
  return h >= 21 || h < 7;
};
const chance = (p) => Math.random() < p;

// 一個會動的液晶螢幕。
// fullness 決定心情（開心／普通／餓／餓扁），晚上 9 點到早上 7 點會睡覺。
// event 換一個新的 id 就播一次動作：{ id, type: "eat" | "pet" | "warm" | "hatch", food, gift }
// 動作播完會呼叫 onEventDone(event)（吃完有 gift 的話連送禮動作一起播完才呼叫）。
// species：hedgehog / rabbit / dango；stage：choose（神秘蛋）/ egg（選好的蛋）/ hatched
// crack：蛋殼裂到第幾階段（0～3）
// compact：首頁卡片上的小螢幕，高度只夠放寵物本身，不畫頭上的特效。
export default function PetLCD({
  cols = 32,
  rows = 22,
  fullness = 60,
  species = "dango",
  stage = "hatched",
  crack = 0,
  event = null,
  onEventDone,
  compact = false,
  style,
}) {
  const patternId = useId().replace(/:/g, "");
  const [, redraw] = useReducer((n) => n + 1, 0);
  const s = useRef(null);
  if (!s.current) {
    s.current = {
      x: Math.floor((cols - 16) / 2),
      dir: chance(0.5) ? 1 : -1,
      tick: 0,
      hop: false,
      blink: false,
      anim: null, // 正在播的動作
      fx: [], // 頭上冒出來的愛心、Z、想法泡泡…
      awakeUntil: 0,
      tear: false,
      lastEventId: null,
      wobble: 0, // 蛋左右晃
    };
  }
  const propsRef = useRef({});
  propsRef.current = { fullness, onEventDone, cols, rows, compact, stage };

  // 新的動作進來
  useEffect(() => {
    const st = s.current;
    if (!event || event.id === st.lastEventId) return;
    st.lastEventId = event.id;
    st.awakeUntil = st.tick + 25; // 吵醒牠十秒左右
    // 食物（8 格寬）放右邊還是左邊：右邊放得下就放右邊，不然放左邊，
    // 身體最左、最右那一欄本來就是空的，所以貼著放剛好有 1 格間距
    const right = st.x + 16 + 8 <= cols;
    st.anim = { type: event.type, t: 0, event, foodSide: right ? 1 : -1 };
    st.fx = [];
    if (event.type === "warm") st.fx.push({ sprite: FX.heart, x: Math.floor((cols - 7) / 2), y: -1, vy: -1, ttl: 2, head: true });
    redraw();
  }, [event, cols]);

  useEffect(() => {
    const timer = setInterval(() => {
      const st = s.current;
      const { fullness: f, onEventDone: done, cols: C, compact: small, stage: stg } = propsRef.current;
      const maxX = C - 16;
      st.tick += 1;
      st.blink = false;
      st.wobble = 0;

      // 特效往上飄、時間到就消失
      st.fx = st.fx
        .map((e) => ({ ...e, y: e.y + (e.vy || 0), ttl: e.ttl - 1 }))
        .filter((e) => e.ttl > 0);

      const mood = moodOf(f);
      const sleeping = isNight() && st.tick > st.awakeUntil;

      if (st.anim) {
        const a = st.anim;
        a.t += 1;
        if (a.type === "eat") {
          if (a.t === 8) st.fx.push({ sprite: FX.heart, x: st.x + 5, y: -1, vy: -0, ttl: 3, head: true });
          if (a.t >= 10) {
            if (a.event.gift) {
              st.fx = []; // 吃東西的愛心清掉，不然會跟禮物盒疊成一團
              st.anim = { type: "gift", t: 0, event: a.event };
            } else {
              st.anim = null;
              done?.(a.event);
            }
          }
        } else if (a.type === "gift") {
          if (a.t % 2 === 0) st.fx.push({ sprite: FX.star, x: st.x + (a.t % 4 === 0 ? -6 : 15), y: 2, vy: -1, ttl: 2, head: true });
          if (a.t >= 7) {
            st.anim = null;
            done?.(a.event);
          }
        } else if (a.type === "warm") {
          // 點蛋取暖：晃兩下
          st.wobble = a.t % 2 ? 1 : -1;
          if (a.t >= 2) {
            st.anim = null;
            done?.(a.event);
          }
        } else if (a.type === "hatch") {
          // 孵化：先劇烈搖晃，第 3 格蛋殼往兩邊炸開、寶寶跳出來
          if (a.t <= 2) st.wobble = a.t % 2 ? 1 : -1;
          if (a.t === 3 || a.t === 5 || a.t === 7) {
            const cx = Math.floor((C - 16) / 2);
            st.fx.push({ sprite: FX.star, x: cx - 6, y: 2, vy: -1, ttl: 2, head: true });
            st.fx.push({ sprite: FX.star, x: cx + 15, y: 4, vy: -1, ttl: 2, head: true });
          }
          if (a.t >= 9) {
            st.x = Math.floor((C - 16) / 2);
            st.anim = null;
            done?.(a.event);
          }
        } else if (a.type === "pet") {
          if (a.t === 1) st.fx.push({ sprite: FX.heart, x: st.x + 5, y: -1, vy: -1, ttl: 3, head: true });
          if (a.t >= 4) {
            st.anim = null;
            done?.(a.event);
          }
        }
      } else if (stg !== "hatched") {
        if (chance(0.18)) st.wobble = chance(0.5) ? 1 : -1;
      } else if (sleeping) {
        if (st.tick % 3 === 0) st.fx.push({ sprite: FX.zSmall, x: Math.min(C - 3, st.x + 13), y: 0, vy: -1, ttl: 3, head: true });
      } else if (mood === "starving") {
        st.tear = st.tick % 4 < 2;
      } else {
        // 走來走去：餓的時候走得慢，開心的時候不太停
        const pause = mood === "hungry" ? 0.55 : mood === "happy" ? 0.12 : 0.25;
        if (!chance(pause)) {
          if (chance(0.08)) st.dir = -st.dir;
          st.x += st.dir;
          if (st.x <= 0 || st.x >= maxX) {
            st.x = Math.max(0, Math.min(maxX, st.x));
            st.dir = -st.dir;
          }
          st.hop = !st.hop;
        }
        if (chance(0.1)) st.blink = true;
        if (mood === "hungry" && st.tick % 9 === 0 && !st.fx.some((e) => e.sprite === FX.thought)) {
          const side = st.x + 16 + 9 <= C ? st.x + 16 : Math.max(0, st.x - 9);
          st.fx.push({ sprite: FX.thought, x: side, y: 7, ttl: 4, head: true }); // 跟頭頂齊高、在旁邊
        }
        if (mood === "happy" && !small && chance(0.06)) {
          st.anim = { type: "pet", t: 0, event: null };
        }
      }
      if (small) st.fx = [];
      redraw();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // ---------- 畫面 ----------
  const st = s.current;
  st.x = Math.max(0, Math.min(cols - 16, st.x)); // 螢幕寬度變了也不會跑出去
  const sp = SPECIES[species] || SPECIES.dango;
  const atFace = (pts) => pts.map(([x, y]) => [x + sp.face[0], y + sp.face[1]]);
  const mood = moodOf(fullness);
  const sleeping = isNight() && st.tick > st.awakeUntil && !st.anim;
  const groundTop = rows - 16;
  const pix = []; // [x, y]

  const a = st.anim;
  const isEgg = stage !== "hatched" && a?.type !== "hatch";
  const hatching = a?.type === "hatch";
  let lying = !a && !sleeping && mood === "starving";
  let eyes = "open";
  let mouth = mood === "happy" ? "smile" : "neutral";
  let dy = st.hop ? -1 : 0;

  if (a?.type === "eat") {
    dy = 0;
    if (a.t < 2) {
      eyes = "open";
      mouth = "open";
    } else if (a.t < 8) {
      eyes = "happy";
      mouth = a.t % 2 === 0 ? "open" : "chomp";
    } else {
      eyes = "happy";
      mouth = "smile";
      dy = a.t % 2 === 0 ? -2 : 0;
    }
  } else if (hatching) {
    eyes = a.t < 5 ? "open" : "happy";
    mouth = a.t < 5 ? "open" : "smile";
    dy = a.t >= 5 && a.t % 2 === 1 ? -2 : 0;
  } else if (a?.type === "gift" || a?.type === "pet") {
    eyes = "happy";
    mouth = "smile";
    dy = a.t % 2 === 1 ? -2 : 0;
  } else if (sleeping) {
    eyes = "closed";
    mouth = "neutral";
    dy = 0;
  } else if (mood === "hungry") {
    eyes = "sad";
    mouth = "sad";
  } else if (st.blink) {
    eyes = "blink";
  }

  const petY = groundTop + dy;
  const eggX = Math.floor((cols - 12) / 2);
  const eggY = rows - 14;
  if (isEgg) {
    // 蛋：還沒選是問號蛋，選了是那種寵物的花紋蛋，點越多下裂越大
    const eggSprite = stage === "choose" ? MYSTERY_EGG : sp.egg;
    [...eggSprite.pts, ...(stage === "egg" ? CRACKS[crack] || [] : [])].forEach(([x, y]) =>
      pix.push([eggX + st.wobble + x, eggY + y])
    );
  } else if (lying) {
    const lx = Math.floor((cols - 16) / 2);
    sp.lying.pts.forEach(([x, y]) => pix.push([lx + x, rows - sp.lying.h + y]));
    if (st.tear) pix.push([lx + 4, rows - 3], [lx + 4, rows - 2]);
  } else if (hatching && a.t <= 2) {
    // 孵化前段：裂到底的蛋在劇烈搖晃
    [...sp.egg.pts, ...CRACKS[3]].forEach(([x, y]) => pix.push([eggX + st.wobble + x, eggY + y]));
  } else {
    const px = hatching ? Math.floor((cols - 16) / 2) : st.x;
    const tear = mood === "hungry" && !a && !sleeping && st.tick % 6 < 2 ? TEAR : [];
    const parts = [...sp.body.pts, ...atFace([...EYES[eyes], ...MOUTHS[mouth], ...tear])];
    parts.forEach(([x, y]) => pix.push([px + x, petY + y]));
    // 孵化後段：蛋殼碎片往左右飛走
    if (hatching && a.t <= 6) {
      const spread = (a.t - 2) * 3;
      sp.egg.pts.forEach(([x, y]) => {
        if (y < 7) return; // 上半截已經炸開了，只剩下半截的殼
        pix.push([eggX + x + (x < 6 ? -spread : spread), eggY + y]);
      });
    }
  }

  // 吃東西時旁邊的食物，一口一口變小（從靠近寵物那一側開始少）
  if (a?.type === "eat" && a.event?.food && FOODS[a.event.food]) {
    const food = FOODS[a.event.food];
    const bites = a.t < 2 ? 0 : Math.min(3, Math.floor((a.t - 1) / 2));
    if (bites < 3) {
      const fx0 = a.foodSide > 0 ? st.x + 16 : st.x - 8;
      const eaten = bites * 3;
      food.pts.forEach(([x, y]) => {
        const fromPet = a.foodSide > 0 ? x : food.w - 1 - x;
        if (fromPet >= eaten) pix.push([fx0 + x, rows - food.h + y]);
      });
    }
  }

  // 送禮：頭上頂著一個禮物盒
  if (a?.type === "gift") {
    FX.gift.pts.forEach(([x, y]) => pix.push([st.x + 4 + x, petY - 9 + y]));
  }

  st.fx.forEach((e) => {
    const top = isEgg ? eggY : petY;
    const baseY = e.head ? top - e.sprite.h + 1 + e.y : e.y;
    e.sprite.pts.forEach(([x, y]) => pix.push([e.x + x, baseY + y]));
  });

  return (
    <svg
      viewBox={`0 0 ${cols} ${rows}`}
      width="100%"
      shapeRendering="crispEdges"
      style={{ display: "block", background: LCD_BG, ...style }}
      aria-hidden="true"
    >
      <defs>
        <pattern id={patternId} width="1" height="1" patternUnits="userSpaceOnUse">
          <rect x="0.08" y="0.08" width="0.84" height="0.84" fill={LCD_GHOST} />
        </pattern>
      </defs>
      <rect width={cols} height={rows} fill={`url(#${patternId})`} />
      {pix
        .filter(([x, y]) => x >= 0 && y >= 0 && x < cols && y < rows)
        .map(([x, y], i) => (
          <rect key={i} x={x + 0.04} y={y + 0.04} width="0.92" height="0.92" fill={INK} />
        ))}
    </svg>
  );
}
