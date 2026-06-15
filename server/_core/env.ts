export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};

/**
 * Fail fast on missing critical configuration. In production a missing secret is
 * a hard error; in development we only warn so local tooling can still run.
 */
export function validateEnv(): void {
  const required: Array<[string, string]> = [
    ["JWT_SECRET", ENV.cookieSecret],
    ["DATABASE_URL", ENV.databaseUrl],
    ["OAUTH_SERVER_URL", ENV.oAuthServerUrl],
  ];

  const missing = required.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length === 0) return;

  const message = `Missing required environment variables: ${missing.join(", ")}`;
  if (ENV.isProduction) {
    throw new Error(message);
  }
  console.warn(`[env] ${message} (continuing in development)`);
}
