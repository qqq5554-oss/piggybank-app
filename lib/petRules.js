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
