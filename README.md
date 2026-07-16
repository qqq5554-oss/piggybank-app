# 🐷 小小存錢筒（Neon + Vercel 版）

給小朋友使用的家事存錢 App。手機開啟，家長審核，資料雲端同步。

## 架構說明

跟原本 Supabase 版最大的不同：Neon 是純資料庫，沒有像 Supabase 那樣可以讓前端「直連」的公開金鑰機制。所以這個版本多了一層 **後端 API**（`/api` 資料夾），資料庫密碼只存在伺服器端，瀏覽器完全看不到。

```
瀏覽器（小孩/家長手機）
   ↓ 呼叫 fetch("/api/...")
Vercel Serverless Functions（/api）
   ↓ 用 DATABASE_URL 連線（只存在伺服器端）
Neon Postgres 資料庫
```

即時同步也不一樣：Supabase 有內建 Realtime，Neon 沒有，改用**輪詢**（每 4 秒重新抓一次資料），家長審核後小孩手機幾秒內會自動更新。

## 資料夾結構

```
piggybank-app/
├── api/                          # 後端 API（Vercel Serverless Functions）
│   ├── data.js                   # GET：讀取所有小孩/家事/待審核資料
│   ├── transactions.js           # GET：讀取單一小孩的交易紀錄
│   └── action.js                 # POST：所有寫入操作（審核、加減錢、管理帳戶等）
│                                  #        家長專屬操作會在這裡驗證 PIN
├── neon/schema.sql               # Neon 資料庫結構，第一次要手動執行一次
├── src/
│   ├── App.jsx                   # 畫面路由，管理已驗證的家長 PIN
│   ├── api/client.js             # 前端統一呼叫後端 API 的入口
│   ├── hooks/useKidsData.js      # 輪詢讀取資料（取代 Supabase Realtime）
│   ├── components/               # 同前版本（HomeScreen / KidDetailScreen / ParentDashboard...）
│   └── utils/format.js
├── .env.example                  # 本機開發用環境變數範例
├── vercel.json
├── package.json
└── vite.config.js
```

## 設定步驟

### 1. Neon 資料庫（你已經建好 project 了）

到 Neon 專案的 **SQL Editor**，貼上 `neon/schema.sql` 整份內容並執行。

⚠️ 你先前貼出的連線字串包含明碼密碼，建議到 Neon Dashboard > Settings > Reset password 重新產生一組。

### 2. 本機開發

```bash
cd piggybank-app
npm install
cp .env.example .env
# 打開 .env，貼上 Neon 的 Connection string（重設過密碼後的新版本）
```

本機測試 API 需要 Vercel CLI（因為 `/api` 是 Serverless Functions，單純 `vite dev` 跑不動它）：

```bash
npm install -g vercel
vercel dev
```

### 3. 部署到 Vercel

1. 把專案 push 到 GitHub repo
2. 到 [vercel.com](https://vercel.com) 用 GitHub 登入，選擇 **Import Project**，選這個 repo
3. Framework 會自動偵測為 Vite，不用改
4. 在 **Environment Variables** 新增：
   - `DATABASE_URL` = 你的 Neon 連線字串
5. 點 **Deploy**，等 1-2 分鐘
6. 完成後會拿到一個網址，例如 `https://piggybank-app.vercel.app`

之後每次 `git push` 到 main，Vercel 會自動重新部署。

### 4. 小朋友手機加到主畫面

用手機瀏覽器打開網址 → 分享 / 選單 → 加入主畫面，就會有 App 圖示可以直接點開。

## 家長預設密碼

首次使用密碼是 `0000`，強烈建議進入家長模式後立刻在「設定」分頁修改。

## 之後可以做的事

- 用 Claude Design 微調視覺風格
- 目標達成推播提醒
- 週報/月報摘要匯出
