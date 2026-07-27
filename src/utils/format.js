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
