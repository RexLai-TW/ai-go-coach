import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { gamesRouter } from "./routers/games";
import { analysisRouter } from "./routers/analysis";
import { chatReviewRouter } from "./routers/chatReview";
import { llmSettingsRouter } from "./routers/llmSettings";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(() => {
      // Return a Set-Cookie header to clear the session cookie
      // The client should redirect to / after calling this
      return {
        success: true,
        clearCookie: `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure`,
      } as const;
    }),
  }),

  // Feature routers
  games: gamesRouter,
  analysis: analysisRouter,
  chatReview: chatReviewRouter,
  llmSettings: llmSettingsRouter,
});

export type AppRouter = typeof appRouter;
