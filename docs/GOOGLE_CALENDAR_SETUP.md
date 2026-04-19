# Google Calendar 雙向同步 — 設定指南

## 概覽

- **推送方向**（Supabase → Google Calendar）：預約建立/修改/取消會自動建立或更新 GCal event
- **反向方向**（Google Calendar → Supabase）：在 GCal 修改或刪除 event 會透過 webhook 同步回來

---

## 準備階段：Google Cloud Console

### 1. 建立專案

1. 到 https://console.cloud.google.com/
2. 頂部選單建立新專案（名稱隨意，例如「步步搬家-GCal-Sync」）

### 2. 啟用 Google Calendar API

1. 左側選單 → **APIs & Services** → **Library**
2. 搜尋 `Google Calendar API`
3. 點入 → **Enable**

### 3. 設定 OAuth consent screen

1. **APIs & Services** → **OAuth consent screen**
2. User Type 選 **External** → Create
3. 填寫：
   - App name：**步步搬家 BuBu Moving**
   - User support email：你的 email
   - Developer contact：你的 email
4. 下一步 Scopes：點 **Add or remove scopes** → 勾選：
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
5. 下一步 Test users：加上會授權的 Google 帳號
6. 完成 → 回 Dashboard → 可點 **Publish App**（若要正式上線，否則保持 testing 模式）

### 4. 建立 OAuth 2.0 Client ID

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Application type 選 **Web application**
3. Name：`步步搬家 Web`
4. **Authorized redirect URIs**：加上
   ```
   https://bubu-moving.com.tw/admin/settings
   ```
5. **Create** → 看到 Client ID + Client Secret，**複製保存**

---

## Supabase 設定

### 5. 設定 Function Secrets

到 https://supabase.com/dashboard/project/nncqqbzgercubtzlunyl/settings/functions

加上三個 Secret：
| Name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | 步驟 4 拿到的 Client ID |
| `GOOGLE_CLIENT_SECRET` | 步驟 4 拿到的 Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://bubu-moving.com.tw/admin/settings` |

### 6. 執行 SQL migration

到 Supabase SQL Editor 執行：
`supabase/migrations/add_google_calendar_integration.sql`

（也可直接複製下面內容執行）

```sql
-- 見 migration 檔內容
```

### 7. 部署 Edge Functions

在 terminal：

```bash
cd "/Users/hey.nj/Downloads/📎步步搬家/步步搬家-bubu-moving-code"
supabase functions deploy gcal-oauth --no-verify-jwt
supabase functions deploy gcal-sync-booking --no-verify-jwt
supabase functions deploy gcal-webhook --no-verify-jwt
```

---

## 啟用連線

### 8. 後台連線

1. 後台 → **系統設定** → 「Google Calendar 雙向同步」區塊
2. 點 **連線 Google Calendar**
3. 導向 Google 授權頁 → 選要同步的帳號 → 允許
4. 回到設定頁 → 看到「已連線」綠色提示

---

## 反向同步（webhook）— 進階設定

**本階段推送方向已完整生效**。若要啟用 webhook 讓 GCal 變動自動同步回系統，需要額外步驟：

1. Webhook 接收 URL：`https://nncqqbzgercubtzlunyl.supabase.co/functions/v1/gcal-webhook`
2. 需要透過 Google Calendar API 的 `events.watch` 註冊 watch channel
3. 建議做法：建立一個定期執行的 cron / Supabase scheduled function，每 7 天 renew 一次 watch（Google 限制最長 7 天）

實作這個 watch renewal 較複雜，建議等推送方向運作穩定後，告訴我，我再加上：
- 自動 register watch channel
- 每日 cron 檢查並 renew

---

## 測試

連線後：
- [ ] 後台新增預約 → 幾秒內在 Google Calendar 看到 event
- [ ] 在後台改預約時段 → GCal event 跟著改
- [ ] 在後台刪預約 → GCal event 消失
- [ ] 前台客戶自助預約 → 也會同步過去

---

## 常見問題

- **Error: redirect_uri_mismatch**：步驟 4 填的 URI 必須完全一致（包含 `https://` 與尾端無斜線）
- **Error: access_denied**：OAuth consent 還在 testing 且授權的 email 沒被加入 Test users
- **同步無反應**：檢查 Supabase Dashboard → Functions → Logs，看有沒有 `gcal-sync-booking` 的錯誤 log
