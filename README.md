# 步步搬家 Bubu Moving 官網

品牌官網 + 詢價預約 + 營運後台（名單、報價、商品、文章、案例、評價、照片、權限）。

技術：Vinext（Next.js App Router 相容）/ React 19 / Cloudflare Workers / D1（資料庫）/ R2（圖片）。

## 本機開發

需求：Node.js >= 22.13。

```sh
npm ci
cp .env.example .env          # 填入 BUBU_ADMIN_EMAILS、ADMIN_PASSWORD、SESSION_SECRET
npm run db:migrate:local      # 建立本機 D1 資料表
npm run dev                   # http://localhost:5173
```

> 注意：專案路徑若含 emoji 等特殊字元，本機 D1（Miniflare）會出錯，請放在一般英數路徑下。

測試：`node tests/quotes.test.mjs`（另有 photos / commerce / reviews）。

## 後台登入

`/admin/login` 以「信箱 + 管理密碼」登入：

- `BUBU_ADMIN_EMAILS`：擁有者信箱（逗號分隔）。
- 其他成員由擁有者在後台「帳號與權限」新增（admin / sales / editor）。
- 所有人共用 `ADMIN_PASSWORD`；登入後以 `SESSION_SECRET` 簽章的 HttpOnly cookie 維持 7 天。
- 任一設定空白時，後台一律拒絕存取。

## 部署到 Cloudflare

Cloudflare 資源設定集中在 `cloudflare.json`。首次部署：

```sh
npx wrangler login
npx wrangler d1 create bubu-moving-db        # 把回傳的 database_id 填入 cloudflare.json
npx wrangler r2 bucket create bubu-moving-media
npm run db:migrate:remote
npm run deploy
npx wrangler secret put BUBU_ADMIN_EMAILS --name bubu-moving
npx wrangler secret put ADMIN_PASSWORD --name bubu-moving
npx wrangler secret put SESSION_SECRET --name bubu-moving
```

之後更新只要 `npm run deploy`；有新的 `drizzle/` migration 時先跑 `npm run db:migrate:remote`。

綠界金流與主訂單系統串接預設關閉，設定方式見 `docs/payment-setup.md`、`docs/order-integration.md`。
開發沿革見 `docs/development-history.md`。
