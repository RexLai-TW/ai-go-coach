import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { createChatSession, getChatSession, appendChatMessages, getChatMessages, getGameById, updateChatSession } from '../db';
import { parseSGF, getBoardStateAfterMove, getGamePhase, boardToASCIICompact } from '../services/sgf-parser';
import { invokeLLM } from '../_core/llm';
import { getUserLLMConfig } from '../services/llm-config';

/**
 * Chat Review router: Handle conversational AI analysis
 */
export const chatReviewRouter = router({
  /**
   * Send a message and get AI response
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        gameId: z.number(),
        moveNumber: z.number().min(0).optional(),
        message: z.string().min(1).max(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get or create chat session
      let sessionId: number;
      const existingSession = await getChatSession(input.gameId, ctx.user!.id);

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        sessionId = await createChatSession({
          gameId: input.gameId,
          userId: ctx.user!.id,
        });
      }

      // Get game for context
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      // Parse SGF for board context
      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to parse game' });
      }

      // Get board state at specified move
      const moveNum = input.moveNumber || parsed.totalMoves;
      const board = getBoardStateAfterMove(parsed.moves, moveNum);
      const phase = getGamePhase(moveNum, parsed.totalMoves);

      // Build board ASCII
      const boardAscii = boardToASCIICompact(board);

      // Get conversation history
      const history = await getChatMessages(sessionId);

      // Build system prompt
      const systemPrompt = `You are an expert Go coach helping a player review their game.
You have access to the current board position and game context.
Guidelines:
1. Answer questions about the current position and strategy
2. Explain Go principles and tactics in accessible language
3. Provide constructive feedback on moves
4. Use Go terminology correctly
5. Be encouraging and educational
6. Respond in Traditional Chinese

Current Game Context:
- Black: ${game.playerBlack || 'Unknown'}
- White: ${game.playerWhite || 'Unknown'}
- Current Move: ${moveNum} / ${parsed.totalMoves}
- Game Phase: ${phase}`;

      // Build conversation messages
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt },
      ];

      // Add history
      for (const msg of history) {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }

      // Add current message with board context
      const userMessage = `Current Board Position (Move ${moveNum}):
${boardAscii}

Player's Question:
${input.message}`;

      messages.push({
        role: 'user',
        content: userMessage,
      });

      try {
        // Call LLM using the user's configured provider when available.
        const llm = await getUserLLMConfig(ctx.user!.id);
        const response = await invokeLLM({ messages, model: llm.model }, llm.overrides);

        const content = response.choices[0]?.message?.content;
        const aiResponse = typeof content === 'string' ? content : 'Unable to generate response';

        // Persist both turns in a single write so the pair can't be split.
        await appendChatMessages(sessionId, [
          { role: 'user', content: input.message },
          { role: 'assistant', content: aiResponse },
        ]);

        return {
          sessionId,
          userMessage: input.message,
          aiResponse,
        };
      } catch (error) {
        console.error('[ChatReview] Error:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to get AI response' });
      }
    }),

  /**
   * Get chat history for a session
   */
  getHistory: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const session = await getChatSession(input.gameId, ctx.user!.id);
      if (!session) {
        return { sessionId: null, messages: [] };
      }

      const messages = await getChatMessages(session.id);

      return {
        sessionId: session.id,
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
        })),
      };
    }),

  /**
   * Clear chat history
   */
  clearHistory: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const session = await getChatSession(input.gameId, ctx.user!.id);
      if (!session) {
        return { success: true };
      }

      // Clear all messages by updating with empty array
      await updateChatSession(input.gameId, ctx.user!.id, []);
      return { success: true };
    }),
});
