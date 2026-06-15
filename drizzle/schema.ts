import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 棋譜表：儲存使用者上傳的 SGF 棋譜檔案
 */
export const games = sqliteTable(
  "games",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),
    description: text("description"),
    sgfContent: text("sgfContent").notNull(),
    playerBlack: text("playerBlack"),
    playerWhite: text("playerWhite"),
    result: text("result"),
    komi: text("komi"),
    handicap: integer("handicap").default(0),
    uploadedAt: integer("uploadedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    // Heartbeat cron task UID for full game analysis
    scheduleCronTaskUid: text("scheduleCronTaskUid").unique(),
  },
  table => ({
    userIdx: index("games_userId_idx").on(table.userId),
  })
);

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * Full game analysis progress table
 */
export const fullGameAnalysisProgress = sqliteTable("fullGameAnalysisProgress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  gameId: integer("gameId")
    .notNull()
    .unique()
    .references(() => games.id, { onDelete: "cascade" }),
  userId: integer("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  totalMoves: integer("totalMoves").notNull(),
  analyzedMoves: integer("analyzedMoves").default(0).notNull(),
  status: text("status", { enum: ["pending", "analyzing", "completed", "failed"] }).default("pending").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type FullGameAnalysisProgress = typeof fullGameAnalysisProgress.$inferSelect;
export type InsertFullGameAnalysisProgress = typeof fullGameAnalysisProgress.$inferInsert;

/**
 * 複盤記錄表：儲存 AI 對每一手棋的分析結果
 */
export const reviews = sqliteTable(
  "reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moveNumber: integer("moveNumber").notNull(),
    evaluation: text("evaluation"), // excellent, good, unclear, mistake, blunder
    reason: text("reason"),
    suggestedMoves: text("suggestedMoves", { mode: "json" }), // JSON array of { move, reason }
    strategy: text("strategy"),
    createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  table => ({
    gameUserIdx: index("reviews_gameId_userId_idx").on(table.gameId, table.userId),
  })
);

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * 對話記錄表：儲存 Chat Review 的對話歷史
 */
export const chatSessions = sqliteTable(
  "chat_sessions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    gameId: integer("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: integer("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messages: text("messages", { mode: "json" }).notNull(), // JSON array of { role, content, timestamp }
    createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  table => ({
    gameUserIdx: index("chat_sessions_gameId_userId_idx").on(table.gameId, table.userId),
  })
);

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

/**
 * LLM 設定表：儲存使用者的自訂 OpenAI 相容 API 設定
 */
export const llmSettings = sqliteTable("llm_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  apiBaseUrl: text("apiBaseUrl"),
  apiKey: text("apiKey"),
  modelName: text("modelName"),
  isEnabled: integer("isEnabled").default(1).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type LlmSetting = typeof llmSettings.$inferSelect;
export type InsertLlmSetting = typeof llmSettings.$inferInsert;
