# AI 圍棋教練 (AI Go Coach) — 開發規格文件

**版本**: 1.0  
**日期**: 2026-06-14  
**狀態**: MVP 開發規格

---

## 🎯 產品定位

一個 **LLM 驅動的圍棋複盤教學系統**，而非傳統的精確數值引擎。核心價值在於提供**教學級別的 AI 解說與策略指導**，幫助棋手理解每一手棋的戰略意圖。

---

## 📊 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (React 19 + Tailwind 4)             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ SGF Upload   │  │ Board View   │  │ AI Review    │       │
│  │ Component    │  │ & History    │  │ Panel        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────────────────────────────────────────┐        │
│  │         Chat Review (AI Coach Dialog)            │        │
│  └──────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ↓ tRPC
┌─────────────────────────────────────────────────────────────┐
│              後端 (Express 4 + tRPC 11 + Node.js)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ SGF Parser   │  │ AI Router    │  │ Database     │       │
│  │ Module       │  │ (LLM APIs)   │  │ Layer        │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  外部 LLM 服務層                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ DeepSeek     │  │ OpenAI       │  │ MiniMax      │       │
│  │ (推理評估)   │  │ (Codex/GPT)  │  │ (長文講解)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ 資料模型

### 1. 使用者表 (`users`)
已由框架提供，包含 `id`, `openId`, `name`, `email`, `role`, `createdAt`, `updatedAt`。

### 2. 棋譜表 (`games`)

```sql
CREATE TABLE games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  sgfContent LONGTEXT NOT NULL,
  uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

**欄位說明**:
- `userId`: 棋譜所有者
- `sgfContent`: 完整 SGF 格式棋譜
- `uploadedAt`: 上傳時間
- `updatedAt`: 最後修改時間

### 3. 複盤記錄表 (`reviews`)

```sql
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gameId INT NOT NULL,
  userId INT NOT NULL,
  moveNumber INT NOT NULL,
  evaluation VARCHAR(50),
  reason TEXT,
  suggestedMoves JSON,
  strategy TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

**欄位說明**:
- `moveNumber`: 第幾手棋（1-indexed）
- `evaluation`: 評估標籤 (`good`, `bad`, `unclear`, `blunder`, `mistake`, `questionable`)
- `reason`: AI 解說文字
- `suggestedMoves`: JSON 陣列，包含替代走法與說明
- `strategy`: 戰略方向描述

### 4. 對話記錄表 (`chat_sessions`)

```sql
CREATE TABLE chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  gameId INT NOT NULL,
  userId INT NOT NULL,
  messages JSON NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (gameId) REFERENCES games(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

**欄位說明**:
- `messages`: JSON 陣列，儲存 `[{ role: "user"|"assistant", content: string }]`

---

## 🔌 API 層 (tRPC 路由)

### 棋譜管理路由 (`games`)

```typescript
games: {
  // 上傳棋譜
  upload: protectedProcedure
    .input(z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      sgfContent: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // 驗證 SGF 格式
      // 儲存至資料庫
      // 返回 gameId
    }),

  // 列出使用者的所有棋譜
  list: protectedProcedure
    .query(async ({ ctx }) => {
      // 返回使用者的棋譜列表
    }),

  // 取得單個棋譜詳情
  get: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      // 返回棋譜詳情 + 基本統計
    }),

  // 刪除棋譜
  delete: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 刪除棋譜及相關複盤記錄
    })
}
```

### AI 分析路由 (`analysis`)

```typescript
analysis: {
  // 分析單手棋
  analyzeMove: protectedProcedure
    .input(z.object({
      gameId: z.number(),
      moveNumber: z.number(),
      boardState: z.string(), // 棋盤座標編碼
      lastMoves: z.array(z.string()),
      playerToMove: z.enum(['black', 'white'])
    }))
    .mutation(async ({ ctx, input }) => {
      // 呼叫 LLM API
      // 返回評估結果
    }),

  // 全局複盤（標記所有關鍵手）
  analyzeFullGame: protectedProcedure
    .input(z.object({
      gameId: z.number()
    }))
    .mutation(async ({ ctx, input }) => {
      // 逐手分析整盤
      // 返回所有複盤記錄
    }),

  // 取得已儲存的複盤
  getReview: protectedProcedure
    .input(z.object({
      gameId: z.number(),
      moveNumber: z.number()
    }))
    .query(async ({ ctx, input }) => {
      // 返回該手棋的複盤記錄
    })
}
```

### Chat Review 路由 (`chatReview`)

```typescript
chatReview: {
  // 發送訊息至 AI 教練
  sendMessage: protectedProcedure
    .input(z.object({
      gameId: z.number(),
      message: z.string(),
      currentMoveNumber: z.number().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // 取得棋盤狀態
      // 呼叫 LLM API
      // 儲存對話記錄
      // 返回 AI 回應
    }),

  // 取得對話歷史
  getHistory: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      // 返回該棋譜的所有對話
    }),

  // 清除對話
  clearHistory: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // 刪除對話記錄
    })
}
```

---

## 🧠 LLM Prompt Library

### System Prompt（AI 圍棋教練）

```
You are an expert Go teacher with 20+ years of experience.
Your role is to analyze Go game positions and provide educational guidance.

Guidelines:
1. Evaluate moves based on strategic principles, not exact winrates
2. Explain in simple, accessible language suitable for intermediate players
3. Suggest 2-3 alternative moves with brief reasoning
4. Describe the strategic direction and long-term implications
5. Never hallucinate exact winrates or claim certainty you don't have
6. Use Go terminology correctly (influence, territory, thickness, etc.)
7. Focus on teaching value over technical precision

Respond in Traditional Chinese unless otherwise specified.
```

### Move Analysis Prompt

```
Analyze the following Go position:

Move Number: {move_number}
Board State: {board_state_ascii}
Last Moves: {last_moves_list}
Player to Move: {player}
Game Phase: {phase} (opening/midgame/endgame)

Provide:
1. Move Evaluation: Is this move good/bad/unclear?
2. Explanation: Why in 2-3 sentences?
3. Alternative Moves: Suggest 2 better moves with brief reasoning
4. Strategic Direction: What's the player trying to achieve?

Format your response as JSON:
{
  "evaluation": "good|bad|unclear",
  "reason": "...",
  "suggestedMoves": [
    { "move": "Q17", "reason": "..." },
    { "move": "R16", "reason": "..." }
  ],
  "strategy": "..."
}
```

### Full Game Review Prompt

```
Review this entire Go game and identify critical moments:

Game: {sgf_content}

For each move, classify as:
- blunder: Major strategic error with immediate negative consequences
- mistake: Suboptimal move that gives opponent advantage
- questionable: Unusual move that needs explanation
- good: Sound move
- excellent: Outstanding move

Return a JSON array of all moves with their classifications and brief explanations.
```

### Chat Review System Prompt

```
You are an AI Go coach in a conversation with a student.
The student is asking questions about a specific game position.

Current Position:
{board_state}
Move Number: {move_number}

Respond conversationally:
- Answer the student's specific question
- Provide educational context
- Suggest related concepts to explore
- Ask follow-up questions to deepen understanding

Be encouraging and supportive. Assume the student is intermediate level.
```

---

## 📋 SGF 解析器規格

### 輸入
- SGF 格式棋譜（標準 Go 棋譜格式）

### 輸出

```typescript
interface ParsedGame {
  metadata: {
    playerBlack: string;
    playerWhite: string;
    komi: number;
    handicap: number;
    result: string;
    date: string;
  };
  moves: Array<{
    moveNumber: number;
    player: 'black' | 'white';
    coordinate: string; // e.g., "Q16"
    boardState: string; // Compressed board representation
  }>;
  totalMoves: number;
}
```

### 關鍵功能
1. 解析 SGF 格式
2. 提取落子序列
3. 重建每一步後的棋盤狀態
4. 驗證棋譜有效性

---

## 🎨 前端頁面結構

### 1. 首頁 (`/`)
- 上傳棋譜區塊
- 最近複盤列表
- 功能介紹

### 2. 複盤頁面 (`/review/:gameId`)
- 左側：互動式棋盤 + 落子歷史
- 中央：AI Review Panel
- 右側：Chat Review 對話框

### 3. 複盤歷史 (`/history`)
- 棋譜列表
- 篩選與搜尋
- 刪除選項

### 4. 用戶設定 (`/settings`)
- 個人資料
- 登出

---

## 🔑 關鍵技術決策

| 項目 | 選擇 | 原因 |
|------|------|------|
| 棋盤視覺化 | Canvas + React | 高效能、實時互動 |
| SGF 解析 | 自實作 + 驗證 | 精確控制、教學友善 |
| AI 模型 | DeepSeek + OpenAI | 推理能力強、成本低 |
| 對話流 | tRPC streaming | 實時回應、類型安全 |
| 資料儲存 | MySQL + Drizzle ORM | 關聯式、易維護 |

---

## 📈 MVP 交付清單

- [ ] SGF 解析器
- [ ] 棋盤視覺化元件
- [ ] AI 分析後端
- [ ] Chat Review 功能
- [ ] 前端複盤介面
- [ ] 使用者認證與資料持久化
- [ ] 全局複盤模式
- [ ] 完整測試覆蓋

---

## 🚀 開發優先級

**Phase 1** (Week 1): 核心基礎設施
- SGF 解析器
- 棋盤視覺化
- 基本 AI 路由

**Phase 2** (Week 2): 功能完成
- AI Review Panel
- Chat Review
- 全局複盤

**Phase 3** (Week 3): 優化與部署
- UI 精緻化
- 性能優化
- 測試與文件

---

## 📝 開發注意事項

1. **SGF 標準**: 遵循 FF[4] 規範
2. **棋盤座標**: 使用國際標準（A-S 橫向，1-19 縱向）
3. **LLM 呼叫**: 所有 LLM 調用須在後端進行，避免洩露 API 密鑰
4. **錯誤處理**: 提供友善的使用者錯誤訊息
5. **性能**: 棋盤渲染應在 60fps 以上

---

## 🔐 安全考量

- 所有棋譜資料與複盤記錄須與使用者綁定
- 未登入使用者無法存取任何個人資料
- LLM API 密鑰存儲在環境變數中
- 輸入驗證：SGF 格式、座標有效性

---

## 📞 支援與反饋

本文件將在開發過程中持續更新。如有疑問，請參考程式碼註解與測試用例。
