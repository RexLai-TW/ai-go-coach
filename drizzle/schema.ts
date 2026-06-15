import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 棋譜表：儲存使用者上傳的 SGF 棋譜檔案
 */
export const games = mysqlTable("games", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }),
  description: text("description"),
  sgfContent: text("sgfContent").notNull(),
  playerBlack: varchar("playerBlack", { length: 255 }),
  playerWhite: varchar("playerWhite", { length: 255 }),
  result: varchar("result", { length: 50 }),
  komi: text("komi"),
  handicap: int("handicap").default(0),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  // Heartbeat cron task UID for full game analysis
  scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }).unique(),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

/**
 * Full game analysis progress table
 */
export const fullGameAnalysisProgress = mysqlTable("fullGameAnalysisProgress", {
  id: int("id").autoincrement().primaryKey(),
  gameId: int("gameId").notNull().unique(),
  userId: int("userId").notNull(),
  totalMoves: int("totalMoves").notNull(),
  analyzedMoves: int("analyzedMoves").default(0).notNull(),
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "failed"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FullGameAnalysisProgress = typeof fullGameAnalysisProgress.$inferSelect;
export type InsertFullGameAnalysisProgress = typeof fullGameAnalysisProgress.$inferInsert;

/**
 * 複盤記錄表：儲存 AI 對每一手棋的分析結果
 */
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  gameId: int("gameId").notNull(),
  userId: int("userId").notNull(),
  moveNumber: int("moveNumber").notNull(),
  evaluation: varchar("evaluation", { length: 50 }), // good, bad, unclear, blunder, mistake, questionable
  reason: text("reason"),
  suggestedMoves: json("suggestedMoves"), // JSON array of { move, reason }
  strategy: text("strategy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

/**
 * 對話記錄表：儲存 Chat Review 的對話歷史
 */
export const chatSessions = mysqlTable("chat_sessions", {
  id: int("id").autoincrement().primaryKey(),
  gameId: int("gameId").notNull(),
  userId: int("userId").notNull(),
  messages: json("messages").notNull(), // JSON array of { role, content, timestamp }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = typeof chatSessions.$inferInsert;

/**
 * LLM 設定表：儲存使用者的自訂 OpenAI 相容 API 設定
 */
export const llmSettings = mysqlTable("llm_settings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  provider: varchar("provider", { length: 50 }).notNull(),
  apiBaseUrl: varchar("apiBaseUrl", { length: 500 }),
  apiKey: text("apiKey"),
  modelName: varchar("modelName", { length: 255 }),
  isEnabled: int("isEnabled").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LlmSetting = typeof llmSettings.$inferSelect;
export type InsertLlmSetting = typeof llmSettings.$inferInsert;