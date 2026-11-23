// 小寵物的規則：前端（顯示）和後端共用同一份，
// 數字只要改這裡兩邊就一致。

// 睡覺時間：晚上 9:45 到早上 7 點（用裝置的時間）
export const PET_SLEEP_LABEL = "晚上 9:45 到早上 7 點";
export function isPetSleepTime(d = new Date()) {
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= 21 * 60 + 45 || m < 7 * 60;
}

// 三種寵物（圖在 src/components/pet/sprites.js）
export const PET_SPECIES = {
  hedgehog: { name: "刺蝟", defaultName: "刺刺", blurb: "頭上都是刺，最喜歡縮成一顆球滾來滾去" },
  rabbit: { name: "兔子", defaultName: "兔兔", blurb: "兩隻長耳朵，最會跳高高" },
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
