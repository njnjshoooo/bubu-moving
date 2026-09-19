# 步步營運後台與主訂單派單系統

本次新增：角色權限、名單指派、標準商品、文章草稿／公開版本、名單自動產生報價草稿、待串接佇列。

## 權限

- 環境設定 `BUBU_ADMIN_EMAILS`：擁有者，不能從後台停用。
- 管理員：全部名單、報價、商品、內容、成員授權與系統交接。
- 業務：只讀取及修改 `assigned_to` 等於自己登入信箱的名單與報價，包含搜尋、CSV、產生草稿及付款紀錄。自行新增報價歸自己；名單移轉時相關報價一起移轉。
- 內容編輯：文章、最新資訊、案例、照片。無客戶及付款資料權限。
- 帳號以 ChatGPT 登入身分識別，後台授權不等於 Sites 的私人網站瀏覽權限；上線前需另行處理網站對員工與外部系統的存取。

## 自動報價

從名單的「建立／查看報價」進入，自動帶入客戶、日期、已選服務及包材快照。標準單價由商品管理維護。車次與人數預設 1，業務必須依實際需求核對；沒有標準單價的項目先以 0 顯示待估價，開立前必須完成定價。此為確定規則的自動填單，並非依照片自動判斷物品量。

草稿可修改，開立後金額鎖定。客戶確認後，由管理員加入交接佇列；已進佇列的報價不可直接作廢。退款、取消及服務排程仍由主訂單／綠界系統處理，本站目前不自動同步退款，也不預設主系統已成功建單。

## 交接契約 v1.0

事件以 `bubu-{quote UUID}` 為唯一 `eventId`，同一報價重送仍沿用同一事件編號。接收端必須用此值建立唯一索引／idempotency 機制。

JSON 欄位：

- `schemaVersion: "1.0"`、`eventType: "quote.accepted"`、`eventId`
- `quoteId`、`inquiryId`、`quoteVersion`、`acceptedAt`、`createdAt`
- `customer: {name, phone}`
- `service: {date, from, to, access}`；地點可能只有區域，不代表完整派單地址，主系統需補齊。
- `currency: "TWD"`、`total` 整數元
- `lines: [{category, name, spec, quantity, unit, unitPrice}]`
- `notes`
- `payment`：交接當下的付款快照；`succeeded` 才是正式實收，`test_paid` 及 `simulated` 不是。後續付款異動尚未自動同步，主系統須與綠界紀錄核對。

## 選擇一種串接方式

### A. 後台推送（目前需手動按送出／重送）

在 Sites 的安全環境設定中設定 `DISPATCH_ENDPOINT`（固定 HTTPS 端點）、`DISPATCH_TOKEN`，驗收完成後設定 `DISPATCH_ENABLED=true`。不要將 token 放進聊天或前端。

本站發送 `POST`，headers：`Authorization: Bearer <token>`、`Content-Type: application/json`、`Idempotency-Key: <eventId>`。接收系統成功時須回傳 HTTP 2xx JSON `{"orderId":"主系統訂單編號"}`；重複事件須回覆相同 orderId。

本站有 15 秒逾時、60 秒傳送鎖，禁止平行重送；逾時記為結果待確認。管理員可核對主系統後以同一識別碼重送。未提供正確 orderId 不視為成功。

### B. 主系統主動拉取

設定至少 32 字元隨機 `ORDER_API_TOKEN`，以 Bearer header 驗證。

- `GET /api/integrations/orders`：最多 100 筆待交接事件，回傳 `{schemaVersion, events, hasMore}`。處理並 ACK 後再拉下一批。無未確認報價，也不提供全部客戶查詢。
- `POST /api/integrations/orders`：JSON `{eventId, orderId}`，回報已建單；相同回報可重試，不同 orderId 回覆 409。

推送與拉取請擇一，避免不同接收流程競爭。即使選擇拉取，主系統仍需對 eventId 去重。

## 上線前待完成

主系統實際 API 文件、認證、欄位對應及測試環境尚未提供，未進行外部建單，也未設定真實 token。需確認含稅／發票、地址精度、取消／退款、付款異動與訂单更新等實際主系統規則後再擴充契約。

目前網站保持私人存取，外部系統不能僅憑應用層 Bearer token 穿過平台存取控制；必須先由擁有者安排可存取的正式站點或受支援的整合入口。網站公開不會取消上述後台角色與 API token 驗證。
