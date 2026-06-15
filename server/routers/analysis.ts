import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { getGameById, createReview, getReview, getGameReviews } from '../db';
import {
  parseSGF,
  getBoardStateAfterMove,
  getLastMoves,
  getGamePhase,
  boardToASCIICompact,
  type Move,
  type ParsedGame,
} from '../services/sgf-parser';
import { invokeLLM } from '../_core/llm';
import { getUserLLMConfig, type ResolvedLLMConfig } from '../services/llm-config';
import { MOVE_EVALUATIONS } from '@shared/const';

/**
 * Analysis router: Handle AI analysis of moves and full game reviews
 */

const ANALYSIS_SYSTEM_PROMPT = `You are an expert Go teacher. Analyze the given board position and provide educational guidance.
Guidelines:
1. Evaluate moves based on strategic principles, not exact winrates
2. Explain in simple, accessible language suitable for intermediate players
3. Suggest 2-3 alternative moves with brief reasoning
4. Describe the strategic direction and long-term implications
5. Never hallucinate exact winrates or claim certainty you don't have
6. Use Go terminology correctly (influence, territory, thickness, etc.)
7. Focus on teaching value over technical precision

Respond in Traditional Chinese.`;

function buildUserPrompt(args: {
  moveNumber: number;
  move: Move;
  lastMoves: string[];
  phase: string;
  boardAscii: string;
}): string {
  return `Analyze this Go position:

Move Number: ${args.moveNumber}
Player: ${args.move.player === 'black' ? 'Black' : 'White'}
Last Move: ${args.move.coordinate}
Last 5 Moves: ${args.lastMoves.join(', ')}
Game Phase: ${args.phase}

Board State:
${args.boardAscii}

Provide:
1. Move Evaluation: Rate the move
2. Explanation: Why in 2-3 sentences?
3. Alternative Moves: Suggest 2 better moves with brief reasoning
4. Strategic Direction: What's the player trying to achieve?

Format your response as JSON:
{
  "evaluation": "${MOVE_EVALUATIONS.join('|')}",
  "reason": "...",
  "suggestedMoves": [
    { "move": "...", "reason": "..." },
    { "move": "...", "reason": "..." }
  ],
  "strategy": "..."
}`;
}

interface MoveAnalysis {
  evaluation: string;
  reason: string;
  suggestedMoves: Array<{ move: string; reason: string }>;
  strategy: string;
}

/**
 * Run the LLM on a single move and persist the review. Returns the parsed analysis.
 * Throws on LLM/parse failure so callers can decide how to handle it.
 */
async function analyzeMoveAt(
  parsed: ParsedGame,
  gameId: number,
  userId: number,
  moveNumber: number,
  llm: ResolvedLLMConfig
): Promise<MoveAnalysis> {
  const move = parsed.moves[moveNumber - 1];
  const board = getBoardStateAfterMove(parsed.moves, moveNumber);
  const lastMoves = getLastMoves(parsed.moves, moveNumber, 5);
  const phase = getGamePhase(moveNumber, parsed.totalMoves);
  const boardAscii = boardToASCIICompact(board);

  const response = await invokeLLM(
    {
      messages: [
        { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt({ moveNumber, move, lastMoves, phase, boardAscii }) },
      ],
      model: llm.model,
    },
    llm.overrides
  );

  const messageContent = response.choices[0]?.message?.content;
  if (!messageContent || typeof messageContent !== 'string') {
    throw new Error('Invalid LLM response');
  }

  const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse LLM response');
  }

  let analysis: MoveAnalysis;
  try {
    analysis = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('LLM returned malformed JSON');
  }

  await createReview({
    gameId,
    userId,
    moveNumber,
    evaluation: analysis.evaluation,
    reason: analysis.reason,
    suggestedMoves: analysis.suggestedMoves,
    strategy: analysis.strategy,
  });

  return analysis;
}

export const analysisRouter = router({
  /**
   * Analyze a single move
   */
  analyzeMove: protectedProcedure
    .input(
      z.object({
        gameId: z.number().int().positive(),
        moveNumber: z.number().int().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to parse game' });
      }

      if (input.moveNumber > parsed.moves.length) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid move number' });
      }

      // Return existing review if already analyzed
      const existing = await getReview(input.gameId, input.moveNumber, ctx.user!.id);
      if (existing) {
        return existing;
      }

      try {
        const llm = await getUserLLMConfig(ctx.user!.id);
        return await analyzeMoveAt(parsed, input.gameId, ctx.user!.id, input.moveNumber, llm);
      } catch (error) {
        console.error('[Analysis] Error analyzing move:', error);
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to analyze move' });
      }
    }),

  /**
   * Get full game analysis progress
   */
  getFullGameProgress: protectedProcedure
    .input(z.object({ gameId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }
      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to parse game' });
      }
      const reviews = await getGameReviews(input.gameId, ctx.user!.id);
      return {
        analyzed: reviews.length,
        total: parsed.totalMoves,
        isComplete: reviews.length >= parsed.totalMoves,
      };
    }),

  /**
   * Analyze a batch of the next unreviewed moves (capped to avoid request timeouts).
   * The client polls getFullGameProgress and re-invokes this until isComplete.
   */
  analyzeFullGame: protectedProcedure
    .input(z.object({ gameId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to parse game' });
      }

      const existingReviews = await getGameReviews(input.gameId, ctx.user!.id);
      const reviewedMoves = new Set(existingReviews.map(r => r.moveNumber));

      // Analyze at most 5 new moves per request to stay under the timeout limit.
      const batchSize = 5;
      let newReviewsCount = 0;
      const llm = await getUserLLMConfig(ctx.user!.id);

      for (let i = 1; i <= parsed.moves.length && newReviewsCount < batchSize; i++) {
        if (reviewedMoves.has(i)) continue;

        try {
          await analyzeMoveAt(parsed, input.gameId, ctx.user!.id, i, llm);
          newReviewsCount++;
        } catch (error) {
          console.error(`[Analysis] Error analyzing move ${i}:`, error);
        }
      }

      const analyzedMoves = existingReviews.length + newReviewsCount;
      return {
        totalMoves: parsed.totalMoves,
        analyzedMoves,
        newAnalyzed: newReviewsCount,
        isComplete: analyzedMoves >= parsed.totalMoves,
      };
    }),

  /**
   * Get review for a specific move
   */
  getReview: protectedProcedure
    .input(
      z.object({
        gameId: z.number().int().positive(),
        moveNumber: z.number().int(),
      })
    )
    .query(async ({ ctx, input }) => {
      const review = await getReview(input.gameId, input.moveNumber, ctx.user!.id);
      return review || null;
    }),

  /**
   * Get all reviews for a game
   */
  getGameReviews: protectedProcedure
    .input(z.object({ gameId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return await getGameReviews(input.gameId, ctx.user!.id);
    }),
});
