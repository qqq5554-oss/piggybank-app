// 小寵物的規則：前端（顯示）和後端（真的扣星星、算飽足度）共用同一份，
// 數字只要改這裡兩邊就一致。

// 食物菜單：價錢是責任值星星，fill 是吃了會增加多少飽足度（滿分 100）
export const PET_FOODS = [
  { id: "rice", name: "飯糰", emoji: "🍙", cost: 1, fill: 20 },
  { id: "meat", name: "肉排", emoji: "🍖", cost: 2, fill: 45 },
  { id: "cake", name: "蛋糕", emoji: "🍰", cost: 3, fill: 70 },
];

// 從全飽到完全餓扁大約 48 小時：漏一天不會餓壞，但每天都要記得餵
export const PET_DECAY_PER_HOUR = 100 / 48;

// 飽足度高於這個值就吃不下了，避免一直按、把星星浪費掉
export const PET_TOO_FULL = 90;

// 每次餵食有這個機率撿到星星送給小主人
export const PET_RANDOM_GIFT_CHANCE = 0.1;

// 資料庫存的是「fullness_at 那一刻的飽足度」，現在的值要扣掉經過的時間
export function currentFullness(fullness, fullnessAt, now = Date.now()) {
  const at = typeof fullnessAt === "string" ? Date.parse(fullnessAt) : Number(fullnessAt);
  if (!Number.isFinite(at)) return Number(fullness) || 0;
  const hours = Math.max(0, (now - at) / 3600000);
  return Math.max(0, Math.min(100, (Number(fullness) || 0) - PET_DECAY_PER_HOUR * hours));
}

// 5 顆愛心，每顆 20；只要還有一點點就算一顆，0 才是全空
export const heartsOf = (f) => Math.min(5, Math.ceil(Math.max(0, f) / 20));

// 給畫面用的心情
export function moodOf(f) {
  if (f <= 0) return "starving";
  if (f < 30) return "hungry";
  if (f >= 70) return "happy";
  return "normal";
}

// 三種寵物（圖在 src/components/pet/sprites.js）
export const PET_SPECIES = {
  hedgehog: { name: "刺蝟", defaultName: "刺刺", blurb: "頭上都是刺，難過的時候會縮成一顆球" },
  rabbit: { name: "兔子", defaultName: "兔兔", blurb: "兩隻長耳朵，難過的時候耳朵會垂下來" },
  dango: { name: "小團子", defaultName: "小團子", blurb: "圓滾滾的，頭上有一根小芽" },
};
export const PET_DEFAULT_NAMES = Object.values(PET_SPECIES).map((s) => s.defaultName);

// 蛋要點幾下（幫牠取暖）才會孵出來
export const PET_HATCH_TAPS = 8;

// 寵物現在在哪個階段：
// - choose：還沒選蛋
// - egg：選好了，還是一顆蛋
// - hatched：孵出來了
// species 欄位整個不存在（新的 SQL 還沒跑）時，當作原本那隻已經孵出來的小團子
export function petStage(pet) {
  if (!pet) return { stage: "choose", species: null };
  if (!("species" in pet)) return { stage: "hatched", species: "dango" };
  if (!pet.species) return { stage: "choose", species: null };
  if (!pet.hatched_at) return { stage: "egg", species: pet.species };
  return { stage: "hatched", species: pet.species };
}

// 點了幾下 → 蛋殼裂到第幾階段（0～3）
export const crackOf = (taps) => Math.min(3, Math.floor((taps / PET_HATCH_TAPS) * 4));
