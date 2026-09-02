// 依權重抽一個索引出來：weight 就是「這格佔幾份」，份數多的比較容易中。
// 抽出 lib 是為了可以單獨測試分佈對不對。
export function pickWeightedIndex(weights, rng = Math.random) {
  const safe = weights.map((w) => Math.max(0, Number(w) || 0));
  const total = safe.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(rng() * safe.length); // 全部是 0 就平均抽

  let r = rng() * total;
  for (let i = 0; i < safe.length; i++) {
    r -= safe[i];
    if (r <= 0) return i;
  }
  return safe.length - 1;
}
