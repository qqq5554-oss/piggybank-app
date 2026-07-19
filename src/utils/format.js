export const currency = (n) => `NT$${Math.round(n).toLocaleString()}`;

export const formatDate = (iso) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
};

export const KID_THEMES = [
  { id: "peach", name: "蜜桃", bg: "#FFEDE1", accent: "#FF8B5E", accentDark: "#E86A3A", light: "#FFF6F0" },
  { id: "mint", name: "薄荷", bg: "#E3F6ED", accent: "#3DB88A", accentDark: "#2A9670", light: "#F1FBF6" },
  { id: "sky", name: "天空", bg: "#E5F1FC", accent: "#4A90E2", accentDark: "#3170C4", light: "#F2F8FE" },
];

export const AVATARS = ["🐶", "🐱", "🐰", "🦊", "🐼", "🦁", "🐨", "🐯", "🐸"];

export const themeOf = (id) => KID_THEMES.find((t) => t.id === id) || KID_THEMES[0];

// 從打卡紀錄計算連續完成天數：某一天要所有責任項目都打卡才算完成的一天
// today 一律用資料庫伺服器認定的「今天」（YYYY-MM-DD 字串）往回推，
// 不用瀏覽器的 new Date()，避免裝置時區跟資料庫時區對不起來。
export function computeStreak(responsibilityLogs, totalCount, today) {
  if (!totalCount || !today) return 0;
  const counts = {};
  responsibilityLogs.forEach((l) => {
    counts[l.log_date] = (counts[l.log_date] || 0) + 1;
  });
  let streak = 0;
  const d = new Date(`${today}T00:00:00Z`);
  for (;;) {
    const key = d.toISOString().slice(0, 10);
    if ((counts[key] || 0) >= totalCount) {
      streak++;
      d.setUTCDate(d.getUTCDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
