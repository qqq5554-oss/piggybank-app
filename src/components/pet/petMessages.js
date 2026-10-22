// 寵物每天想跟小主人說的一句話。
// 從小孩真的資料挑最相關的（昨天責任有沒有做完、存錢目標、挑戰進度、
// 發零用錢的日子、認識幾天了…），再混一些寵物的日常分享和小知識。
// 同一個小孩同一天挑到的永遠一樣（用日期當種子），重新整理不會換一句。

const KEY = "piggybank_pet_msg_";

// 簡單的種子亂數：同樣的字串永遠得到同樣的一串數字
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const daysBetween = (fromIso, toIso) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);

const SHARES = {
  common: [
    "我剛剛追著一隻蝴蝶跑了好久，差一點點就抓到了！",
    "我今天把球踢得好遠，自己都嚇一跳！",
    "昨天晚上我夢到一個跟房子一樣大的蛋糕 🍰",
    "外面的雲好像一隻在睡覺的小狗",
    "我今天學會一首新的歌，哼給你聽：啦～啦啦～",
    "我發現一朵好香的花，下次帶你去看",
    "今天的風吹起來涼涼的，好舒服",
    "我剛剛偷偷練習跳舞，你有看到嗎？",
  ],
  hedgehog: [
    "我今天把身上的刺梳得整整齊齊的！",
    "我剛剛縮成一顆球滾下小山坡，好好玩！",
    "我的鼻子很靈喔，你今天吃了什麼我都聞得出來 👃",
  ],
  rabbit: [
    "我今天跳得好高好高，差點碰到雲！",
    "我的耳朵可以聽到很遠的聲音，我聽到你在努力喔！",
    "我今天吃了一根好脆的紅蘿蔔 🥕",
  ],
  dango: [
    "我頭上的小芽好像又長高了一點點！",
    "我今天吹了一個好大的泡泡，飛到天上去了",
    "我今天滾來滾去，變得更圓了一點點",
  ],
};
const FACTS = {
  common: [
    "你知道嗎？章魚有三顆心臟！🐙",
    "你知道嗎？蜂鳥是唯一可以倒著飛的鳥",
    "你知道嗎？海獺睡覺的時候會手牽手，才不會被水沖走",
    "你知道嗎？企鵝會送小石頭給喜歡的朋友",
    "你知道嗎？長頸鹿的舌頭是紫色的！",
  ],
  hedgehog: ["你知道嗎？刺蝟身上大約有五千根刺！", "你知道嗎？刺蝟其實晚上比較有精神，可是我想跟你一樣早睡早起"],
  rabbit: ["你知道嗎？兔子的牙齒會一直長，所以要常常咬東西", "你知道嗎？兔子開心的時候會跳起來在空中扭一下"],
  dango: ["你知道嗎？我是全世界唯一的小團子喔！", "你知道嗎？圓圓的東西最不容易跌倒"],
};
const CHEERS = [
  "做錯事沒關係，下次再試一次就好！",
  "今天也要記得多喝水喔 💧",
  "遇到困難的時候，先深呼吸三次，再想想辦法",
  "謝謝你每天都來看我，我好開心 ❤️",
  "你今天笑了嗎？笑一個給我看！",
  "幫家人做一件小事，大家都會很開心喔",
  "慢慢來比較快，一件一件做就好",
];

// 算出今天要說的話：回傳 { text, kind }
export function composePetMessage({ kid, pet, species, today, responsibilities = [], logs = [], challenges = [], allowanceRules = [] }) {
  const rand = seeded(`${kid.id}|${today}`);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const name = kid.name;
  const candidates = []; // { kind, text, weight }
  const add = (kind, text, weight) => candidates.push({ kind, text, weight });

  // ---- 今日責任（看昨天跟之前，今天的進度還在變，不拿來說） ----
  const total = responsibilities.length;
  const doneOn = (day) => logs.filter((l) => String(l.log_date).slice(0, 10) === day).length;
  if (total > 0) {
    const yesterday = addDays(today, -1);
    const yDone = doneOn(yesterday);
    let streak = 0;
    for (let i = 1; i <= 60 && doneOn(addDays(today, -i)) >= total; i++) streak += 1;
    if (streak >= 2) add("cheer", `已經連續 ${streak} 天把責任全部做完了！${name}好厲害，我們一起保持下去 💪`, 5);
    else if (yDone >= total) add("cheer", `昨天的責任全部做完了！${name}好棒，我都有看到喔 ✨`, 4);
    else if (yDone > 0) add("cheer", `昨天完成了 ${yDone} 件責任，今天要不要試試看全部做完？我幫你加油！`, 3);
    else add("cheer", "今天的責任一件一件慢慢來，做完一件就很棒了！", 1.5);
  }

  // ---- 存錢目標 ----
  const goal = Number(kid.goal_amount) || 0;
  const balance = Number(kid.balance) || 0;
  if (goal > 0 && kid.goal_name) {
    if (balance >= goal) add("goal", `你存的錢已經夠買「${kid.goal_name}」了耶！要不要跟爸爸媽媽討論一下？`, 4);
    else {
      const pct = Math.floor((balance / goal) * 100);
      const remain = Math.ceil(goal - balance);
      if (pct >= 50) add("goal", `「${kid.goal_name}」已經存到 ${pct}% 了，只差 ${remain} 元！`, 2.5);
      else add("goal", `存錢買「${kid.goal_name}」的路上，我會一直幫你加油！現在 ${pct}% 了`, 1.5);
    }
  }

  // ---- 挑戰 ----
  const open = challenges.filter((c) => c.status === "open");
  const going = open.filter((c) => Number(c.target_count) > 1 && Number(c.done_count) > 0);
  if (going.length) {
    const c = pick(going);
    const left = Number(c.target_count) - Number(c.done_count);
    add("challenge", `「${c.name}」挑戰已經 ${c.done_count}/${c.target_count} 了，再 ${left} 次就完成！`, 2.5);
  } else if (open.length) {
    add("challenge", `「${pick(open).name}」挑戰，我覺得你一定做得到！`, 2);
  }

  // ---- 發零用錢的日子 ----
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const payday = allowanceRules.some(
    (r) => r.active !== false && ((r.frequency === "weekly" && Number(r.day_of_week) === weekday) || (r.frequency === "monthly" && Number(r.day_of_month) === d))
  );
  // 特別的日子幾乎一定要說
  if (payday) add("payday", "今天是發零用錢的日子耶！記得留一點存起來喔 💰", 25);

  // ---- 認識幾天了（紀念日） ----
  if (pet?.hatched_at) {
    const together = daysBetween(String(pet.hatched_at).slice(0, 10), today);
    if ([1, 3, 7, 14, 30, 50, 100, 200, 365].includes(together)) {
      add("together", `我們認識 ${together} 天了！謝謝你每天照顧我 ❤️`, 30);
    }
  }

  // ---- 星星 ----
  const stars = Number(kid.character_points) || 0;
  if (stars >= 20) add("stars", `你已經有 ${stars} 顆星星了！要存起來，還是換一個獎勵呢？`, 1);

  // ---- 寵物自己的分享、小知識、加油的話（每天都有機會） ----
  add("share", pick([...SHARES.common, ...(SHARES[species] || [])]), 2.5);
  add("fact", pick([...FACTS.common, ...(FACTS[species] || [])]), 1.5);
  add("cheer", pick(CHEERS), 1.5);

  // 依權重抽一句
  const sum = candidates.reduce((s, c) => s + c.weight, 0);
  let r = rand() * sum;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return { text: c.text, kind: c.kind };
  }
  return candidates[candidates.length - 1];
}

// 今天這句話：第一次算出來就存起來，之後一整天都說同一句（資料變了也不換）
export function todayPetMessage(kidId, today, compose) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY + kidId) || "null");
    if (saved?.date === today && saved.text) return saved;
  } catch {
    /* 讀不到就重算 */
  }
  const fresh = { date: today, ...compose(), read: false };
  try {
    localStorage.setItem(KEY + kidId, JSON.stringify(fresh));
  } catch {
    /* 存不了就算了，下次重算一樣是同一句 */
  }
  return fresh;
}

export function markPetMessageRead(kidId, today) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY + kidId) || "null");
    if (saved?.date === today) localStorage.setItem(KEY + kidId, JSON.stringify({ ...saved, read: true }));
  } catch {
    /* 無痕模式之類的存不了，就每次都當作沒讀 */
  }
}

// 首頁用：今天的話讀過了沒（還沒打開過寵物頁也算沒讀）
export function hasUnreadPetMessage(kidId, today) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY + kidId) || "null");
    return !(saved?.date === today && saved.read);
  } catch {
    return true;
  }
}
