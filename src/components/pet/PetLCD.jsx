import React, { useEffect, useId, useReducer, useRef } from "react";
import { FX, PROPS, MYSTERY_EGG, CRACKS } from "./sprites";
import { petArt, BIG_PROPS } from "./petArt";
import { isPetSleepTime } from "../../../lib/petRules.js";
import { pickActivity, startActivity, stepActivity, viewActivity } from "./activities";

// 經典電子雞的單色液晶：淡綠底、深綠點，還有沒亮的格子淡淡的殘影
export const LCD_BG = "#C7D1A6";
const LCD_GHOST = "#BCC69A";
const INK = "#2F3A24";

const TICK_MS = 420; // 一格一格跳的速度，刻意不做流暢動畫，才有液晶的感覺
const isNight = () => isPetSleepTime();
const chance = (p) => Math.random() < p;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// 一個會動的液晶螢幕。
// 寵物不會餓，永遠開開心心的；晚上睡覺時間會趴著睡。
// event 換一個新的 id 就播一次動作：{ id, type: "gift" | "pet" | "warm" | "hatch" }
// 動作播完會呼叫 onEventDone(event)。
// 「pet」（摸摸）會依情況變成：撒嬌、被吵醒的驚訝、連戳太多下的生氣。
// species：hedgehog / rabbit / dango；stage：choose（神秘蛋）/ egg（選好的蛋）/ hatched
// crack：蛋殼裂到第幾階段（0～3）
// 心情不錯的白天，牠會自己找事情做（玩球、散步…），開始／結束時呼叫 onActivity(type | null)。
// hasNews：今天有話想說還沒被看過，頭旁邊會不時冒出「！」對話框。
export default function PetLCD({
  cols = 40,
  rows = 33,
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
      lastEventId: null,
      wobble: 0, // 蛋左右晃
      act: null, // 正在自己玩的活動
      lastAct: null,
      pokes: [], // 最近幾下摸摸的時間，連戳太多下會生氣
      playedOnOpen: false, // 打開畫面後第一個活動開始了沒
    };
  }
  const propsRef = useRef({});
  propsRef.current = { onEventDone, onActivity, cols, rows, stage, species, hasNews };

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
    st.anim = { type, t: 0, event };
    if (type === "warm") st.fx.push({ sprite: FX.heart, x: Math.floor((cols - 7) / 2), y: -1, vy: -1, ttl: 2, head: true });
    if (type === "surprised") st.fx.push({ sprite: FX.bang, x: clamp(st.x + art.left - 3, 0, cols - 1), y: 4, ttl: 4, head: true });
    redraw();
  }, [event, cols, species]);

  useEffect(() => {
    const timer = setInterval(() => {
      const st = s.current;
      const { onEventDone: done, onActivity: onAct, cols: C, stage: stg, species: spc, hasNews: news } = propsRef.current;
      const art = petArt(spc);
      const maxX = C - art.w;
      st.tick += 1;
      st.blink = false;
      st.wobble = 0;

      // 特效飄動、時間到就消失
      st.fx = st.fx
        .map((e) => ({ ...e, x: e.x + (e.vx || 0), y: e.y + (e.vy || 0), ttl: e.ttl - 1 }))
        .filter((e) => e.ttl > 0);

      const sleeping = isNight() && st.tick > st.awakeUntil;
      const sideR = st.x + art.right + 2; // 身體右邊外側
      const fitsRight = (w) => sideR + w <= C;

      if (st.anim) {
        const a = st.anim;
        a.t += 1;
        const finish = () => {
          st.anim = null;
          done?.(a.event);
        };
        if (a.type === "gift") {
          // 送禮：頂著禮物盒開心跳，旁邊冒星星
          if (a.t % 2 === 0) st.fx.push({ sprite: FX.star, x: a.t % 4 === 0 ? st.x + art.left - 8 : sideR, y: 2, vy: -1, ttl: 2, head: true });
          if (a.t >= 9) finish();
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
      } else if (sleeping) {
        if (st.act) {
          st.act = null;
          onAct?.(null);
        }
        const lieX = Math.floor((C - art.lie.w) / 2);
        if (st.tick % 3 === 0) {
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
      } else if ((!st.playedOnOpen && st.tick >= 3) || (st.tick > 6 && chance(0.05))) {
        // 一打開就在做事情（等畫面先站好一下）；之後也常常自己找事情做
        st.playedOnOpen = true;
        const type = pickActivity(spc, art, st.lastAct);
        st.act = startActivity(type, st, C, art);
        onAct?.(type);
      } else {
        // 走來走去，偶爾停一下
        if (!chance(0.12)) {
          if (chance(0.08)) st.dir = -st.dir;
          st.x += st.dir;
          if (st.x <= 0 || st.x >= maxX) {
            st.x = clamp(st.x, 0, maxX);
            st.dir = -st.dir;
          }
          st.hop = !st.hop;
        }
        if (chance(0.1)) st.blink = true;
        // 有話想說：每隔一陣子在頭旁邊冒出「！」
        if (news && st.tick % 7 === 0 && !st.fx.some((e) => e.speech)) {
          const right = fitsRight(7);
          st.fx.push({ sprite: right ? PROPS.speechR : PROPS.speechL, x: right ? sideR : Math.max(0, st.x + art.left - 9), y: 6, ttl: 4, head: true, speech: true });
        }
        if (chance(0.03)) st.anim = { type: "pet", t: 0, event: null };
      }
      redraw();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, []);

  // ---------- 畫面 ----------
  const st = s.current;
  const art = petArt(species);
  st.x = clamp(st.x, 0, cols - art.w); // 螢幕寬度變了也不會跑出去
  const sleeping = isNight() && st.tick > st.awakeUntil && !st.anim;
  const groundTop = rows - art.h;
  let pix = []; // [x, y]

  const a = st.anim;
  const isEgg = stage !== "hatched" && a?.type !== "hatch";
  const hatching = a?.type === "hatch";
  const lyingDown = !isEgg && !hatching && sleeping && art.sleepsLying && !a;
  let eyes = "open";
  let mouth = "smile";
  let dy = st.hop ? -1 : 0;

  if (hatching) {
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
  } else if (st.blink) {
    eyes = "blink";
  }

  // 正在自己玩：表情、跳躍、道具由活動決定
  const act = !a && !sleeping && stage === "hatched" ? st.act : null;
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
    // 趴著睡覺（閉眼）
    const face = art.lieFace("sleep");
    [...art.lie.pts, ...face].forEach(([x, y]) => pix.push([lieX + x, lieY + y]));
  } else if (actView?.curled) {
    // 刺蝟縮成一顆球在地上滾
    art.curl.pts.forEach(([x, y]) => pix.push([st.x + x, rows - art.curl.h + y + dy]));
  } else if (hatching && a.t <= 2) {
    // 孵化前段：裂到底的蛋在劇烈搖晃
    [...art.egg.pts, ...CRACKS[3]].forEach(([x, y]) => pix.push([eggX + st.wobble + x, eggY + y]));
  } else {
    const px = hatching ? Math.floor((cols - art.w) / 2) : st.x;
    [...art.body, ...art.face(eyes, mouth)].forEach(([x, y]) => pix.push([px + x, petY + y]));
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
