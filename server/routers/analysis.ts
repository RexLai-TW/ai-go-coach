import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getGameById, createReview, getReview, getGameReviews } from '../db';
import { parseSGF, getBoardStateAfterMove, getLastMoves, getGamePhase } from '../services/sgf-parser';
import { invokeLLM } from '../_core/llm';

/**
 * Analysis router: Handle AI analysis of moves and full game reviews
 */
export const analysisRouter = router({
  /**
   * Analyze a single move
   */
  analyzeMove: protectedProcedure
    .input(
      z.object({
        gameId: z.number(),
        moveNumber: z.number().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get game
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new Error('Game not found');
      }

      // Parse SGF
      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new Error('Failed to parse game');
      }

      // Validate move number
      if (input.moveNumber < 1 || input.moveNumber > parsed.moves.length) {
        throw new Error('Invalid move number');
      }

      // Check if review already exists
      const existing = await getReview(input.gameId, input.moveNumber, ctx.user!.id);
      if (existing) {
        return existing;
      }

      // Get move and board state
      const move = parsed.moves[input.moveNumber - 1];
      const board = getBoardStateAfterMove(parsed.moves, input.moveNumber);
      const lastMoves = getLastMoves(parsed.moves, input.moveNumber, 5);
      const phase = getGamePhase(input.moveNumber, parsed.totalMoves);

      // Build prompt for LLM
      const boardAscii = boardToASCIICompact(board);
      const systemPrompt = `You are an expert Go teacher. Analyze the given board position and provide educational guidance.
Guidelines:
1. Evaluate moves based on strategic principles, not exact winrates
2. Explain in simple, accessible language suitable for intermediate players
3. Suggest 2-3 alternative moves with brief reasoning
4. Describe the strategic direction and long-term implications
5. Never hallucinate exact winrates or claim certainty you don't have
6. Use Go terminology correctly (influence, territory, thickness, etc.)
7. Focus on teaching value over technical precision

Respond in Traditional Chinese.`;

      const userPrompt = `Analyze this Go position:

Move Number: ${input.moveNumber}
Player: ${move.player === 'black' ? 'Black' : 'White'}
Last Move: ${move.coordinate}
Last 5 Moves: ${lastMoves.join(', ')}
Game Phase: ${phase}

Board State:
${boardAscii}

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
    { "move": "...", "reason": "..." },
    { "move": "...", "reason": "..." }
  ],
  "strategy": "..."
}`;

      try {
        // Call LLM
        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        });

        // Parse response
        const messageContent = response.choices[0]?.message?.content;
        if (!messageContent || typeof messageContent !== 'string') {
          throw new Error('Invalid LLM response');
        }

        const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('Failed to parse LLM response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        // Save review
        await createReview({
          gameId: input.gameId,
          userId: ctx.user!.id,
          moveNumber: input.moveNumber,
          evaluation: analysis.evaluation,
          reason: analysis.reason,
          suggestedMoves: analysis.suggestedMoves,
          strategy: analysis.strategy,
        });

        return analysis;
      } catch (error) {
        console.error('[Analysis] Error analyzing move:', error);
        throw new Error('Failed to analyze move');
      }
    }),

  /**
   * Get full game analysis progress
   */
  getFullGameProgress: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      const reviews = await getGameReviews(input.gameId, ctx.user!.id);
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new Error('Game not found');
      }
      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new Error('Failed to parse game');
      }
      return {
        analyzed: reviews.length,
        total: parsed.totalMoves,
      };
    }),

  /**
   * Analyze full game (all moves)
   */
  analyzeFullGame: protectedProcedure
    .input(z.object({ gameId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get game
      const game = await getGameById(input.gameId, ctx.user!.id);
      if (!game) {
        throw new Error('Game not found');
      }

      // Parse SGF
      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new Error('Failed to parse game');
      }

      // Check existing reviews
      const existingReviews = await getGameReviews(input.gameId, ctx.user!.id);
      const reviewedMoves = new Set(existingReviews.map(r => r.moveNumber));

      // Analyze each move (skip already reviewed)
      const results = [];
      for (let i = 1; i <= parsed.moves.length; i++) {
        if (reviewedMoves.has(i)) {
          results.push(existingReviews.find(r => r.moveNumber === i));
          continue;
        }

        try {
          // Reuse analyzeMove logic
          const move = parsed.moves[i - 1];
          const board = getBoardStateAfterMove(parsed.moves, i);
          const lastMoves = getLastMoves(parsed.moves, i, 5);
          const phase = getGamePhase(i, parsed.totalMoves);

          const boardAscii = boardToASCIICompact(board);
          const systemPrompt = `You are an expert Go teacher. Analyze the given board position and provide educational guidance.
Guidelines:
1. Evaluate moves based on strategic principles, not exact winrates
2. Explain in simple, accessible language suitable for intermediate players
3. Suggest 2-3 alternative moves with brief reasoning
4. Describe the strategic direction and long-term implications
5. Never hallucinate exact winrates or claim certainty you don't have
6. Use Go terminology correctly (influence, territory, thickness, etc.)
7. Focus on teaching value over technical precision

Respond in Traditional Chinese.`;

          const userPrompt = `Analyze this Go position:

Move Number: ${i}
Player: ${move.player === 'black' ? 'Black' : 'White'}
Last Move: ${move.coordinate}
Last 5 Moves: ${lastMoves.join(', ')}
Game Phase: ${phase}

Board State:
${boardAscii}

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
    { "move": "...", "reason": "..." },
    { "move": "...", "reason": "..." }
  ],
  "strategy": "..."
}`;

          const response = await invokeLLM({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
          });

          const messageContent = response.choices[0]?.message?.content;
          if (!messageContent || typeof messageContent !== 'string') continue;

          const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
          if (!jsonMatch) continue;

          const analysis = JSON.parse(jsonMatch[0]);

          await createReview({
            gameId: input.gameId,
            userId: ctx.user!.id,
            moveNumber: i,
            evaluation: analysis.evaluation,
            reason: analysis.reason,
            suggestedMoves: analysis.suggestedMoves,
            strategy: analysis.strategy,
          });

          results.push(analysis);
        } catch (error) {
          console.error(`[Analysis] Error analyzing move ${i}:`, error);
        }
      }

      return {
        totalMoves: parsed.totalMoves,
        analyzedMoves: results.length,
        results: results.slice(0, 10),
      };
    }),

  /**
   * Get review for a specific move
   */
  getReview: protectedProcedure
    .input(
      z.object({
        gameId: z.number(),
        moveNumber: z.number(),
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
    .input(z.object({ gameId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getGameReviews(input.gameId, ctx.user!.id);
    }),
});

/**
 * Compact ASCII board representation for LLM
 */
function boardToASCIICompact(board: number[][]): string {
  let ascii = '  A B C D E F G H J K L M N O P Q R S T\n';

  for (let row = 0; row < 19; row++) {
    ascii += String(19 - row).padStart(2, ' ') + ' ';

    for (let col = 0; col < 19; col++) {
      const cell = board[row][col];
      if (cell === 0) {
        ascii += '. ';
      } else if (cell === 1) {
        ascii += '● ';
      } else if (cell === 2) {
        ascii += '○ ';
      }
    }

    ascii += '\n';
  }

  return ascii;
}
