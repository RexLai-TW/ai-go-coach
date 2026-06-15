import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";
import { InsertUser, users, games, reviews, chatSessions, llmSettings, fullGameAnalysisProgress, Game, Review, ChatSession, LlmSetting, InsertLlmSetting, FullGameAnalysisProgress, InsertFullGameAnalysisProgress } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export function initDb(d1: D1Database): void {
  _db = drizzle(d1);
}

export async function getDb(): Promise<ReturnType<typeof drizzle> | null> {
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    updateSet.updatedAt = new Date();

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

/**
 * Games queries
 */
export async function createGame(userId: number, input: {
  title?: string;
  description?: string;
  sgfContent: string;
  playerBlack?: string;
  playerWhite?: string;
  result?: string;
  komi?: string;
  handicap?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(games).values({
    userId,
    title: input.title,
    description: input.description,
    sgfContent: input.sgfContent,
    playerBlack: input.playerBlack,
    playerWhite: input.playerWhite,
    result: input.result,
    komi: input.komi,
    handicap: input.handicap ?? 0,
  }).returning({ id: games.id });

  return result[0]?.id;
}

export async function getUserGames(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(games).where(
    eq(games.userId, userId)
  ).orderBy(desc(games.uploadedAt));
}

export async function getGameById(gameId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(games).where(
    and(
      eq(games.id, gameId),
      eq(games.userId, userId)
    )
  ).limit(1);

  return result[0] ?? null;
}

export async function deleteGame(gameId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  await db.delete(games).where(
    and(
      eq(games.id, gameId),
      eq(games.userId, userId)
    )
  );

  return true;
}

/**
 * Reviews queries
 */
export async function createReview(input: {
  gameId: number;
  userId: number;
  moveNumber: number;
  evaluation?: string;
  reason?: string;
  suggestedMoves?: any;
  strategy?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(reviews).values({
    gameId: input.gameId,
    userId: input.userId,
    moveNumber: input.moveNumber,
    evaluation: input.evaluation,
    reason: input.reason,
    suggestedMoves: input.suggestedMoves,
    strategy: input.strategy,
  });
}

export async function getReview(gameId: number, moveNumber: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(reviews).where(
    and(
      eq(reviews.gameId, gameId),
      eq(reviews.moveNumber, moveNumber),
      eq(reviews.userId, userId)
    )
  ).limit(1);

  return result[0] ?? null;
}

export async function getGameReviews(gameId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(reviews).where(
    and(
      eq(reviews.gameId, gameId),
      eq(reviews.userId, userId)
    )
  ).orderBy(asc(reviews.moveNumber));
}

/**
 * Chat sessions queries
 */
export async function createChatSession(input: { gameId: number; userId: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(chatSessions).values({
    gameId: input.gameId,
    userId: input.userId,
    messages: [],
  }).returning({ id: chatSessions.id });

  return result[0]?.id;
}

export async function getChatSession(gameId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(chatSessions).where(
    and(
      eq(chatSessions.gameId, gameId),
      eq(chatSessions.userId, userId)
    )
  ).limit(1);

  return result[0] ?? null;
}

export async function addChatMessage(sessionId: number, role: 'user' | 'assistant', content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const session = await db.select().from(chatSessions).where(
    eq(chatSessions.id, sessionId)
  ).limit(1);

  if (!session[0]) throw new Error("Session not found");

  const currentMessages = session[0].messages as any;
  const messages = (Array.isArray(currentMessages) ? currentMessages : []) as any[];
  messages.push({
    role,
    content,
    timestamp: new Date().toISOString(),
  });

  await db.update(chatSessions).set({
    messages: messages as any,
    updatedAt: new Date(),
  }).where(eq(chatSessions.id, sessionId));
}

export async function appendChatMessages(
  sessionId: number,
  newMessages: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const session = await db.select().from(chatSessions).where(
    eq(chatSessions.id, sessionId)
  ).limit(1);

  if (!session[0]) throw new Error("Session not found");

  const currentMessages = session[0].messages;
  const messages = (Array.isArray(currentMessages) ? currentMessages : []) as Array<Record<string, unknown>>;
  const timestamp = new Date().toISOString();
  for (const msg of newMessages) {
    messages.push({ role: msg.role, content: msg.content, timestamp });
  }

  await db.update(chatSessions).set({ messages, updatedAt: new Date() }).where(eq(chatSessions.id, sessionId));
}

export async function getChatMessages(sessionId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select().from(chatSessions).where(
    eq(chatSessions.id, sessionId)
  ).limit(1);

  if (!result[0]) return [];

  const currentMessages = result[0].messages as any;
  const messages = (Array.isArray(currentMessages) ? currentMessages : []) as any[];
  return messages.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
    createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(),
  }));
}

/**
 * Full game analysis progress queries
 */
export async function createFullGameAnalysisProgress(input: InsertFullGameAnalysisProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(fullGameAnalysisProgress).values(input).returning({ id: fullGameAnalysisProgress.id });
  return result[0]?.id;
}

export async function getFullGameAnalysisProgress(gameId: number, userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(fullGameAnalysisProgress).where(
    and(
      eq(fullGameAnalysisProgress.gameId, gameId),
      eq(fullGameAnalysisProgress.userId, userId)
    )
  ).limit(1);

  return result[0] ?? null;
}

export async function updateFullGameAnalysisProgress(gameId: number, userId: number, updates: Partial<Omit<FullGameAnalysisProgress, 'id' | 'createdAt'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(fullGameAnalysisProgress).set({
    ...updates,
    updatedAt: new Date(),
  }).where(
    and(
      eq(fullGameAnalysisProgress.gameId, gameId),
      eq(fullGameAnalysisProgress.userId, userId)
    )
  );
}

export async function deleteFullGameAnalysisProgress(gameId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(fullGameAnalysisProgress).where(
    and(
      eq(fullGameAnalysisProgress.gameId, gameId),
      eq(fullGameAnalysisProgress.userId, userId)
    )
  );
}

/**
 * LLM Settings queries
 */
export async function getLlmSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(llmSettings).where(
    eq(llmSettings.userId, userId)
  ).limit(1);

  return result[0] ?? null;
}

export async function saveLlmSettings(userId: number, input: Partial<InsertLlmSetting>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getLlmSettings(userId);

  if (existing) {
    // Update existing settings
    await db.update(llmSettings).set({
      ...input,
      updatedAt: new Date(),
    }).where(eq(llmSettings.userId, userId));

    return await getLlmSettings(userId);
  } else {
    // Create new settings
    await db.insert(llmSettings).values({
      userId,
      ...input,
    } as InsertLlmSetting);

    return await getLlmSettings(userId);
  }
}

export async function deleteLlmSettings(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(llmSettings).where(
    eq(llmSettings.userId, userId)
  );
}

export async function updateChatSession(gameId: number, userId: number, messages: any[]) {
  const db = await getDb();
  if (!db) return false;

  await db.update(chatSessions).set({
    messages,
    updatedAt: new Date(),
  }).where(
    and(
      eq(chatSessions.gameId, gameId),
      eq(chatSessions.userId, userId)
    )
  );

  return true;
}
