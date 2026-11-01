// Synthetic values only.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkIdToken, decodeJwtPayload, googleAuthUrl, isOwnerEmail, safeNext } from "../../app/lib/google-auth.ts";

const good = { iss: "https://accounts.google.com", aud: "client", nonce: "n", exp: 200, email_verified: true, sub: "s1", email: "Tutor@Example.com", name: "T" };
const opts = { clientId: "client", nonce: "n", nowSeconds: 100 };

test("a valid token gives a lowercase email", () => {
  assert.deepEqual(checkIdToken(good, opts), { sub: "s1", email: "tutor@example.com", name: "T" });
});

for (const [why, change] of Object.entries({
  "wrong issuer": { iss: "https://evil.example" },
  "another app": { aud: "other" },
  "wrong nonce": { nonce: "x" },
  expired: { exp: 100 },
  "unverified email": { email_verified: false },
  "email_verified as text": { email_verified: "true" },
  "no subject": { sub: "" },
  "no email": { email: undefined },
})) {
  test(`refused: ${why}`, () => assert.equal(checkIdToken({ ...good, ...change }, opts), null));
}

test("a bad token decodes to nothing", () => {
  assert.equal(decodeJwtPayload("not-a-token"), null);
  assert.equal(decodeJwtPayload("a.%%%.c"), null);
  const body = btoa(JSON.stringify({ sub: "s" })).replace(/=+$/, "");
  assert.deepEqual(decodeJwtPayload(`h.${body}.s`), { sub: "s" });
});

test("redirects stay on this site", () => {
  assert.equal(safeNext("/admin/tutors?q=1"), "/admin/tutors?q=1");
  for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "", null]) assert.equal(safeNext(bad), null);
});

test("owner list", () => {
  assert.ok(isOwnerEmail("a@x.com", " A@x.com , b@x.com "));
  assert.ok(!isOwnerEmail("c@x.com", "a@x.com"));
  assert.ok(!isOwnerEmail("a@x.com", undefined));
  assert.ok(!isOwnerEmail("", ""));
});

test("the sign-in link uses PKCE and asks only for identity", () => {
  const u = new URL(googleAuthUrl({ clientId: "c", redirectUri: "https://x/cb", state: "s", nonce: "n", codeChallenge: "p" }));
  assert.equal(u.searchParams.get("code_challenge_method"), "S256");
  assert.equal(u.searchParams.get("scope"), "openid email profile");
});
