# 步步搬家 Bubu Moving 官網

品牌官網 + 詢價預約 + 營運後台（名單、報價、商品、文章、案例、評價、照片、權限）。

技術：Next.js 16（App Router）/ React 19 / Vercel / Supabase PostgreSQL。

## 本機開發

需求：Node.js >= 22.13、一個 PostgreSQL（本機或 Supabase）。

```sh
npm ci
cp .env.example .env    # 填入 DATABASE_URL、BUBU_ADMIN_EMAILS、ADMIN_PASSWORD、SESSION_SECRET
npm run dev             # http://localhost:3000
```

資料表不需手動建立：第一次連線時會自動在 `bubu` schema 套用 `migrations/index.ts`（以 advisory lock 避免重複執行）。新增欄位或資料表時，在 `migrations/index.ts` 最後加一個新版本即可。

測試（會清空並重建 `TEST_DATABASE_URL` 的 `bubu` schema，請勿指向正式資料庫）：

```sh
TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres node tests/quotes.test.mjs
```

另有 photos / commerce / reviews 測試。

## 架構重點

- `lib/pg-d1.ts`：以 PostgreSQL 提供與 Cloudflare D1 相同的 `prepare/bind/first/all/run/batch` 介面（`?` 參數、`changes()`、表名自動加上 `bubu.`），路由中的 SQL 維持原寫法。
- 上傳照片以 bytea 存在 `bubu.media_blobs`，經 `/api/media/[id]` 輸出（單張上限 4 MB）。
- DB 無法連線時，官網頁面會改用程式內建的服務與文章內容，不會整站錯誤。

## 後台登入

`/admin/login` 以「信箱 + 管理密碼」登入：

- `BUBU_ADMIN_EMAILS`：擁有者信箱（逗號分隔）。
- 其他成員由擁有者在後台「帳號與權限」新增（admin / sales / editor）。
- 所有人共用 `ADMIN_PASSWORD`；登入後以 `SESSION_SECRET` 簽章的 HttpOnly cookie 維持 7 天。
- 任一設定空白時，後台一律拒絕存取。

## 部署（GitHub + Vercel）

Vercel 專案 `bubu-moving` 已連結此 GitHub repo，push 到 `main` 即自動部署。環境變數在 Vercel → Settings → Environment Variables 設定（見 `.env.example`），修改後需重新部署。函式區域設在 `syd1`，與 Supabase（Sydney）同區。

綠界金流與主訂單系統串接預設關閉，設定方式見 `docs/payment-setup.md`、`docs/order-integration.md`。開發沿革見 `docs/development-history.md`。
