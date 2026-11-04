// 寵物每天想跟小主人說的一句話。
// 從小孩真的資料挑最相關的（昨天責任有沒有做完、存錢目標、挑戰進度、
// 發零用錢的日子、認識幾天了…），再混很多小知識、鼓勵的話和寵物的日常分享。
//
// 不重複的做法：
// 1. 小知識、鼓勵、分享這些清單，每個小孩有自己的「洗牌順序」，
//    一天往下走一格，整份清單輪完一圈才會再看到同一句。
// 2. 另外記住最近說過的話（存在這支手機），抽的時候先跳過。
// 同一個小孩同一天挑到的永遠一樣（用日期當種子），重新整理不會換一句。

const KEY = "piggybank_pet_msg_";
const HIST_KEY = "piggybank_pet_hist_";
const HIST_MAX = 150;

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

// 用種子洗牌（同一個種子永遠洗出同樣的順序）
function shuffled(arr, seed) {
  const rand = seeded(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const daysBetween = (fromIso, toIso) => Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000);
const dayNumber = (iso) => Math.round(Date.parse(iso) / 86400000);

// ---------------- 寵物的日常分享 ----------------
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
    "我今天數天上的星星，數到一百就睡著了 ⭐",
    "我把我的玩具排成一排，看起來好整齊喔",
    "今天下了一點點雨，我在窗邊聽雨聲，滴答滴答",
    "我剛剛照鏡子，發現我今天特別可愛",
    "我今天洗了一個香香的澡 🛁 泡泡好多！",
    "我在想你現在在做什麼呢？",
    "我今天跟一隻小鳥打招呼，牠也對我叫了一聲",
    "我剛剛打了一個好大的哈欠，嘴巴張得跟球一樣大",
    "我今天練習站一隻腳，站了三秒鐘喔！",
    "我覺得今天的天空藍得好漂亮",
    "我剛剛玩遊戲贏了，好開心 🎮",
    "我今天把房間的角落都探險了一遍",
    "我發現影子會跟著我走，我走它也走！",
    "我今天吃飯吃得很乾淨，一粒都沒剩",
    "我剛剛想到一個好笑的笑話，可是笑到忘記了",
    "我今天在地上找到一片好漂亮的葉子 🍂",
    "我覺得跟你在一起的每一天都好好玩",
  ],
  hedgehog: [
    "我今天把身上的刺梳得整整齊齊的！",
    "我剛剛縮成一顆球滾下小山坡，好好玩！",
    "我的鼻子很靈喔，你今天吃了什麼我都聞得出來 👃",
    "我今天找到一顆圓圓的果子，滾著它回家",
    "我的刺看起來很兇，其實我很溫柔的",
    "我今天在落葉堆裡鑽來鑽去，沙沙沙好好聽",
    "我剛剛伸懶腰，刺全部都豎起來了，嚇了自己一跳",
    "我最喜歡被你摸摸頭，小心不要碰到刺喔",
  ],
  rabbit: [
    "我今天跳得好高好高，差點碰到雲！",
    "我的耳朵可以聽到很遠的聲音，我聽到你在努力喔！",
    "我今天吃了一根好脆的紅蘿蔔 🥕",
    "我剛剛在草地上跑了好幾圈，風都追不上我",
    "我今天把耳朵洗得乾乾淨淨的",
    "我剛剛開心到在空中轉了一圈！",
    "我今天挖了一個小洞洞，好舒服",
    "我的鼻子一直動一直動，因為我在聞好吃的味道",
  ],
  dango: [
    "我頭上的小芽好像又長高了一點點！",
    "我今天吹了一個好大的泡泡，飛到天上去了",
    "我今天滾來滾去，變得更圓了一點點",
    "我今天在陽光下曬了一下，暖呼呼的",
    "我的小芽今天跟風打招呼，搖來搖去",
    "我剛剛跳了一下，彈得好高喔",
  ],
};

// ---------------- 小知識 ----------------
const FACTS = {
  common: [
    "章魚有三顆心臟，而且牠的血是藍色的！🐙",
    "蜂鳥是唯一可以倒著飛的鳥",
    "海獺睡覺的時候會手牽手，才不會被水沖走",
    "有些企鵝會送小石頭給喜歡的朋友",
    "長頸鹿的舌頭是深紫色的，長度差不多跟你的手臂一樣長！",
    "無尾熊一天要睡將近 20 個小時 🐨",
    "蜜蜂會跳舞，告訴同伴哪裡有花蜜 🐝",
    "每隻斑馬身上的條紋都不一樣，就像我們的指紋",
    "海星沒有大腦，可是牠還是會走路",
    "北極熊的皮膚其實是黑色的，毛是透明的！🐻‍❄️",
    "蝴蝶是用腳來嚐味道的 🦋",
    "樹懶大約一個禮拜才下樹上一次廁所",
    "鯨鯊是世界上最大的魚，可是牠只吃很小很小的浮游生物",
    "藍鯨是地球上有史以來最大的動物，比恐龍還大！🐋",
    "海豚睡覺的時候，一半的腦袋在休息，另一半還醒著",
    "鴕鳥的眼睛比牠的腦袋還要大",
    "貓頭鷹的頭可以轉大約 270 度，差不多可以看到自己背後 🦉",
    "變色龍的舌頭伸出來，可以跟牠的身體一樣長",
    "螞蟻可以舉起比自己重很多很多倍的東西 🐜",
    "蜻蜓的大眼睛幾乎可以看到四面八方",
    "海獺有自己最喜歡的石頭，會收在胳肢窩下面的小口袋裡",
    "河馬流的汗是紅紅的，像天然的防曬乳",
    "袋鼠寶寶剛出生的時候，只有一顆軟糖那麼大 🦘",
    "鯊魚比恐龍還早出現在地球上",
    "蜘蛛絲比同樣粗細的鋼還要強韌 🕸️",
    "鴨嘴獸是會生蛋的哺乳動物",
    "海馬是由爸爸懷寶寶的！",
    "紅鶴是粉紅色的，是因為牠吃的蝦子和藻類",
    "蜂鳥一秒鐘可以拍翅膀好幾十下",
    "青蛙可以用皮膚喝水 🐸",
    "蟋蟀的耳朵長在腳上",
    "蚯蚓沒有眼睛，可是牠感覺得到光",
    "狗狗的鼻子比人靈敏好多好多倍 🐶",
    "每隻狗狗的鼻子紋路都不一樣，就像人的指紋",
    "貓咪一天大約要睡十幾個小時 🐱",
    "企鵝不會飛，可是牠們是游泳高手 🐧",
    "水母已經在地球上生活好幾億年了",
    "台灣黑熊胸前有一個 V 字形的白毛，像戴了一條項鍊",
    "台灣藍鵲是只有台灣才有的鳥，尾巴又長又漂亮",
    "台灣的玉山是東北亞最高的山 ⛰️",
    "太陽好大好大，裡面可以裝進一百萬個以上的地球 ☀️",
    "月亮每年都會離地球遠一點點，大約 4 公分",
    "在太空裡哭的話，眼淚不會往下掉，會黏在眼睛旁邊",
    "金星的一天比它的一年還要長",
    "木星是太陽系裡最大的行星 🪐",
    "土星很輕，如果有一個夠大的浴缸，它可以浮在水上！",
    "陽光從太陽跑到地球，大約要 8 分鐘",
    "一道閃電比太陽的表面還要熱 ⚡",
    "彩虹其實是圓形的，坐在飛機上有機會看到一整圈 🌈",
    "雪花幾乎都是六個角的 ❄️",
    "地球上大部分的水都是海水，可以喝的水其實很少，要好好珍惜 💧",
    "冰山大部分都藏在水面下，只露出一點點",
    "蜂蜜可以放好久好久都不會壞 🍯",
    "香蕉其實算是一種莓果，草莓反而不是！🍌",
    "很久以前，很多胡蘿蔔是紫色或黃色的 🥕",
    "番茄其實是水果喔 🍅",
    "竹子是長得最快的植物之一，有的一天可以長快要一公尺 🎋",
    "向日葵小時候會跟著太陽轉頭 🌻",
    "樹的年輪一圈代表一年，數一數就知道它幾歲",
    "含羞草被碰到，葉子就會害羞地合起來",
    "仙人掌的刺其實是它的葉子 🌵",
    "打噴嚏的時候，眼睛會自動閉起來",
    "小寶寶的骨頭比大人還要多，長大的時候有些會黏在一起",
    "我們的心臟一天大約跳十萬次 ❤️",
    "睡覺的時候身體會偷偷長大，所以早點睡很重要 😴",
    "睡覺的時候，腦袋會把今天學到的東西整理好收起來",
    "笑會傳染，你看到別人笑，自己也很容易跟著笑 😄",
    "手指甲長得比腳趾甲還要快",
    "我們一天大約眨眼一萬多次 👀",
    "世界上有超過七千種語言",
    "紙是在中國發明的，已經有快要兩千年了",
    "錢放在銀行會慢慢長出利息，就像種子慢慢長成小樹 🌱",
  ],
  hedgehog: [
    "刺蝟身上大約有五千根刺！",
    "刺蝟其實晚上比較有精神，可是我想跟你一樣早睡早起",
    "刺蝟寶寶剛出生的時候，刺是軟軟的",
    "刺蝟的鼻子很靈，是靠聞味道找食物的",
  ],
  rabbit: [
    "兔子的牙齒會一直長，所以要常常咬東西",
    "兔子開心的時候會跳起來在空中扭一下",
    "兔子的眼睛長在兩邊，幾乎可以看到自己後面",
    "兔子的耳朵可以分開轉，一隻聽前面、一隻聽後面",
  ],
  dango: [
    "我是全世界唯一的小團子喔！",
    "圓圓的東西最不容易跌倒",
    "小團子的小芽喜歡曬太陽，就跟植物一樣",
  ],
};

// ---------------- 鼓勵的話 ----------------
const CHEERS = [
  "做錯事沒關係，下次再試一次就好！",
  "今天也要記得多喝水喔 💧",
  "遇到困難的時候，先深呼吸三次，再想想辦法",
  "謝謝你每天都來看我，我好開心 ❤️",
  "你今天笑了嗎？笑一個給我看！",
  "幫家人做一件小事，大家都會很開心喔",
  "慢慢來比較快，一件一件做就好",
  "不會的事情不用怕，每個厲害的人都是從不會開始的",
  "你比你自己想的還要勇敢 💪",
  "今天試試看說三次「謝謝」，會有好事發生喔",
  "累了就休息一下，休息完會更有力氣",
  "跟朋友吵架的話，先說對不起的人最勇敢",
  "我最喜歡認真的你了！",
  "就算今天不太順利，明天又是新的一天 🌅",
  "你願意試試看，就已經很棒了",
  "每天進步一點點，一年後就會進步好多好多",
  "記得要好好刷牙，牙齒才會亮晶晶 ✨",
  "今天要不要給家人一個大大的擁抱？🤗",
  "生氣的時候可以先數到十，再說話",
  "你是獨一無二的，沒有人跟你一模一樣",
  "說好的事情要做到，這叫做守信用，很帥喔",
  "把自己的東西收好，找東西就不用找好久",
  "看書可以去好多好多地方旅行 📚",
  "今天有沒有幫助別人？一件小事也算喔",
  "早點睡覺，明天才有精神玩 🌙",
  "輸了也沒關係，好好玩最重要",
  "你努力的樣子，我都有看到喔",
  "想哭的時候就哭吧，哭完會舒服一點",
  "遇到不懂的事，問問題一點都不丟臉",
  "多吃青菜，身體會變得超有力 🥦",
  "你今天的努力，是給明天的自己最好的禮物 🎁",
  "先把該做的事做完，玩起來會更開心",
  "對自己說一聲：我可以的！",
  "好朋友就是會互相幫忙的人",
  "每一顆星星都是你努力換來的，好棒！⭐",
  "存錢就像種樹，要耐心等它慢慢長大 🌳",
  "想要的東西，可以先想一想：是真的需要，還是只是想要？",
  "今天也謝謝你照顧我，你是最棒的小主人",
  "跌倒了就爬起來，拍拍灰塵再出發",
  "用心做一件事，比急急忙忙做很多件更厲害",
  "分享會讓快樂變成兩倍喔",
  "記得出去走走、曬曬太陽 ☀️",
  "專心的時候，你超級厲害的",
  "不管發生什麼事，我都會在這裡陪你",
  "今天有沒有說「我愛你」？說給家人聽吧 💕",
];

// 從清單挑今天的一句：每個小孩、每種清單各自洗牌，一天往下一格，
// 一圈輪完才換新的洗牌順序；最近說過的會跳過。
function pickFromPool(pool, { kidId, name, day, recent }) {
  const n = pool.length;
  const cycle = Math.floor(day / n);
  const order = shuffled(pool, `${kidId}|${name}|${cycle}`);
  const start = ((day % n) + n) % n;
  let oldest = order[start];
  for (let i = 0; i < n; i++) {
    const text = order[(start + i) % n];
    if (!recent.has(text)) return text;
    if (recent.get(text) < recent.get(oldest)) oldest = text;
  }
  return oldest; // 全部都說過了，就挑最久以前說的那句
}

// 算出今天要說的話：回傳 { text, kind }
// recent：最近說過的話（Map：句子 → 說的日期），會盡量避開
export function composePetMessage({ kid, pet, species, today, responsibilities = [], logs = [], challenges = [], allowanceRules = [], recent = new Map() }) {
  const rand = seeded(`${kid.id}|${today}`);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const day = dayNumber(today);
  const fromPool = (name, pool) => pickFromPool(pool, { kidId: kid.id, name, day, recent });
  const name = kid.name;
  const candidates = []; // { kind, text, weight }
  const add = (kind, text, weight) => candidates.push({ kind, text, weight });
  // 同一種情況有好幾種說法，輪流用
  const variant = (key, list) => fromPool(`v:${key}`, list);

  // ---- 今日責任（看昨天跟之前，今天的進度還在變，不拿來說） ----
  const total = responsibilities.length;
  const doneOn = (d) => logs.filter((l) => String(l.log_date).slice(0, 10) === d).length;
  if (total > 0) {
    const yesterday = addDays(today, -1);
    const yDone = doneOn(yesterday);
    let streak = 0;
    for (let i = 1; i <= 60 && doneOn(addDays(today, -i)) >= total; i++) streak += 1;
    if (streak >= 2) {
      add("cheer", variant("streak", [
        `已經連續 ${streak} 天把責任全部做完了！${name}好厲害，我們一起保持下去 💪`,
        `連續 ${streak} 天都做完責任耶！我要把這件事告訴全世界 📣`,
        `${streak} 天沒有中斷過！${name}是說到做到的人`,
        `連續第 ${streak} 天了，你的毅力比我的刺還要堅強！`,
      ]), 3);
    } else if (yDone >= total) {
      add("cheer", variant("yAll", [
        `昨天的責任全部做完了！${name}好棒，我都有看到喔 ✨`,
        `昨天每一件責任都完成了，今天也一起加油吧！`,
        `昨天的你超認真的，我好驕傲 🥰`,
      ]), 2.5);
    } else if (yDone > 0) {
      add("cheer", variant("ySome", [
        `昨天完成了 ${yDone} 件責任，今天要不要試試看全部做完？我幫你加油！`,
        `昨天差一點點就全部做完了，今天一定可以！`,
        `昨天做了 ${yDone} 件，今天我們挑戰全部完成好不好？`,
      ]), 2);
    } else {
      add("cheer", variant("yNone", [
        "今天的責任一件一件慢慢來，做完一件就很棒了！",
        "今天做完責任，就可以餵我吃好吃的了，我等你喔 😋",
        "我們今天一起把責任做完，好不好？",
      ]), 1);
    }
  }

  // ---- 存錢目標 ----
  const goal = Number(kid.goal_amount) || 0;
  const balance = Number(kid.balance) || 0;
  if (goal > 0 && kid.goal_name) {
    if (balance >= goal) add("goal", `你存的錢已經夠買「${kid.goal_name}」了耶！要不要跟爸爸媽媽討論一下？`, 3);
    else {
      const pct = Math.floor((balance / goal) * 100);
      const remain = Math.ceil(goal - balance);
      if (pct >= 50) add("goal", `「${kid.goal_name}」已經存到 ${pct}% 了，只差 ${remain} 元！`, 2);
      else add("goal", `存錢買「${kid.goal_name}」的路上，我會一直幫你加油！現在 ${pct}% 了`, 1);
    }
  }

  // ---- 挑戰 ----
  const open = challenges.filter((c) => c.status === "open");
  const going = open.filter((c) => Number(c.target_count) > 1 && Number(c.done_count) > 0);
  if (going.length) {
    const c = pick(going);
    const left = Number(c.target_count) - Number(c.done_count);
    add("challenge", `「${c.name}」挑戰已經 ${c.done_count}/${c.target_count} 了，再 ${left} 次就完成！`, 1.5);
  } else if (open.length) {
    add("challenge", `「${pick(open).name}」挑戰，我覺得你一定做得到！`, 1);
  }

  // ---- 發零用錢的日子 ----
  const [y, m, d] = today.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const payday = allowanceRules.some(
    (r) => r.active !== false && ((r.frequency === "weekly" && Number(r.day_of_week) === weekday) || (r.frequency === "monthly" && Number(r.day_of_month) === d))
  );
  // 特別的日子幾乎一定要說
  if (payday) {
    add("payday", variant("payday", [
      "今天是發零用錢的日子耶！記得留一點存起來喔 💰",
      "零用錢來囉！先存一點，剩下的再好好想怎麼用 🐷",
      "今天發零用錢！要不要先想想，最想存錢買什麼呢？",
      "叮咚～零用錢到了！小豬撲滿說它肚子餓了，餵它一點吧 🐽",
      "又到了發零用錢的日子！買東西之前，先問問自己：真的需要嗎？",
      "今天有零用錢喔！存下來的錢，會慢慢長出利息 🌱",
      "零用錢日快樂！把錢分成「要存的」和「可以用的」，你就是理財小高手",
      "今天發零用錢～離你的存錢目標又近了一步！",
    ]), 25);
  }

  // ---- 認識幾天了（紀念日） ----
  if (pet?.hatched_at) {
    const together = daysBetween(String(pet.hatched_at).slice(0, 10), today);
    if ([1, 3, 7, 14, 30, 50, 100, 200, 365].includes(together)) {
      add("together", `我們認識 ${together} 天了！謝謝你每天照顧我 ❤️`, 30);
    }
  }

  // ---- 星星 ----
  const stars = Number(kid.character_points) || 0;
  if (stars >= 20) add("stars", `你已經有 ${stars} 顆星星了！要存起來，還是換一個獎勵呢？`, 0.5);

  // ---- 寵物自己的分享、小知識、鼓勵的話（每天都有機會，小知識和鼓勵最常出現） ----
  add("share", fromPool(`share:${species}`, [...SHARES.common, ...(SHARES[species] || [])]), 2.5);
  add("fact", "你知道嗎？" + fromPool(`fact:${species}`, [...FACTS.common, ...(FACTS[species] || [])]), 3.5);
  add("cheer", fromPool("cheer", CHEERS), 3);

  // 最近說過的整句先拿掉（全部都說過就不管了）；
  // 發零用錢、紀念日是特別的日子，說過也照樣要說
  const fresh = candidates.filter((c) => c.kind === "payday" || c.kind === "together" || !recent.has(c.text));
  const pool = fresh.length ? fresh : candidates;

  // 依權重抽一句
  const sum = pool.reduce((s, c) => s + c.weight, 0);
  let r = rand() * sum;
  for (const c of pool) {
    r -= c.weight;
    if (r <= 0) return { text: c.text, kind: c.kind };
  }
  return pool[pool.length - 1];
}

const readHistory = (kidId) => {
  try {
    const list = JSON.parse(localStorage.getItem(HIST_KEY + kidId) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

// 今天這句話：第一次算出來就存起來，之後一整天都說同一句（資料變了也不換）
// compose(recent) 會拿到最近說過的話，用來避開重複
export function todayPetMessage(kidId, today, compose) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY + kidId) || "null");
    if (saved?.date === today && saved.text) return saved;
  } catch {
    /* 讀不到就重算 */
  }
  const history = readHistory(kidId);
  const fresh = { date: today, ...compose(new Map(history.map((h) => [h.text, h.date]))), read: false };
  try {
    localStorage.setItem(KEY + kidId, JSON.stringify(fresh));
    const next = [...history.filter((h) => h.date !== today), { date: today, text: fresh.text }].slice(-HIST_MAX);
    localStorage.setItem(HIST_KEY + kidId, JSON.stringify(next));
  } catch {
    /* 存不了就算了，靠洗牌順序一樣不太會重複 */
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
