// The checks of Google sign-in that need no database or network, so they can be tested alone.

export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GoogleIdentity = { sub: string; email: string; name: string | null };

export function googleAuthUrl(p: { clientId: string; redirectUri: string; state: string; nonce: string; codeChallenge: string }) {
  const q = new URLSearchParams({
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: p.state,
    nonce: p.nonce,
    code_challenge: p.codeChallenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${q}`;
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const bytes = Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/**
 * The id token comes straight from Google's token endpoint over TLS, so OpenID Connect allows trusting its signature
 * without checking it; the claims below must still hold. Returns null if any fails.
 */
export function checkIdToken(claims: Record<string, unknown> | null, p: { clientId: string; nonce: string; nowSeconds: number }): GoogleIdentity | null {
  if (!claims) return null;
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return null;
  if (claims.aud !== p.clientId) return null;
  if (claims.nonce !== p.nonce) return null;
  if (typeof claims.exp !== "number" || claims.exp <= p.nowSeconds) return null;
  if (claims.email_verified !== true) return null;
  if (typeof claims.sub !== "string" || !claims.sub) return null;
  if (typeof claims.email !== "string" || !claims.email.includes("@")) return null;
  return { sub: claims.sub, email: claims.email.trim().toLowerCase(), name: typeof claims.name === "string" ? claims.name : null };
}

/** Only a path on this site, so a crafted link can't send someone elsewhere after sign-in. */
export function safeNext(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return null;
  return next;
}

export function isOwnerEmail(email: string, ownerEmails: string | undefined): boolean {
  return (ownerEmails ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email);
}
