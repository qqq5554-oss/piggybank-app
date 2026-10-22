import React, { useEffect, useId, useReducer, useRef } from "react";
import { FOODS, FX, PROPS, MYSTERY_EGG, CRACKS } from "./sprites";
import { petArt, BIG_PROPS } from "./petArt";
import { moodOf, PET_TOO_FULL } from "../../../lib/petRules.js";
import { pickActivity, startActivity, stepActivity, viewActivity } from "./activities";

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
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 一個會動的液晶螢幕。
// fullness 決定心情（開心／普通／餓／餓扁），太飽時會一臉滿足；晚上 9 點到早上 7 點會睡覺。
// event 換一個新的 id 就播一次動作：{ id, type: "eat" | "pet" | "warm" | "hatch", food, gift }
// 動作播完會呼叫 onEventDone(event)（吃完有 gift 的話連送禮動作一起播完才呼叫）。
// 「pet」（摸摸）會依情況變成：撒嬌、被吵醒的驚訝、連戳太多下的生氣。
// species：hedgehog / rabbit / dango；stage：choose（神秘蛋）/ egg（選好的蛋）/ hatched
// crack：蛋殼裂到第幾階段（0～3）
// 心情不錯的白天，牠會自己找事情做（玩球、散步…），開始／結束時呼叫 onActivity(type | null)。
// hasNews：今天有話想說還沒被看過，頭旁邊會不時冒出「！」對話框。
export default function PetLCD({
  cols = 40,
  rows = 33,
  fullness = 60,
  species = "dango",
  stage = "hatched",
  crack = 0,
  event = null,
  onEventDone,
  onActivity,
  hasNews = false,
  style,
}) {
  const patternId = useId().replace(/:/g, "");
  const [, redraw] = useReducer((n) => n + 1, 0);
  const s = useRef(null);
  if (!s.current) {
    s.current = {
      x: Math.floor((cols - petArt(species).w) / 2),
      dir: chance(0.5) ? 1 : -1,
      tick: 0,
      hop: false,
      blink: false,
      anim: null, // 正在播的動作
      fx: [], // 冒出來的愛心、Z、想法泡泡…
      awakeUntil: 0,
      tear: false,
      lastEventId: null,
      wobble: 0, // 蛋左右晃
      act: null, // 正在自己玩的活動
      lastAct: null,
      pokes: [], // 最近幾下摸摸的時間，連戳太多下會生氣
    };
  }
  const propsRef = useRef({});
  propsRef.current = { fullness, onEventDone, onActivity, cols, rows, stage, species, hasNews };

  // 新的動作進來
  useEffect(() => {
    const st = s.current;
    if (!event || event.id === st.lastEventId) return;
    st.lastEventId = event.id;
    const art = petArt(species);
    const wasAsleep = isNight() && st.tick > st.awakeUntil;
    st.awakeUntil = st.tick + 25; // 吵醒牠十秒左右
    if (st.act) {
      st.act = null;
      propsRef.current.onActivity?.(null);
    }
    st.fx = [];

    let type = event.type;
    if (type === "pet") {
      st.pokes = [...st.pokes.filter((t) => st.tick - t < 8), st.tick];
      if (wasAsleep) type = "surprised"; // 睡到一半被戳醒：嚇一跳
      else if (st.pokes.length >= 5) {
        type = "angry"; // 一直戳一直戳：生氣了！
        st.pokes = [];
      }
    }
    // 食物（8 格寬）放右邊還是左邊：右邊放得下就放右邊，不然放左邊
    const right = st.x + art.right + 2 + 8 <= cols;
    st.anim = { type, t: 0, event, foodX: right ? st.x + art.right + 2 : st.x + art.left - 10, foodSide: right ? 1 : -1 };
    if (type === "warm") st.fx.push({ sprite: FX.heart, x: Math.floor((cols - 7) / 2), y: -1, vy: -1, ttl: 2, head: true });
    if (type === "surprised") st.fx.push({ sprite: FX.bang, x: clamp(st.x + art.left - 3, 0, cols - 1), y: 4, ttl: 4, head: true });
    redraw();
  }, [event, cols, species]);

  useEffect(() => {
    const timer = setInterval(() => {
      const st = s.current;
      const { fullness: f, onEventDone: done, onActivity: onAct, cols: C, rows: R, stage: stg, species: spc, hasNews: news } = propsRef.current;
      const art = petArt(spc);
      const maxX = C - art.w;
      st.tick += 1;
      st.blink = false;
      st.wobble = 0;

      // 特效飄動、時間到就消失
      st.fx = st.fx
        .map((e) => ({ ...e, x: e.x + (e.vx || 0), y: e.y + (e.vy || 0), ttl: e.ttl - 1 }))
        .filter((e) => e.ttl > 0);

      const mood = moodOf(f);
      const sleeping = isNight() && st.tick > st.awakeUntil;
      const headX = st.x + Math.floor((art.w - 7) / 2); // 頭頂正上方（7 格寬的特效）
      const sideR = st.x + art.right + 2; // 身體右邊外側
      const fitsRight = (w) => sideR + w <= C;

      if (st.anim) {
        const a = st.anim;
        a.t += 1;
        const finish = () => {
          st.anim = null;
          done?.(a.event);
        };
        if (a.type === "eat") {
          if (a.t === 8) st.fx.push({ sprite: FX.heart, x: headX, y: -1, ttl: 3, head: true });
          if (a.t >= 10) {
            if (a.event.gift) {
              st.fx = []; // 吃東西的愛心清掉，不然會跟禮物盒疊成一團
              st.anim = { type: "gift", t: 0, event: a.event };
            } else finish();
          }
        } else if (a.type === "gift") {
          if (a.t % 2 === 0) st.fx.push({ sprite: FX.star, x: a.t % 4 === 0 ? st.x + art.left - 8 : sideR, y: 2, vy: -1, ttl: 2, head: true });
          if (a.t >= 7) finish();
        } else if (a.type === "warm") {
          // 點蛋取暖：晃兩下
          st.wobble = a.t % 2 ? 1 : -1;
          if (a.t >= 2) finish();
        } else if (a.type === "hatch") {
          // 孵化：先劇烈搖晃，第 3 格蛋殼往兩邊炸開、寶寶跳出來
          if (a.t <= 2) st.wobble = a.t % 2 ? 1 : -1;
          if (a.t === 3 || a.t === 5 || a.t === 7) {
            const cx = Math.floor((C - art.w) / 2);
            st.fx.push({ sprite: FX.star, x: cx - 6, y: 2, vy: -1, ttl: 2, head: true });
            st.fx.push({ sprite: FX.star, x: cx + art.w - 1, y: 4, vy: -1, ttl: 2, head: true });
          }
          if (a.t >= 9) {
            st.x = Math.floor((C - art.w) / 2);
            finish();
          }
        } else if (a.type === "pet") {
          // 撒嬌：兩邊冒愛心
          if (a.t === 1) {
            st.fx.push({ sprite: FX.heart, x: Math.max(0, st.x + art.left - 8), y: 4, vy: -1, ttl: 3, head: true });
            st.fx.push({ sprite: FX.heart, x: Math.min(C - 7, sideR), y: 2, vy: -1, ttl: 3, head: true });
          }
          if (a.t >= 4) finish();
        } else if (a.type === "surprised") {
          if (a.t >= 4) finish();
        } else if (a.type === "angry") {
          // 生氣：頭兩邊噴氣
          if (a.t === 1 || a.t === 4) {
            st.fx.push({ sprite: BIG_PROPS.steam, x: Math.max(0, st.x + art.left - 9), y: 6, vy: -1, ttl: 2, head: true });
            st.fx.push({ sprite: BIG_PROPS.steam, x: Math.min(C - 8, sideR), y: 6, vy: -1, ttl: 2, head: true });
          }
          if (a.t >= 7) finish();
        }
      } else if (stg !== "hatched") {
        if (chance(0.18)) st.wobble = chance(0.5) ? 1 : -1;
      } else if (sleeping || mood === "starving") {
        if (st.act) {
          st.act = null;
          onAct?.(null);
        }
        const lieX = Math.floor((C - art.lie.w) / 2);
        if (mood === "starving") {
          st.tear = st.tick % 4 < 2;
          if (art.big && st.tick % 8 === 0) st.fx.push({ sprite: BIG_PROPS.brokenHeart, x: Math.max(0, lieX - 2), y: 2, ttl: 4, head: true, lying: true });
        } else if (st.tick % 3 === 0) {
          // 睡覺冒 Z：趴著睡的從臉那邊冒，站著睡的從頭旁邊冒
          const zx = art.sleepsLying ? lieX + 2 : Math.min(C - 3, st.x + art.right - 2);
          st.fx.push({ sprite: FX.zSmall, x: zx, y: 0, vy: -1, ttl: 3, head: true, lying: art.sleepsLying });
        }
      } else if (st.act) {
        // 正在自己玩
        if (!stepActivity(st.act, st, C, art)) {
          st.lastAct = st.act.type;
          st.act = null;
          onAct?.(null);
        }
      } else if ((mood === "happy" || mood === "normal") && st.tick > 6 && chance(mood === "happy" ? 0.035 : 0.02)) {
        // 心情不錯的時候，偶爾自己找事情做
        const type = pickActivity(spc, art, st.lastAct);
        st.act = startActivity(type, st, C, art);
        onAct?.(type);
      } else {
        // 走來走去：餓的時候走得慢，開心的時候不太停
        const pause = mood === "hungry" ? 0.55 : mood === "happy" ? 0.12 : 0.25;
        if (!chance(pause)) {
          if (chance(0.08)) st.dir = -st.dir;
          st.x += st.dir;
          if (st.x <= 0 || st.x >= maxX) {
            st.x = clamp(st.x, 0, maxX);
            st.dir = -st.dir;
          }
          st.hop = !st.hop;
        }
        if (chance(0.1)) st.blink = true;
        if (mood === "hungry" && st.tick % 9 === 0 && !st.fx.some((e) => e.sprite === FX.thought)) {
          // 肚子餓：頭旁邊冒出想吃飯糰的泡泡，大隻的還會肚子咕嚕咕嚕
          st.fx.push({ sprite: FX.thought, x: fitsRight(9) ? sideR : Math.max(0, st.x + art.left - 11), y: 7, ttl: 4, head: true });
          if (art.big) st.fx.push({ sprite: BIG_PROPS.growl, x: fitsRight(4) ? sideR : Math.max(0, st.x + art.left - 6), y: R - 8, ttl: 4 });
        }
        // 有話想說：每隔一陣子在頭旁邊冒出「！」
        if (news && mood !== "hungry" && st.tick % 7 === 0 && !st.fx.some((e) => e.speech)) {
          const right = fitsRight(7);
          st.fx.push({ sprite: right ? PROPS.speechR : PROPS.speechL, x: right ? sideR : Math.max(0, st.x + art.left - 9), y: 6, ttl: 4, head: true, speech: true });
        }
        if (mood === "happy" && chance(0.03)) st.anim = { type: "pet", t: 0, event: null };
      }
      redraw();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // ---------- 畫面 ----------
  const st = s.current;
  const art = petArt(species);
  st.x = clamp(st.x, 0, cols - art.w); // 螢幕寬度變了也不會跑出去
  const mood = moodOf(fullness);
  const sleeping = isNight() && st.tick > st.awakeUntil && !st.anim;
  const groundTop = rows - art.h;
  let pix = []; // [x, y]

  const a = st.anim;
  const isEgg = stage !== "hatched" && a?.type !== "hatch";
  const hatching = a?.type === "hatch";
  const starving = !a && !sleeping && mood === "starving";
  const lyingDown = !isEgg && !hatching && (starving || (sleeping && art.sleepsLying && !a));
  let eyes = "open";
  let mouth = mood === "happy" ? "smile" : "small";
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
    eyes = a.t < 5 ? "surprised" : "happy";
    mouth = a.t < 5 ? "oh" : "open";
    dy = a.t >= 5 && a.t % 2 === 1 ? -2 : 0;
  } else if (a?.type === "gift") {
    eyes = "happy";
    mouth = "open";
    dy = a.t % 2 === 1 ? -2 : 0;
  } else if (a?.type === "pet") {
    eyes = "cute"; // 撒嬌
    mouth = "smile";
    dy = a.t % 2 === 1 ? -1 : 0;
  } else if (a?.type === "surprised") {
    eyes = "surprised";
    mouth = "oh";
    dy = a.t === 1 ? -2 : 0;
  } else if (a?.type === "angry") {
    eyes = "angry";
    mouth = "pout";
    dy = a.t % 2 ? -1 : 0;
  } else if (sleeping) {
    eyes = "closed";
    mouth = "small";
    dy = 0;
  } else if (mood === "hungry") {
    eyes = art.big ? "open" : "sad";
    mouth = "wobble";
  } else if (fullness > PET_TOO_FULL) {
    eyes = "closed"; // 吃得飽飽的，一臉滿足
    mouth = "smile";
  } else if (st.blink) {
    eyes = "blink";
  }

  // 正在自己玩：表情、跳躍、道具由活動決定
  const act = !a && !sleeping && !starving && stage === "hatched" ? st.act : null;
  const actView = act ? viewActivity(act, st, { rows, cols, art, groundTop }) : null;
  if (actView) {
    eyes = actView.eyes;
    mouth = actView.mouth;
    dy = actView.dy;
  }

  const petY = groundTop + dy;
  const eggX = Math.floor((cols - 12) / 2);
  const eggY = rows - 14;
  const lieX = Math.floor((cols - art.lie.w) / 2);
  const lieY = rows - art.lie.h;
  if (isEgg) {
    // 蛋：還沒選是問號蛋，選了是那種寵物的花紋蛋，點越多下裂越大
    const eggSprite = stage === "choose" ? MYSTERY_EGG : art.egg;
    [...eggSprite.pts, ...(stage === "egg" ? CRACKS[crack] || [] : [])].forEach(([x, y]) => pix.push([eggX + st.wobble + x, eggY + y]));
  } else if (lyingDown) {
    // 趴著：睡覺（閉眼）或餓扁（哭）
    // 小團子餓扁時眼淚一閃一閃；大隻的臉本身就畫了眼淚
    const face = art.big || st.tear ? art.lieFace(starving ? "sad" : "sleep") : [];
    [...art.lie.pts, ...face].forEach(([x, y]) => pix.push([lieX + x, lieY + y]));
  } else if (actView?.curled) {
    // 刺蝟縮成一顆球在地上滾
    art.curl.pts.forEach(([x, y]) => pix.push([st.x + x, rows - art.curl.h + y + dy]));
  } else if (hatching && a.t <= 2) {
    // 孵化前段：裂到底的蛋在劇烈搖晃
    [...art.egg.pts, ...CRACKS[3]].forEach(([x, y]) => pix.push([eggX + st.wobble + x, eggY + y]));
  } else {
    const px = hatching ? Math.floor((cols - art.w) / 2) : st.x;
    const crying = !art.big && mood === "hungry" && !a && !sleeping && st.tick % 6 < 2;
    [...art.body, ...art.face(eyes, mouth, crying)].forEach(([x, y]) => pix.push([px + x, petY + y]));
    // 孵化後段：蛋殼碎片往左右飛走
    if (hatching && a.t <= 6) {
      const spread = (a.t - 2) * 3;
      art.egg.pts.forEach(([x, y]) => {
        if (y < 7) return; // 上半截已經炸開了，只剩下半截的殼
        pix.push([eggX + x + (x < 6 ? -spread : spread), eggY + y]);
      });
    }
  }

  if (actView) {
    // 道具蓋住身體的部分要擦掉（浴缸前面看不到腳、遊戲機擋住肚子）
    if (actView.erase.length) {
      const gone = new Set(actView.erase.map(([x, y]) => x + "," + y));
      pix = pix.filter(([x, y]) => !gone.has(x + "," + y));
    }
    pix.push(...actView.pix);
  }

  // 吃東西時旁邊的食物，一口一口變小（從靠近寵物那一側開始少）
  if (a?.type === "eat" && a.event?.food && FOODS[a.event.food]) {
    const food = FOODS[a.event.food];
    const bites = a.t < 2 ? 0 : Math.min(3, Math.floor((a.t - 1) / 2));
    if (bites < 3) {
      const eaten = bites * 3;
      food.pts.forEach(([x, y]) => {
        const fromPet = a.foodSide > 0 ? x : food.w - 1 - x;
        if (fromPet >= eaten) pix.push([a.foodX + x, rows - food.h + y]);
      });
    }
  }

  // 送禮：頭上頂著一個禮物盒
  if (a?.type === "gift") {
    FX.gift.pts.forEach(([x, y]) => pix.push([st.x + Math.floor((art.w - 8) / 2) + x, petY - 9 + y]));
  }

  st.fx.forEach((e) => {
    const top = isEgg ? eggY : e.lying || lyingDown ? lieY : petY;
    const baseY = e.head ? top - e.sprite.h + 1 + e.y : e.y;
    e.sprite.pts.forEach(([x, y]) => pix.push([e.x + x, baseY + y]));
  });

  return (
    <svg viewBox={`0 0 ${cols} ${rows}`} width="100%" shapeRendering="crispEdges" style={{ display: "block", background: LCD_BG, ...style }} aria-hidden="true">
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
