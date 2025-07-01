# 講師排程與人員分配平台 - 安裝指南

## 系統需求

- Node.js 16.0+ 
- npm 或 yarn
- 支援現代瀏覽器 (Chrome, Firefox, Safari, Edge)

## 快速開始

### 1. 安裝依賴

在項目根目錄執行：

```bash
npm run install-all
```

這會自動安裝根目錄、後端和前端的所有依賴套件。

### 2. 啟動開發環境

```bash
npm run dev
```

這會同時啟動：
- 後端伺服器：http://localhost:3001
- 前端應用：http://localhost:3000

### 3. 開始使用

1. 開啟瀏覽器前往 http://localhost:3000
2. 首頁會顯示系統介紹和功能說明
3. 點擊「學員入口」開始填寫志願序
4. 點擊「管理員入口」進入管理後台

## 詳細安裝步驟

### 安裝主項目依賴

```bash
npm install
```

### 安裝後端依賴

```bash
cd backend
npm install
```

### 安裝前端依賴

```bash
cd frontend
npm install
```

## 單獨啟動服務

### 只啟動後端

```bash
npm run server
```

或

```bash
cd backend
npm run dev
```

### 只啟動前端

```bash
npm run client
```

或

```bash
cd frontend
npm start
```

## 建置生產版本

```bash
npm run build
```

這會在 `frontend/build` 目錄產生生產版本的靜態文件。

## 資料庫

系統使用 SQLite 資料庫，資料庫文件會自動建立在 `backend/data/camp_select.db`。

首次啟動時，系統會自動：
1. 建立資料庫文件
2. 初始化所需的表格
3. 插入預設設定

## 系統配置

### 講師列表

預設講師：飛飛、豆泥、吳政賢、趙式隆

### 時段設定

- 第一時段：15:55–16:45
- 第二時段：16:50–17:30

### 容量限制

每位講師每時段最多 13 位學員

## 環境變數

可在 `frontend/.env` 文件中配置：

```env
REACT_APP_API_URL=http://localhost:3001/api
```

## 故障排除

### 常見問題

**Q: 啟動時出現端口被佔用錯誤**
A: 確保 3000 和 3001 端口未被其他應用程式使用，或修改配置使用其他端口。

**Q: 資料庫連線失敗**
A: 確保 `backend/data` 目錄存在且有寫入權限。

**Q: 前端無法連接後端**
A: 檢查後端是否正常啟動，確認 API URL 配置正確。

**Q: 依賴安裝失敗**
A: 嘗試清除 node_modules 和 package-lock.json，重新安裝：

```bash
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json  
rm -rf frontend/node_modules frontend/package-lock.json
npm run install-all
```

### 重置系統

如需完全重置系統資料：

1. 停止所有服務
2. 刪除資料庫文件：`rm backend/data/camp_select.db`
3. 重新啟動服務

### 檢查系統狀態

訪問 http://localhost:3001/api/health 檢查後端是否正常運行。

## API 文檔

### 學員 API

- `POST /api/students/login` - 學員登入/註冊
- `GET /api/students/:id` - 獲取學員資料
- `PUT /api/students/:id/preferences` - 更新志願序
- `POST /api/students/:id/submit` - 提交志願序

### 管理員 API

- `GET /api/admin/students` - 獲取所有學員列表
- `POST /api/admin/clear-all` - 清除所有資料
- `POST /api/admin/reset-all-preferences` - 重置所有志願序

### 分配 API

- `POST /api/allocation/generate` - 生成分配結果
- `GET /api/allocation/current` - 獲取當前分配結果
- `GET /api/allocation/export/csv` - 匯出 CSV

## 支援

如有問題，請檢查：
1. 控制台錯誤訊息
2. 瀏覽器開發者工具網路面板
3. 後端伺服器日誌

---

更多詳細資訊請參考 README.md 文件。 