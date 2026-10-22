// 寵物自己找事情做：玩球、散步哼歌、跳舞、聞花香、追蝴蝶，
// 還有每種寵物的招牌動作（刺蝟滾來滾去、兔子跳高高、小團子吹泡泡）。
// 每一格（tick）呼叫一次 stepActivity 往前推，畫面用 viewActivity 算出要畫什麼。
import { PROPS, FX } from "./sprites";

export const ACTIVITY_LABELS = {
  ball: "在玩球 ⚽",
  walk: "在散步哼歌 🎵",
  dance: "在跳舞 💃",
  flower: "在聞花香 🌼",
  butterfly: "在追蝴蝶 🦋",
  roll: "縮成一顆球滾來滾去",
  bighop: "在跳高高",
  bubbles: "在吹泡泡",
};

const SPECIAL = { hedgehog: "roll", rabbit: "bighop", dango: "bubbles" };
const BALL_ARC = [-2, -4, -5, -5, -4, -2, 0]; // 球飛起來的高度變化

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 挑一個活動；首頁小螢幕沒有頭上的空間，只挑在地上就看得到的
export function pickActivity(species, compact, last) {
  const special = SPECIAL[species] || "dance";
  const options = compact
    ? ["ball", "walk", special === "bubbles" ? "walk" : special]
    : ["ball", "walk", "dance", "flower", "butterfly", special, special];
  const fresh = options.filter((o) => o !== last);
  return pickOne(fresh.length ? fresh : options);
}

export function startActivity(type, st, C) {
  const onLeft = st.x + 8 < C / 2;
  switch (type) {
    case "ball":
      return { type, t: 0, bx: onLeft ? Math.min(C - 4, st.x + 22) : Math.max(0, st.x - 10), arc: -1, bv: 0, kicks: 0, kickT: -9 };
    case "flower":
      return { type, t: 0, fx: onLeft ? Math.min(C - 5, st.x + 22) : Math.max(0, st.x - 11), phase: "go", sniff: 0 };
    case "butterfly":
      return { type, t: 0, bx: onLeft ? C - 7 : 0, bdir: onLeft ? -1 : 1 };
    default:
      return { type, t: 0, dir: st.dir || 1 };
  }
}

// 往前推一格；回傳 false 代表活動結束
export function stepActivity(act, st, C, small) {
  const maxX = C - 16;
  act.t += 1;
  const note = (side) => {
    if (small) return;
    st.fx.push({ sprite: PROPS.note, x: clamp(side > 0 ? st.x + 13 : st.x - 1, 0, C - 4), y: 3, vy: -1, ttl: 3, head: true });
  };

  switch (act.type) {
    case "ball": {
      if (act.bv !== 0) {
        // 球在飛：撞到牆會彈回來（像對著牆踢球），
        // 彈回來碰到寵物就掉在牠面前，等牠再踢一次
        act.bx += act.bv * 2;
        if (act.bx <= 0 || act.bx >= C - 4) {
          act.bx = clamp(act.bx, 0, C - 4);
          act.bv = -act.bv;
        }
        act.arc += 1;
        const petL = st.x + 1;
        const petR = st.x + 14;
        if (act.bx + 3 >= petL && act.bx <= petR) {
          act.bx = act.bv > 0 ? petL - 4 : petR + 1; // 停在碰到的那一側
          act.bx = clamp(act.bx, 0, C - 4);
          act.bv = 0;
          act.arc = -1;
        } else if (act.arc >= BALL_ARC.length) {
          act.bv = 0;
          act.arc = -1;
        }
      }
      if (act.bv === 0) {
        // 跑到球旁邊（身體最外側那欄是空的，所以這樣剛好貼著球）
        const ballLeft = act.bx + 2 < st.x + 8;
        const target = clamp(ballLeft ? act.bx + 3 : act.bx - 15, 0, maxX);
        const diff = target - st.x;
        if (Math.abs(diff) <= 1) {
          if (act.kicks >= 3) return false;
          act.kicks += 1;
          act.bv = ballLeft ? -1 : 1; // 往離開自己的方向踢
          act.arc = 0;
          act.kickT = act.t;
        } else {
          st.x += Math.sign(diff) * Math.min(2, Math.abs(diff)); // 用跑的
          st.hop = !st.hop;
        }
      }
      return act.t < 50;
    }
    case "walk": {
      st.x += act.dir;
      if (st.x <= 0 || st.x >= maxX) {
        st.x = clamp(st.x, 0, maxX);
        act.dir = -act.dir;
      }
      st.hop = !st.hop;
      if (act.t % 3 === 0) note(act.dir);
      return act.t < 18;
    }
    case "dance": {
      st.x = clamp(st.x + (act.t % 4 < 2 ? 1 : -1), 0, maxX);
      if (act.t % 2 === 0) note(act.t % 4 === 0 ? 1 : -1);
      return act.t < 10;
    }
    case "flower": {
      if (act.phase === "go") {
        const flowerRight = act.fx > st.x + 8;
        const target = clamp(flowerRight ? act.fx - 16 : act.fx + 5, 0, maxX); // 留一格，花才不會貼在身上
        if (st.x === target) {
          act.phase = "sniff";
        } else {
          st.x += Math.sign(target - st.x);
          st.hop = !st.hop;
        }
        return act.t < 40;
      }
      act.sniff += 1;
      if (act.sniff === 2 && !small) st.fx.push({ sprite: FX.heart, x: st.x + 5, y: 0, vy: -1, ttl: 3, head: true });
      return act.sniff < 7;
    }
    case "butterfly": {
      if (act.t < 16) {
        act.bx += act.bdir;
        if (act.bx <= 0 || act.bx >= C - 7) {
          act.bx = clamp(act.bx, 0, C - 7);
          act.bdir = -act.bdir;
        }
        // 寵物在下面跟著跑
        const target = clamp(act.bx - 5, 0, maxX);
        if (st.x !== target) {
          st.x += Math.sign(target - st.x);
          st.hop = !st.hop;
        }
      }
      return act.t < 20; // 最後幾格蝴蝶往上飛走
    }
    case "roll": {
      if (act.t <= 10) {
        st.x += act.dir * 2;
        if (st.x <= 0 || st.x >= maxX) {
          st.x = clamp(st.x, 0, maxX);
          act.dir = -act.dir;
        }
      }
      return act.t < 13;
    }
    case "bighop": {
      st.x += act.dir * 2;
      if (st.x <= 0 || st.x >= maxX) {
        st.x = clamp(st.x, 0, maxX);
        act.dir = -act.dir;
      }
      return act.t < 12;
    }
    case "bubbles": {
      if (act.t % 2 === 0 && !small) {
        st.fx.push({ sprite: PROPS.bubble, x: clamp(st.x + 10 + (act.t % 4 ? 1 : 0), 0, C - 3), y: 4, vy: -1, vx: 1, ttl: 4, head: true });
      }
      return act.t < 10;
    }
    default:
      return false;
  }
}

// 這一格要怎麼畫：表情、跳多高、要不要用捲起來的身體、旁邊有哪些道具
export function viewActivity(act, st, { rows }) {
  const v = { eyes: "open", mouth: "smile", dy: st.hop ? -1 : 0, curled: false, pix: [] };
  const put = (sprite, x, y) => sprite.pts.forEach(([px, py]) => v.pix.push([x + px, y + py]));

  switch (act.type) {
    case "ball": {
      const justKicked = act.t - act.kickT < 2;
      if (justKicked) {
        v.eyes = "happy";
        v.dy = -2;
      }
      const y = rows - 4 + (act.arc >= 0 ? BALL_ARC[act.arc] : 0);
      put(PROPS.ball, act.bx, y);
      break;
    }
    case "walk":
      v.eyes = act.t % 4 === 0 ? "happy" : "open";
      break;
    case "dance":
      v.eyes = "happy";
      v.mouth = act.t % 2 ? "open" : "smile";
      v.dy = act.t % 2 ? -2 : 0;
      break;
    case "flower":
      if (act.phase === "sniff") {
        v.eyes = "closed"; // 閉上眼睛聞，很享受
        v.dy = 0;
      }
      put(PROPS.flower, act.fx, rows - PROPS.flower.h);
      break;
    case "butterfly": {
      const flyAway = Math.max(0, act.t - 16) * 2;
      const by = 1 + (act.t % 4 < 2 ? 0 : 1) - flyAway;
      put(act.t % 2 ? PROPS.butterflyClosed : PROPS.butterflyOpen, act.bx, by);
      v.eyes = act.t % 5 === 0 ? "happy" : "open";
      break;
    }
    case "roll":
      if (act.t <= 10) {
        v.curled = true;
        v.dy = act.t % 2 ? -1 : 0; // 滾的時候一顛一顛
      } else {
        v.eyes = "happy"; // 打開來：嘿！
        v.dy = act.t === 11 ? -2 : 0;
      }
      break;
    case "bighop":
      v.eyes = "happy";
      v.dy = [0, -3, -5, -3][act.t % 4];
      break;
    case "bubbles":
      v.eyes = "happy";
      v.mouth = "chomp";
      v.dy = 0;
      break;
    default:
      break;
  }
  return v;
}
