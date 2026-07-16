import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 部署在 Vercel，網站根目錄就是 /，不像 GitHub Pages 需要設定 base 路徑
export default defineConfig({
  plugins: [react()],
});
