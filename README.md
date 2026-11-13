# 北大漂流書櫃（SoBa）

封面頁、登入頁與校園交換系統（漂流書櫃／好書交換／失物招領）整合在同一個 Vue 3 + TypeScript + Vite 專案。
後端尚未串接，資料由 `src/campus/api.ts` 的記憶體 mock 提供。

## 頁面與路由

| 路徑 | 頁面 | 說明 |
| --- | --- | --- |
| `/` | 封面（`src/views/LandingView.vue`） | 右上「登入」與「加入這場循環」「分享一件好物」都連到登入頁 |
| `/login` | 登入（`src/views/LoginView.vue`） | 帳號＋密碼＋驗證碼、訪客登入、選擇現有身分 |
| `/app` | 校園交換系統（`src/campus/CampusApp.vue`） | 需先登入，未登入會被導回 `/login` |

## 登入方式

- **帳號登入**：帳號、密碼、驗證碼都要正確。示範帳號：`alice / alice123`、`bob / bob123`、`admin / admin123`。
- **訪客登入**：只能刊登「漂流書櫃」「失物招領」；不能刊登好書交換、不能提出申請（API 會回 403）。
- **現有身分**：從 Alice、Bob、Admin 選一個，免密碼直接登入（後端接上前的示範用）。
- 進入系統後，右上角可切換身分或登出；登入狀態存在 `sessionStorage`，重新整理不會登出（資料仍會還原為範例資料）。

## 執行

```sh
npm install
npm run dev        # 開發
npm test           # API 規則測試（vitest）
npm run build      # 型別檢查 + 打包
npm run lint
```

## 結構

- `src/router/index.ts`：路由與登入守衛
- `src/views/`：LandingView（封面）、LoginView（登入）
- `src/components/CaptchaBox.vue`：SVG 驗證碼（前端產生、不分大小寫）
- `src/campus/`：校園交換系統（`api.ts` mock API、`types.ts`、`store.ts`、`components/`、`api.test.ts`）
- `src/style.css`、`src/theme.css`：封面／登入頁樣式（自動加上 `.landing` 範圍）
- `src/campus/campus.css`：系統樣式（自動加上 `.campus` 範圍）
- `src/base.css`：全域重設
- `postcss.config.js`：把上述兩組樣式各自限定在自己的範圍內，兩邊的 `.brand`、`.filters`、`.card` 等同名 class 不會互相覆蓋。之後新增或修改這些 CSS 檔不需要改動任何設定。

## 接上真正的後端時

- 把 `MockApi` 內各方法換成 `fetch()`，簽名不變即可；`login`、`guestLogin` 也一併換成後端 API。
- 驗證碼目前在前端比對，正式版應改由後端產生與驗證。
- 示範帳號與「現有身分」只是開發用，上線前請移除登入頁的對應區塊。

## 部署到 GitHub Pages

1. 推送到 GitHub 的 `main` 分支。
2. 到 Settings → Pages，Source 選 **GitHub Actions**（免費帳號通常需要公開儲存庫）。
3. `.github/workflows/deploy.yml` 會自動測試、以儲存庫名稱為 `base` 建置，並複製 `index.html` 為 `404.html`，讓 history 模式的深層連結可重新整理。

## 安全與隱私注意事項

- 這是純前端示範專案，資料存在記憶體，帳號與密碼寫在前端程式碼中，**僅供展示，請勿輸入真實密碼**。
- 「身分切換」與寫死的示範帳號在接上真正後端後應移除，改由伺服器驗證身分與權限。
- 刊登文字若含電話或 Email 會被拒絕；請勿上傳含個資的照片（如學生證）。
- 訪客每次登入會建立獨立身分，無法修改他人刊登。
- 字型仍從 Google Fonts 載入；如需完全離線或避免第三方請求，請改為自行託管字型。
- `.env` 已加入 `.gitignore`，請勿提交金鑰。
