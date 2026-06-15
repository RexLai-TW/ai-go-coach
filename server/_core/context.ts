import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: globalThis.Request;
  user: User | null;
};

export async function createWorkerContext(req: globalThis.Request): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(req);
  } catch {
    user = null;
  }
  return { req, user };
}

// Keep Express-compatible context creator for local dev server
export { createWorkerContext as createContext };
