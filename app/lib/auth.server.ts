import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import { GOOGLE_TOKEN_URL, checkIdToken, decodeJwtPayload, googleAuthUrl, isOwnerEmail, safeNext } from "./google-auth";

type AuthEnv = {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  OWNER_EMAILS?: string; // comma-separated; the only way to become an admin
  DEV_ADMIN?: string;
  DEV_GOOGLE_TOKEN_URL?: string;
};
const authEnv = env as unknown as AuthEnv;

export type Viewer = { id: number; email: string; name: string | null; role: "owner" | "tutor" };

const SESSION_COOKIE = "hikmah_session";
const FLOW_COOKIE = "hikmah_google_flow";
const SESSION_SECONDS = 30 * 24 * 3600;
const FLOW_SECONDS = 600;

const now = () => Math.floor(Date.now() / 1000);
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randomToken = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
const sha256 = async (text: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
const hashToken = async (token: string) => [...(await sha256(token))].map((b) => b.toString(16).padStart(2, "0")).join("");

function readCookie(request: Request, name: string): string | null {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function cookie(request: Request, name: string, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function getViewer(request: Request): Promise<Viewer | null> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await hashToken(token), now()).first<Viewer>();
}

/** Browsers send Origin on form posts. A post from another site is refused even if the cookie came along. */
function checkSameOrigin(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) throw new Response("অনুমতি নেই", { status: 403 });
}

function refuseOrLogin(request: Request): never {
  if (request.method !== "GET" && request.method !== "HEAD") throw new Response("লগইন দরকার", { status: 401 }); // Quick Pad keeps the lead queued
  const url = new URL(request.url);
  throw redirect(`/login?next=${encodeURIComponent(url.pathname.replace(/\.data$/, "") + url.search)}`);
}

/** Every /admin loader and action must await this. Returns null only on the temporary dev bypass. */
export async function requireAdmin(request: Request): Promise<Viewer | null> {
  checkSameOrigin(request);
  const viewer = await getViewer(request);
  if (viewer) {
    if (viewer.role !== "owner") throw new Response("এই পাতাটি শুধু অ্যাডমিনের জন্য", { status: 403 });
    return viewer;
  }
  // A production build is always locked: import.meta.env.DEV is false there, whatever the variables say.
  if (import.meta.env.DEV && authEnv.DEV_ADMIN === "1") return null;
  refuseOrLogin(request);
}

export async function requireUser(request: Request): Promise<Viewer> {
  checkSameOrigin(request);
  const viewer = await getViewer(request);
  if (!viewer) refuseOrLogin(request);
  return viewer;
}

export const homeFor = (viewer: Viewer) => (viewer.role === "owner" ? "/admin" : "/me");

export const googleConfigured = () => Boolean(authEnv.GOOGLE_CLIENT_ID && authEnv.GOOGLE_CLIENT_SECRET);

const redirectUri = (request: Request) => `${new URL(request.url).origin}/auth/google/callback`;

/** Step 1: send the browser to Google, remembering what must match when it comes back. */
export async function startGoogleSignIn(request: Request) {
  const state = randomToken(), nonce = randomToken(), verifier = randomToken();
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const flow = base64url(new TextEncoder().encode(JSON.stringify({ state, nonce, verifier, next })));
  return redirect(
    googleAuthUrl({ clientId: authEnv.GOOGLE_CLIENT_ID!, redirectUri: redirectUri(request), state, nonce, codeChallenge: base64url(await sha256(verifier)) }),
    { headers: { "Set-Cookie": cookie(request, FLOW_COOKIE, flow, FLOW_SECONDS), "Cache-Control": "no-store" } },
  );
}

function readFlow(request: Request): { state: string; nonce: string; verifier: string; next: string | null } | null {
  const raw = readCookie(request, FLOW_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(atob(raw.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

const failed = (request: Request) => {
  const headers = new Headers({ "Set-Cookie": cookie(request, FLOW_COOKIE, "", 0) });
  return redirect("/login?error=1", { headers });
};

/** Step 2: Google sent the browser back. Check everything, then sign in and link the tutor record. */
export async function finishGoogleSignIn(request: Request) {
  const url = new URL(request.url);
  const flow = readFlow(request);
  const code = url.searchParams.get("code");
  if (!flow || !code || url.searchParams.get("state") !== flow.state) return failed(request);

  // The override exists only in `npm run dev`, so sign-in can be tested without Google.
  const tokenUrl = (import.meta.env.DEV && authEnv.DEV_GOOGLE_TOKEN_URL) || GOOGLE_TOKEN_URL;
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: authEnv.GOOGLE_CLIENT_ID!,
      client_secret: authEnv.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(request),
      grant_type: "authorization_code",
      code_verifier: flow.verifier,
    }),
  });
  if (!response.ok) return failed(request);
  const { id_token: idToken } = (await response.json()) as { id_token?: string };
  const identity = checkIdToken(idToken ? decodeJwtPayload(idToken) : null, { clientId: authEnv.GOOGLE_CLIENT_ID!, nonce: flow.nonce, nowSeconds: now() });
  if (!identity) return failed(request);

  const t = now();
  const role = isOwnerEmail(identity.email, authEnv.OWNER_EMAILS) ? "owner" : "tutor";
  let user: Viewer | null = null;
  try {
    user = await env.DB.prepare(
      `INSERT INTO users (google_sub, email, name, role, created_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, role = excluded.role, last_login_at = excluded.last_login_at
       RETURNING id, email, name, role`,
    ).bind(identity.sub, identity.email, identity.name, role, t, t).first<Viewer>();
  } catch {
    // The email already belongs to another Google account's user row. Never merge them silently.
  }
  if (!user) return failed(request);

  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM sessions WHERE expires_at <= ?`).bind(t),
    env.DB.prepare(`INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)`).bind(await hashToken(token), user.id, t, t + SESSION_SECONDS),
    // The form collected this email from the tutor's Google account, and the unique index allows one tutor per email.
    env.DB.prepare(`UPDATE tutors SET user_id = ?, claim_status = 'claimed', updated_at = ? WHERE email = ? AND user_id IS NULL AND deleted_at IS NULL`).bind(user.id, t, identity.email),
    env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, created_at) VALUES (?, 'signed_in', 'user', ?, ?)`).bind(user.id, String(user.id), t),
  ]);

  const headers = new Headers({ "Cache-Control": "no-store" });
  headers.append("Set-Cookie", cookie(request, SESSION_COOKIE, token, SESSION_SECONDS));
  headers.append("Set-Cookie", cookie(request, FLOW_COOKIE, "", 0));
  return redirect(flow.next ?? homeFor(user), { headers });
}

export async function signOut(request: Request) {
  checkSameOrigin(request);
  const token = readCookie(request, SESSION_COOKIE);
  if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`).bind(await hashToken(token)).run();
  return redirect("/", { headers: { "Set-Cookie": cookie(request, SESSION_COOKIE, "", 0) } });
}
