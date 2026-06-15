import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../db";
import { sdk } from "./sdk";

export async function handleOAuthCallback(request: globalThis.Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return Response.json({ error: "code and state are required" }, { status: 400 });
  }

  try {
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

    if (!userInfo.openId) {
      return Response.json({ error: "openId missing from user info" }, { status: 400 });
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

    const cookieValue = `${COOKIE_NAME}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ONE_YEAR_MS / 1000}; Secure`;
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/",
        "Set-Cookie": cookieValue,
      },
    });
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    return Response.json({ error: "OAuth callback failed" }, { status: 500 });
  }
}

// Keep Express-compatible route registration for local dev server
import type { Express, Request, Response as ExpressResponse } from "express";

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: ExpressResponse) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;

    const url = new URL(`http://localhost${req.url}`);
    const fakeRequest = new globalThis.Request(url.toString(), { method: "GET" });
    const response = await handleOAuthCallback(fakeRequest);

    // Forward status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (response.body) {
      const text = await response.text();
      res.send(text);
    } else {
      res.end();
    }
  });
}
