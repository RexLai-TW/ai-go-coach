import { ENV } from "./env";

export async function handleStorageProxy(request: globalThis.Request): Promise<Response> {
  const url = new URL(request.url);
  const key = url.pathname.replace(/^\/manus-storage\//, "");

  if (!key) {
    return new Response("Missing storage key", { status: 400 });
  }

  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
    return new Response("Storage proxy not configured", { status: 500 });
  }

  try {
    const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
    forgeUrl.searchParams.set("path", key);

    const forgeResp = await fetch(forgeUrl.toString(), {
      headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
    });

    if (!forgeResp.ok) {
      const body = await forgeResp.text().catch(() => "");
      console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
      return new Response("Storage backend error", { status: 502 });
    }

    const { url: signedUrl } = await forgeResp.json() as { url: string };
    if (!signedUrl) {
      return new Response("Empty signed URL from backend", { status: 502 });
    }

    return Response.redirect(signedUrl, 307);
  } catch (err) {
    console.error("[StorageProxy] failed:", err);
    return new Response("Storage proxy error", { status: 502 });
  }
}

// Keep Express-compatible route registration for local dev server
import type { Express } from "express";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const url = new URL(`http://localhost${req.url}`);
    const fakeRequest = new globalThis.Request(url.toString(), { method: "GET" });
    const response = await handleStorageProxy(fakeRequest);

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
