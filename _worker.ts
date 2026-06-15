import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./server/routers";
import { createWorkerContext } from "./server/_core/context";
import { initDb } from "./server/db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "./server/db";
import { sdk } from "./server/_core/sdk";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  VITE_APP_ID: string;
  OWNER_OPEN_ID: string;
  JWT_SECRET: string;
  OAUTH_SERVER_URL: string;
  BUILT_IN_FORGE_API_URL?: string;
  BUILT_IN_FORGE_API_KEY?: string;
}

function setEnvFromBindings(env: Env) {
  process.env.VITE_APP_ID = env.VITE_APP_ID ?? "";
  process.env.OWNER_OPEN_ID = env.OWNER_OPEN_ID ?? "";
  process.env.JWT_SECRET = env.JWT_SECRET ?? "";
  process.env.OAUTH_SERVER_URL = env.OAUTH_SERVER_URL ?? "";
  if (env.BUILT_IN_FORGE_API_URL) {
    process.env.BUILT_IN_FORGE_API_URL = env.BUILT_IN_FORGE_API_URL;
  }
  if (env.BUILT_IN_FORGE_API_KEY) {
    process.env.BUILT_IN_FORGE_API_KEY = env.BUILT_IN_FORGE_API_KEY;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Initialize D1 database binding
    initDb(env.DB);

    // Propagate env vars so existing ENV singleton picks them up
    setEnvFromBindings(env);

    const url = new URL(request.url);

    // Handle tRPC API routes
    if (url.pathname.startsWith("/api/trpc")) {
      return fetchRequestHandler({
        endpoint: "/api/trpc",
        req: request,
        router: appRouter,
        createContext: () => createWorkerContext(request),
      });
    }

    // Handle OAuth callback
    if (url.pathname === "/api/oauth/callback" && request.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        return new Response(JSON.stringify({ error: "code and state are required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const tokenResponse = await sdk.exchangeCodeForToken(code, state);
        const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

        if (!userInfo.openId) {
          return new Response(JSON.stringify({ error: "openId missing from user info" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(userInfo.openId, {
          name: userInfo.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieHeader = `${COOKIE_NAME}=${sessionToken}; HttpOnly; Path=/; SameSite=None; Secure; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}`;

        return new Response(null, {
          status: 302,
          headers: {
            Location: "/",
            "Set-Cookie": cookieHeader,
          },
        });
      } catch (error) {
        console.error("[OAuth] Callback failed", error);
        return new Response(JSON.stringify({ error: "OAuth callback failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Proxy storage requests
    if (url.pathname.startsWith("/manus-storage/")) {
      const key = url.pathname.replace("/manus-storage/", "");
      if (!key) {
        return new Response("Missing storage key", { status: 400 });
      }

      const forgeApiUrl = env.BUILT_IN_FORGE_API_URL;
      const forgeApiKey = env.BUILT_IN_FORGE_API_KEY;

      if (!forgeApiUrl || !forgeApiKey) {
        return new Response("Storage proxy not configured", { status: 500 });
      }

      try {
        const forgeUrl = new URL(
          "v1/storage/presign/get",
          forgeApiUrl.replace(/\/+$/, "") + "/",
        );
        forgeUrl.searchParams.set("path", key);

        const forgeResp = await fetch(forgeUrl.toString(), {
          headers: { Authorization: `Bearer ${forgeApiKey}` },
        });

        if (!forgeResp.ok) {
          const body = await forgeResp.text().catch(() => "");
          console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
          return new Response("Storage backend error", { status: 502 });
        }

        const { url: signedUrl } = (await forgeResp.json()) as { url: string };
        if (!signedUrl) {
          return new Response("Empty signed URL from backend", { status: 502 });
        }

        return new Response(null, {
          status: 307,
          headers: {
            Location: signedUrl,
            "Cache-Control": "no-store",
          },
        });
      } catch (err) {
        console.error("[StorageProxy] failed:", err);
        return new Response("Storage proxy error", { status: 502 });
      }
    }

    // Fall through to static assets (CF Pages ASSETS binding)
    return env.ASSETS.fetch(request);
  },
};
