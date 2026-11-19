// Hikmah Tutors offline (owner, 2026-11-08: "on a call with no network the site won't even open"). Pages open from the
// last copy this phone saw when the net is gone or too slow; with the net they always come fresh. Page files (/assets,
// fonts, logo) are kept once loaded. Never kept: documents, photos, sign-in, search and other private lookups, or
// anything that is not a plain GET. Logging out wipes the saved pages, so a shared phone keeps nothing.
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const FILES = `files-${VERSION}`;
const SLOW_MS = 4000; // past this, a saved copy is shown while the net keeps trying in the background
const MAX_PAGES = 120;
const MAX_FILES = 400;

const NEVER = /^\/(api|docs|photos|voice|auth|login|logout|dev|r|admin\/(search|followups|guardian-lookup|team|inbox|tuitions\/\d+\/ai))(\/|\.data|$)/;
const FILE = /^\/(assets|fonts|brand)\/|^\/(favicon\.ico|manifest\.webmanifest)$/;
const WARM = "/admin/quick"; // the owner's call-time page is always ready
const LOGO = "/brand/mark.webp"; // the "No internet" screen's logo: kept from install on, so it shows with no net

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(FILES).then((c) => c.add(LOGO)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== PAGES && k !== FILES) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname === "/logout") return e.waitUntil(caches.delete(PAGES)); // any method: signing out forgets pages
  if (req.method !== "GET" || NEVER.test(url.pathname)) return;
  if (FILE.test(url.pathname)) return e.respondWith(fileFirst(req));
  if (req.mode === "navigate" || url.pathname.endsWith(".data")) e.respondWith(pageFirst(e, req, url));
});

async function fileFirst(req) {
  const hit = await caches.match(req, { cacheName: FILES });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === "basic") {
    const cache = await caches.open(FILES);
    await cache.put(req, res.clone());
    trim(FILES, MAX_FILES);
  }
  return res;
}

function pageFirst(e, req, url) {
  const fresh = fetch(req).then(async (res) => {
    if (res.ok && res.type === "basic" && !res.redirected) {
      const cache = await caches.open(PAGES);
      await cache.put(req, res.clone());
      trim(PAGES, MAX_PAGES);
      if (req.mode === "navigate") e.waitUntil(keepPageFiles(res.clone(), url));
    }
    return res;
  });
  e.waitUntil(fresh.catch(() => {}));
  const saved = () => caches.match(req, { cacheName: PAGES }).then((hit) => hit ?? (req.mode === "navigate" ? caches.match(req, { cacheName: PAGES, ignoreSearch: true }) : undefined));
  const slow = new Promise((r) => setTimeout(r, SLOW_MS)).then(saved);
  return Promise.race([fresh, slow.then((hit) => hit ?? fresh)]).catch(async () => (await saved()) ?? offline(req));
}

/** The scripts and styles a page names, so it also works offline, not just shows. On an admin page, Quick Pad too. */
async function keepPageFiles(res, url) {
  const html = await res.text();
  const files = await caches.open(FILES);
  const paths = [...new Set(html.match(/\/assets\/[\w.-]+\.(?:js|css)/g) ?? [])];
  for (const p of paths) if (!(await files.match(p))) await files.add(p).catch(() => {});
  if (url.pathname.startsWith("/admin") && url.pathname !== WARM && !(await caches.match(WARM, { cacheName: PAGES }))) {
    const quick = await fetch(WARM).catch(() => null);
    if (quick?.ok && !quick.redirected) {
      await (await caches.open(PAGES)).put(WARM, quick.clone());
      await keepPageFiles(quick, new URL(WARM, location.origin));
    }
  }
}

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

function offline(req) {
  if (req.mode !== "navigate") return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  return new Response(`<!doctype html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · Hikmah Tutors</title><style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#fefdf8;color:#09332a;font-family:system-ui,sans-serif;padding:16px}
main{max-width:360px;text-align:center}h1{font-size:22px;margin:16px 0 6px}p{color:#475569;line-height:1.5;margin:0 0 20px}
a{display:inline-flex;min-height:48px;align-items:center;padding:0 20px;border-radius:12px;background:#09332a;color:#fefdf8;font-weight:700;text-decoration:none;margin:4px}
a.alt{background:#fff;color:#09332a;box-shadow:inset 0 0 0 1px #cfe3d8}</style></head><body><main>
<img src="${LOGO}" alt="" width="56" height="56"><h1>No internet</h1>
<p>এই পেজটা এই ফোনে আগে খোলা হয়নি, তাই নেট ছাড়া দেখানো যাচ্ছে না। আগে খোলা পেজগুলো নেট ছাড়াও খুলবে।</p>
<a href="/admin/quick">Quick Pad</a><a class="alt" href="/">Home</a><a class="alt" href="javascript:location.reload()">Try again</a>
</main></body></html>`, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// Admin alerts (WhatsApp Inbox, owner 2026-11-18). The push carries no text: ask the site, signed in, what it is about.
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let note = { title: "Hikmah", body: "New WhatsApp message", url: "/admin/inbox" };
    try {
      const res = await fetch("/api/push", { credentials: "include", cache: "no-store" });
      if (res.ok) note = await res.json();
    } catch {}
    await self.registration.showNotification(note.title, { body: note.body, icon: LOGO, badge: LOGO, tag: note.url, renotify: true, data: { url: note.url } });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url ?? "/admin/inbox", location.origin).href;
  e.waitUntil((async () => {
    for (const c of await self.clients.matchAll({ type: "window", includeUncontrolled: true })) {
      if (c.url === url && "focus" in c) return c.focus();
    }
    return self.clients.openWindow(url);
  })());
});
