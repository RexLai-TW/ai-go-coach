import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { protectedProcedure, router } from '../_core/trpc';
import { createGame, getUserGames, getGameById, deleteGame } from '../db';
import { parseSGF } from '../services/sgf-parser';

const MAX_SGF_BYTES = 2_000_000;

/**
 * Games router: Handle SGF upload, retrieval, and deletion
 */
export const gamesRouter = router({
  /**
   * Upload a new SGF game
   */
  upload: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        sgfContent: z
          .string()
          .min(10, 'SGF content too short')
          .max(MAX_SGF_BYTES, 'SGF content too large'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate SGF format
      const parsed = parseSGF(input.sgfContent);
      if (!parsed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid SGF format' });
      }

      // Create game record
      const gameId = await createGame(ctx.user!.id, {
        title: input.title || `Game ${new Date().toLocaleDateString()}`,
        description: input.description,
        sgfContent: input.sgfContent,
        playerBlack: parsed.metadata.playerBlack,
        playerWhite: parsed.metadata.playerWhite,
        result: parsed.metadata.result,
        komi: parsed.metadata.komi?.toString(),
        handicap: parsed.metadata.handicap,
      });

      return {
        gameId,
        totalMoves: parsed.totalMoves,
        message: 'Game uploaded successfully',
      };
    }),

  /**
   * List all games for current user
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const games = await getUserGames(ctx.user!.id);

      // Apply pagination
      const paginated = games.slice(input.offset, input.offset + input.limit);

      return {
        total: games.length,
        games: paginated.map(g => ({
          id: g.id,
          title: g.title,
          playerBlack: g.playerBlack,
          playerWhite: g.playerWhite,
          result: g.result,
          uploadedAt: g.uploadedAt,
        })),
      };
    }),

  /**
   * Get a single game with full SGF content
   */
  get: protectedProcedure
    .input(z.object({ gameId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const game = await getGameById(input.gameId, ctx.user!.id);

      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      // Parse SGF to get move details
      const parsed = parseSGF(game.sgfContent);
      if (!parsed) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Failed to parse game SGF' });
      }

      return {
        id: game.id,
        title: game.title,
        description: game.description,
        playerBlack: game.playerBlack,
        playerWhite: game.playerWhite,
        result: game.result,
        komi: game.komi,
        handicap: game.handicap,
        totalMoves: parsed.totalMoves,
        uploadedAt: game.uploadedAt,
        moves: parsed.moves,
      };
    }),

  /**
   * Delete a game
   */
  delete: protectedProcedure
    .input(z.object({ gameId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const game = await getGameById(input.gameId, ctx.user!.id);

      if (!game) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Game not found' });
      }

      await deleteGame(input.gameId, ctx.user!.id);

      return { success: true };
    }),
});
