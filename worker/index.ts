import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/routers";
import { createWorkerContext } from "../server/_core/context";
import { handleOAuthCallback } from "../server/_core/oauth";
import { handleStorageProxy } from "../server/_core/storageProxy";
import { initDb } from "../server/db";

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  DATABASE_URL?: string;
  OAUTH_SERVER_URL: string;
  VITE_APP_ID?: string;
  OWNER_OPEN_ID?: string;
  BUILT_IN_FORGE_API_URL?: string;
  BUILT_IN_FORGE_API_KEY?: string;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Inject env into the process.env-based ENV singleton
    process.env.JWT_SECRET = env.JWT_SECRET;
    process.env.OAUTH_SERVER_URL = env.OAUTH_SERVER_URL;
    if (env.VITE_APP_ID) process.env.VITE_APP_ID = env.VITE_APP_ID;
    if (env.OWNER_OPEN_ID) process.env.OWNER_OPEN_ID = env.OWNER_OPEN_ID;
    if (env.BUILT_IN_FORGE_API_URL) process.env.BUILT_IN_FORGE_API_URL = env.BUILT_IN_FORGE_API_URL;
    if (env.BUILT_IN_FORGE_API_KEY) process.env.BUILT_IN_FORGE_API_KEY = env.BUILT_IN_FORGE_API_KEY;

    // Initialize D1 database
    initDb(env.DB);

    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/trpc/")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: () => createWorkerContext(request),
        onError: ({ error }) => console.error("[tRPC] Error:", error),
      });
    }

    if (url.pathname === "/api/oauth/callback") {
      return handleOAuthCallback(request);
    }

    if (url.pathname.startsWith("/manus-storage/")) {
      return handleStorageProxy(request);
    }

    // Serve static assets from CF Pages
    return env.ASSETS.fetch(request);
  },
};
