// 寵物自己找事情做：玩球、散步唱歌、跳舞、聞花香、追蝴蝶、洗澡、玩遊戲，
// 還有每種寵物的招牌動作（刺蝟滾來滾去、兔子跳高高、小團子吹泡泡）。
// 每一格（tick）呼叫一次 stepActivity 往前推，畫面用 viewActivity 算出要畫什麼。
// 寵物多大、左右邊緣在哪都從 art（petArt）拿，不寫死。
import { PROPS, FX } from "./sprites";
import { BIG_PROPS } from "./bigSprites";

export const ACTIVITY_LABELS = {
  ball: "在玩球 ⚽",
  walk: "在散步唱歌 🎵",
  dance: "在跳舞 💃",
  flower: "在聞花香 🌼",
  butterfly: "在追蝴蝶 🦋",
  bath: "在洗澡 🛁",
  game: "在玩遊戲 🎮",
  roll: "縮成一顆球滾來滾去",
  bighop: "在跳高高",
  bubbles: "在吹泡泡",
};

const SPECIAL = { hedgehog: "roll", rabbit: "bighop", dango: "bubbles" };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 挑一個活動（不跟上一個重複）；洗澡、玩遊戲的道具是配大隻的刺蝟兔子畫的
export function pickActivity(species, art, last) {
  const special = SPECIAL[species] || "dance";
  const options = ["ball", "walk", "dance", "flower", "butterfly", special, special];
  if (art.big) options.push("bath", "game");
  const fresh = options.filter((o) => o !== last);
  return pickOne(fresh.length ? fresh : options);
}

export function startActivity(type, st, C, art) {
  const mid = st.x + art.w / 2;
  const onLeft = mid < C / 2;
  switch (type) {
    case "ball": {
      const bw = art.ball.w;
      return {
        type,
        t: 0,
        bx: onLeft ? Math.min(C - bw, st.x + art.right + 6) : Math.max(0, st.x + art.left - bw - 6),
        arc: -1,
        bv: 0,
        kicks: 0,
        kickT: -9,
      };
    }
    case "flower":
      return { type, t: 0, fx: onLeft ? Math.min(C - 5, st.x + art.right + 6) : Math.max(0, st.x + art.left - 11), phase: "go", sniff: 0 };
    case "butterfly":
      return { type, t: 0, bx: onLeft ? C - 7 : 0, bdir: onLeft ? -1 : 1 };
    default:
      return { type, t: 0, dir: st.dir || 1 };
  }
}

// 往前推一格；回傳 false 代表活動結束
export function stepActivity(act, st, C, art) {
  const maxX = C - art.w;
  act.t += 1;
  const note = (side) => {
    st.fx.push({ sprite: PROPS.note, x: clamp(side > 0 ? st.x + art.right - 2 : st.x + art.left - 2, 0, C - 4), y: 3, vy: -1, ttl: 3, head: true });
  };
  const walkBy = (step) => {
    st.x += step;
    if (st.x <= 0 || st.x >= maxX) {
      st.x = clamp(st.x, 0, maxX);
      act.dir = -act.dir;
    }
  };

  switch (act.type) {
    case "ball": {
      const bw = art.ball.w;
      const petL = st.x + art.left;
      const petR = st.x + art.right;
      if (act.bv !== 0) {
        // 球在飛：撞到牆會彈回來（像對著牆踢球），
        // 彈回來碰到寵物就掉在牠面前，等牠再踢一次
        act.bx += act.bv * 2;
        if (act.bx <= 0 || act.bx >= C - bw) {
          act.bx = clamp(act.bx, 0, C - bw);
          act.bv = -act.bv;
        }
        act.arc += 1;
        if (act.bx + bw - 1 >= petL && act.bx <= petR) {
          act.bx = clamp(act.bv > 0 ? petL - bw : petR + 1, 0, C - bw); // 停在碰到的那一側
          act.bv = 0;
          act.arc = -1;
        } else if (act.arc >= art.ballArc.length) {
          act.bv = 0;
          act.arc = -1;
        }
      }
      if (act.bv === 0) {
        // 跑到球旁邊，貼著球站好再踢
        const ballLeft = act.bx + bw / 2 < st.x + art.w / 2;
        const target = clamp(ballLeft ? act.bx + bw - art.left : act.bx - 1 - art.right, 0, maxX);
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
      walkBy(act.dir);
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
        const flowerRight = act.fx > st.x + art.w / 2;
        const target = clamp(flowerRight ? act.fx - 2 - art.right : act.fx + 6 - art.left, 0, maxX); // 留一格，花才不會貼在身上
        if (st.x === target) {
          act.phase = "sniff";
        } else {
          st.x += Math.sign(target - st.x);
          st.hop = !st.hop;
        }
        return act.t < 40;
      }
      act.sniff += 1;
      if (act.sniff === 2) st.fx.push({ sprite: FX.heart, x: st.x + Math.floor((art.w - 7) / 2), y: 0, vy: -1, ttl: 3, head: true });
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
        const target = clamp(Math.round(act.bx + 3 - art.w / 2), 0, maxX);
        if (st.x !== target) {
          st.x += Math.sign(target - st.x);
          st.hop = !st.hop;
        }
      }
      return act.t < 20; // 最後幾格蝴蝶往上飛走
    }
    case "bath": {
      // 泡在浴缸裡，泡泡一顆一顆冒上去
      if (act.t % 2 === 0) {
        st.fx.push({ sprite: PROPS.bubble, x: clamp(st.x + (act.t % 4 ? art.right - 1 : art.left), 0, C - 3), y: 6, vy: -1, ttl: 4, head: true });
      }
      return act.t < 16;
    }
    case "game": {
      if (act.t % 5 === 4) st.fx.push({ sprite: FX.star, x: clamp(st.x + art.right - 1, 0, C - 7), y: 4, vy: -1, ttl: 2, head: true });
      return act.t < 16;
    }
    case "roll": {
      if (act.t <= 10) {
        const cw = art.curl?.w || art.w;
        st.x += act.dir * 2;
        if (st.x <= 0 || st.x >= C - cw) {
          st.x = clamp(st.x, 0, C - cw);
          act.dir = -act.dir;
        }
      } else {
        st.x = clamp(st.x, 0, maxX); // 打開身體時不要超出螢幕
      }
      return act.t < 13;
    }
    case "bighop": {
      walkBy(act.dir * 2);
      return act.t < 12;
    }
    case "bubbles": {
      if (act.t % 2 === 0) {
        st.fx.push({ sprite: PROPS.bubble, x: clamp(st.x + art.w - 6 + (act.t % 4 ? 1 : 0), 0, C - 3), y: 4, vy: -1, vx: 1, ttl: 4, head: true });
      }
      return act.t < 10;
    }
    default:
      return false;
  }
}

// 這一格要怎麼畫：表情、跳多高、要不要用捲起來的身體、旁邊有哪些道具。
// erase 是道具要蓋掉的格子（例如浴缸前面看不到腳）。
export function viewActivity(act, st, { rows, cols, art, groundTop }) {
  const v = { eyes: "open", mouth: "smile", dy: st.hop ? -1 : 0, curled: false, pix: [], erase: [] };
  const put = (sprite, x, y) => {
    sprite.pts.forEach(([px, py]) => v.pix.push([x + px, y + py]));
    (sprite.clear || []).forEach(([px, py]) => v.erase.push([x + px, y + py]));
  };

  switch (act.type) {
    case "ball": {
      const justKicked = act.t - act.kickT < 2;
      if (justKicked) {
        v.eyes = "happy";
        v.mouth = "open";
        v.dy = -2;
      }
      const y = rows - art.ball.h + (act.arc >= 0 ? art.ballArc[act.arc] : 0);
      put(art.ball, act.bx, y);
      break;
    }
    case "walk":
      v.eyes = act.t % 4 === 0 ? "closed" : "happy";
      v.mouth = act.t % 2 ? "sing" : "smile";
      break;
    case "dance":
      v.eyes = "happy";
      v.mouth = act.t % 2 ? "sing" : "smile";
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
    case "bath": {
      // 身體往下沉一點，泡在浴缸裡；小鴨子在旁邊漂
      v.eyes = act.t % 6 < 4 ? "closed" : "happy";
      v.mouth = "smile";
      v.dy = 2;
      const tub = BIG_PROPS.tub;
      const tubX = clamp(Math.round(st.x + art.w / 2 - tub.w / 2), 0, cols - tub.w);
      put(tub, tubX, rows - tub.h);
      put(BIG_PROPS.duck, tubX + 2, rows - tub.h - 4 + (act.t % 2));
      break;
    }
    case "game": {
      // 雙手拿著遊戲機，專心玩，偶爾贏了很開心
      const won = act.t % 5 === 4;
      v.eyes = won ? "happy" : act.t % 3 === 0 ? "blink" : "open";
      v.mouth = won ? "open" : "small";
      v.dy = won ? -1 : 0;
      const g = BIG_PROPS.game;
      put(g, Math.round(st.x + art.w / 2 - g.w / 2), groundTop + v.dy + 14);
      break;
    }
    case "roll":
      if (act.t <= 10 && art.curl) {
        v.curled = true;
        v.dy = act.t % 2 ? -1 : 0; // 滾的時候一顛一顛
      } else {
        v.eyes = "happy"; // 打開來：嘿！
        v.mouth = "open";
        v.dy = act.t === 11 ? -2 : 0;
      }
      break;
    case "bighop":
      v.eyes = "happy";
      v.mouth = "open";
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
