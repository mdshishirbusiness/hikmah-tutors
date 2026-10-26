import { env } from "cloudflare:workers";

/**
 * TEMPORARY gate until Google login is added (next step).
 * Admin pages open only on your own computer during `npm run dev` with DEV_ADMIN=1 in .dev.vars.
 * A production build is always locked: import.meta.env.DEV is false there, whatever the variables say.
 * Do not deploy anything public before this is replaced by real login.
 */
export function requireAdmin(_request: Request): void {
  if (import.meta.env.DEV && (env as unknown as { DEV_ADMIN?: string }).DEV_ADMIN === "1") return;
  throw new Response("লগইন দরকার", { status: 401 });
}
