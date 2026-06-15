# 🎯 AI Go Coach - 圍棋 AI 教練

一個智能的圍棋複盤分析平台，使用 AI 技術幫助圍棋愛好者深入分析每一步棋，提升棋力。

**線上體驗：** [AI Go Coach](https://aigo-coach-uuurt2fr.manus.space)

## ✨ 核心功能

### 📊 棋譜分析
- **逐手分析**：AI 評估每一步棋的質量（優秀、良好、失誤、失著等）
- **全局複盤**：一鍵分析整盤棋局，自動標記關鍵手
- **實時進度**：分析過程中實時顯示進度條
- **詳細建議**：提供替代走法和戰略方向指導

### 🎮 互動式棋盤
- **多種導航方式**：
  - 鍵盤快捷鍵（← → Home End）
  - 點擊棋子直接跳轉
  - 手數列表快速選擇
  - 前進/後退按鈕
- **視覺反饋**：
  - 綠色圓點標記已分析的棋子
  - 紅色標記當前手數
  - 高亮顯示當前選中手數

### 💬 AI 對話教練
- **實時對話**：與 AI 教練討論棋局
- **上下文感知**：AI 理解當前棋盤狀態和歷史訊息
- **對話管理**：清除對話歷史，開始新的討論

### 📁 棋譜管理
- **上傳 SGF 棋譜**：支援拖曳上傳和檔案選擇
- **搜尋功能**：按棋譜標題或棋手名稱搜尋
- **快速訪問**：點擊棋譜卡片直接進入複盤頁面
- **刪除管理**：清理不需要的棋譜

## 🏗️ 技術架構

### 前端技術棧
- **React 19** - UI 框架
- **Tailwind CSS 4** - 樣式系統
- **tRPC 11** - 類型安全的 RPC 通信
- **Wouter** - 輕量級路由
- **Canvas API** - 棋盤渲染
- **Vite** - 構建工具

### 後端技術棧
- **Express 4** - Web 框架
- **Node.js** - 運行時
- **Drizzle ORM** - 資料庫 ORM
- **MySQL/TiDB** - 資料庫
- **DeepSeek/OpenAI** - LLM API

### 主要特性
- **SGF 解析器**：完整的圍棋棋譜解析和驗證
- **棋盤狀態管理**：精確的棋盤狀態重建
- **LLM 集成**：使用 AI 進行棋局分析
- **實時進度追蹤**：分析過程中的進度輪詢
- **OAuth 認證**：Manus OAuth 集成

## 📦 安裝與運行

### 環境要求
- Node.js 22+
- pnpm 或 npm
- MySQL 8.0+ 或 TiDB

### 本地開發

```bash
# 克隆倉庫
git clone https://github.com/RexLai-TW/ai-go-coach.git
cd ai-go-coach

# 安裝依賴
pnpm install

# 設置環境變數
cp .env.example .env.local
# 編輯 .env.local，填入你的配置

# 運行遷移
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# 開發模式
pnpm dev
```

### 環境變數

```env
# 資料庫
DATABASE_URL=mysql://user:password@localhost:3306/ai_go_coach

# OAuth
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# LLM
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your_api_key

# 其他
JWT_SECRET=your_jwt_secret
OWNER_NAME=Your Name
OWNER_OPEN_ID=your_open_id
```

## 📊 資料庫架構

### 主要表結構

#### games 表
- `id` - 棋譜 ID
- `title` - 棋譜標題
- `sgfContent` - SGF 內容
- `playerBlack` - 黑方棋手
- `playerWhite` - 白方棋手
- `result` - 比賽結果
- `totalMoves` - 總手數
- `uploadedAt` - 上傳時間
- `userId` - 用戶 ID

#### reviews 表
- `id` - 複盤記錄 ID
- `gameId` - 棋譜 ID
- `moveNumber` - 手數
- `evaluation` - 評估（good/bad/blunder 等）
- `reason` - 分析原因
- `alternatives` - 替代走法
- `strategy` - 戰略方向

#### chat_sessions 表
- `id` - 對話 ID
- `gameId` - 棋譜 ID
- `messages` - 對話訊息（JSON）
- `createdAt` - 創建時間

## 🎯 使用指南

### 基本流程

1. **上傳棋譜**
   - 進入首頁，點擊「上傳棋譜」
   - 選擇或拖曳 SGF 檔案
   - 點擊「上傳」按鈕

2. **進入複盤**
   - 在棋譜列表中選擇棋譜
   - 點擊「複盤」按鈕進入分析頁面

3. **分析棋局**
   - **單手分析**：選擇手數，點擊「分析此手」
   - **全局複盤**：點擊「全局複盤」按鈕分析整盤
   - 查看 AI 評估和建議

4. **與 AI 對話**
   - 在右側對話框提出問題
   - AI 會根據當前棋盤狀態回答
   - 清除對話歷史開始新的討論

### 快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| ← | 上一手 |
| → | 下一手 |
| Home | 首手 |
| End | 末手 |
| 點擊棋子 | 跳轉到該手 |

## 🔍 核心算法

### SGF 解析

```typescript
// 支援的 SGF 屬性
- GM (遊戲類型)
- SZ (棋盤大小)
- PB/PW (棋手名稱)
- RE (結果)
- AB/AW (初始棋子)
- B/W (落子序列)
```

### 棋盤狀態重建

```typescript
// 精確重建任意手數的棋盤狀態
- 支援讓子棋
- 支援打劫規則
- 支援死子標記
```

### AI 分析流程

```
棋譜上傳 → SGF 解析 → 棋盤重建 → LLM 分析 → 結果儲存 → 前端展示
```

## 📈 性能指標

- **棋盤渲染**：60 FPS（Canvas 優化）
- **LLM 響應**：< 10 秒/手
- **資料庫查詢**：< 100 ms
- **頁面加載**：< 2 秒

## 🧪 測試

### 單元測試

```bash
# 運行所有測試
pnpm test

# 監視模式
pnpm test:watch

# 覆蓋率報告
pnpm test:coverage
```

### 測試覆蓋

- SGF 解析器：19 個測試用例，100% 覆蓋
- 棋盤狀態：邊界情況測試
- API 路由：端到端測試

## 🚀 部署

### Manus 平台部署

```bash
# 創建 checkpoint
pnpm build

# 通過 Manus UI 發布
# 1. 點擊「Publish」按鈕
# 2. 選擇域名
# 3. 確認發布
```

### 自定義域名

在 Manus 管理面板中：
1. 進入 Settings → Domains
2. 添加自定義域名
3. 配置 DNS 記錄
4. 驗證域名所有權

## 📝 API 文件

### tRPC 路由

#### games 路由
- `games.list` - 獲取棋譜列表
- `games.get` - 獲取單個棋譜
- `games.upload` - 上傳新棋譜
- `games.delete` - 刪除棋譜

#### analysis 路由
- `analysis.analyzeMove` - 分析單個手數
- `analysis.analyzeFullGame` - 分析整盤棋局
- `analysis.getReview` - 獲取手數分析結果
- `analysis.getGameReviews` - 獲取棋局所有分析
- `analysis.getFullGameProgress` - 獲取全局複盤進度

#### chatReview 路由
- `chatReview.sendMessage` - 發送對話訊息
- `chatReview.getHistory` - 獲取對話歷史
- `chatReview.clearHistory` - 清除對話歷史

## 🐛 常見問題

### Q: 上傳的 SGF 檔案無法解析？
A: 請確保 SGF 檔案格式正確。支援的格式：
- 標準 SGF 格式（GM[1]）
- UTF-8 編碼
- 有效的棋盤大小（通常 19×19）

### Q: AI 分析速度很慢？
A: 這取決於：
- LLM API 的響應時間
- 棋局的複雜度
- 伺服器負載

### Q: 如何改進 AI 分析質量？
A: 可以調整：
- Prompt 模板
- LLM 模型選擇
- 分析深度參數

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 開發流程

1. Fork 倉庫
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 開啟 Pull Request

### 代碼規範

- 使用 TypeScript
- 遵循 ESLint 規則
- 添加單元測試
- 更新文件

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 👨‍💻 作者

**Rex Lai** - [@RexLai-TW](https://github.com/RexLai-TW)

## 🙏 致謝

感謝以下開源項目和服務：
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)
- [Drizzle ORM](https://orm.drizzle.team)
- [DeepSeek](https://www.deepseek.com)
- [Manus](https://manus.im)

## 📞 聯繫方式

- GitHub Issues：[提交 Issue](https://github.com/RexLai-TW/ai-go-coach/issues)
- 郵件：rex@example.com

---

**最後更新：** 2026-06-15

**版本：** 1.0.0

**狀態：** 🟢 正式發布
