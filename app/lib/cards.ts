// Premium cards drawn on the phone (owner, 2026-11-05: like the Towfique HSC English share cards). A canvas, no
// library and nothing uploaded: the picture goes to the share sheet or is saved (ShareCard.tsx). Runs in the browser
// only, from a button press. Latin in Plus Jakarta Sans, Bangla in Hind Siliguri: the site's own fonts.
const C = { forest: "#09332a", forestMid: "#0f4438", emerald: "#11816d", mint: "#cfede6", pale: "#ebf6f3", mango: "#fed262", cream: "#fefdf8", ink: "#1e293b", muted: "#64748b", line: "#e2e8f0" };
const EN = '"Plus Jakarta Sans", "Hind Siliguri", sans-serif';
const BN = '"Hind Siliguri", "Plus Jakarta Sans", sans-serif';
const W = 1080, H = 1350;
const font = (weight: number, px: number, family = EN) => `${weight} ${px}px ${family}`;

async function fontsReady() {
  if (!document.fonts?.load) return;
  await Promise.all([400, 600, 800].flatMap((w) => [document.fonts.load(font(w, 40), "Aa1"), document.fonts.load(font(w, 40, BN), "অআক")])).catch(() => {});
}
const loadImg = (src: string | null) =>
  new Promise<HTMLImageElement | null>((ok) => {
    if (!src) return ok(null);
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = () => ok(null);
    i.src = src;
  });

function sheet() {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = C.cream; x.fillRect(0, 0, W, H);
  return [c, x] as const;
}
const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("canvas"))), "image/png"));

function rr(x: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, r: number, fill: string) {
  x.beginPath(); x.roundRect(X, Y, w, h, r); x.fillStyle = fill; x.fill();
}
function text(x: CanvasRenderingContext2D, s: string, X: number, Y: number, f: string, color: string, align: CanvasTextAlign = "left") {
  x.font = f; x.fillStyle = color; x.textAlign = align; x.fillText(s, X, Y); x.textAlign = "left";
}
/** Cuts a line to fit, with an ellipsis. */
function fit(x: CanvasRenderingContext2D, s: string, f: string, max: number) {
  x.font = f;
  if (x.measureText(s).width <= max) return s;
  let t = s;
  while (t.length > 1 && x.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}
/** A mango pill with dark text (mango is a fill behind dark text, never text on light). */
function pill(x: CanvasRenderingContext2D, s: string, X: number, Y: number, px = 30) {
  const f = font(800, px);
  x.font = f;
  const w = x.measureText(s).width + px * 1.4;
  rr(x, X, Y, w, px * 1.75, px * 0.875, C.mango);
  text(x, s, X + px * 0.7, Y + px * 1.22, f, C.forest);
  return w;
}
function avatar(x: CanvasRenderingContext2D, img: HTMLImageElement | null, name: string, cx: number, cy: number, r: number, ring = true) {
  if (ring) { x.beginPath(); x.arc(cx, cy, r + 10, 0, Math.PI * 2); x.fillStyle = C.mango; x.fill(); }
  x.save(); x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.clip();
  if (img) {
    const s = Math.max((2 * r) / img.width, (2 * r) / img.height);
    x.drawImage(img, cx - (img.width * s) / 2, cy - (img.height * s) / 2, img.width * s, img.height * s);
  } else {
    x.fillStyle = C.emerald; x.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    text(x, (name.trim()[0] ?? "?").toUpperCase(), cx, cy + r * 0.36, font(800, r), C.cream, "center");
  }
  x.restore();
}
/** The wide logo and the site at the foot of a card, between `L` and `R`, starting at `top`. */
async function footer(x: CanvasRenderingContext2D, note: string, top = H - 190, L = 80, R = W - 80) {
  x.fillStyle = C.line; x.fillRect(L, top, R - L, 2);
  const logo = await loadImg("/brand/logo-wide.webp");
  if (logo) {
    const h = 86, w = (logo.width / logo.height) * h;
    x.drawImage(logo, L, top + 40, w, h);
  }
  text(x, "hikmahtutor.com", R, top + 80, font(700, 28), C.forest, "right");
  text(x, note, R, top + 118, font(400, 24), C.muted, "right");
}
/** Forest from `top` down to `h`, with two quiet circles for depth. */
function band(x: CanvasRenderingContext2D, h: number, top = 0) {
  x.fillStyle = C.forest; x.fillRect(0, top, W, h - top);
  x.save(); x.beginPath(); x.rect(0, top, W, h - top); x.clip();
  x.fillStyle = C.forestMid;
  x.beginPath(); x.arc(W - 40, top + 40, 300, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.arc(W - 40, top + 40, 170, 0, Math.PI * 2); x.fillStyle = "#13513f"; x.fill();
  x.restore();
}
function row(x: CanvasRenderingContext2D, label: string, value: string, Y: number, L = 80, R = W - 80) {
  text(x, label, L, Y, font(600, 30), C.muted);
  text(x, fit(x, value, font(700, 34), R - L - 220), R, Y, font(700, 34), C.ink, "right");
  x.fillStyle = C.line; x.fillRect(L, Y + 30, R - L, 2);
}
/** A small crown: a band and three points, the middle one tallest. */
function crown(x: CanvasRenderingContext2D, X: number, Y: number, s: number, color: string) {
  x.fillStyle = color;
  x.beginPath();
  x.moveTo(X, Y + s * 0.78);
  x.lineTo(X, Y + s * 0.28); x.lineTo(X + s * 0.27, Y + s * 0.5); x.lineTo(X + s * 0.5, Y);
  x.lineTo(X + s * 0.73, Y + s * 0.5); x.lineTo(X + s, Y + s * 0.28); x.lineTo(X + s, Y + s * 0.78);
  x.closePath(); x.fill();
  x.fillRect(X, Y + s * 0.86, s, s * 0.14);
}
/** Letter spacing where the browser has it; plain text elsewhere. */
function spaced(x: CanvasRenderingContext2D, px: number) {
  if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
}
function dashedLine(x: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  x.save(); x.strokeStyle = color; x.lineWidth = 3; x.setLineDash([14, 12]);
  x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); x.restore();
}
const dot = (x: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fillStyle = color; x.fill();
};

export type WelcomeCard = { name: string; code: number; school: string; photo: string | null; no: string; from: string; till: string; areas: string; classes: string };

/** The welcome card: a ticket-style pass on the forest band (the owner chose the ticket card for the board), then the dates. */
export async function welcomeCard(d: WelcomeCard): Promise<Blob> {
  await fontsReady();
  const [c, x] = sheet();
  const photo = await loadImg(d.photo);
  band(x, 820);
  spaced(x, 5); text(x, "HIKMAH TUTORS · RAJSHAHI", 80, 112, font(700, 24), C.mint); spaced(x, 0);
  text(x, "Welcome to Premium", 80, 212, font(800, 76), C.cream);
  text(x, "Hikmah Tutors-এ আপনাকে স্বাগতম", 82, 280, font(600, 40, BN), C.mint);

  // The pass: mango, a stub on the right behind a dashed tear line, notches cut in the band colour.
  const P = { x: 80, y: 340, w: 920, h: 420 }, tear = 770;
  rr(x, P.x, P.y, P.w, P.h, 40, C.mango);
  x.save(); x.beginPath(); x.roundRect(P.x, P.y, P.w, P.h, 40); x.clip();
  x.strokeStyle = "rgba(9, 51, 42, 0.06)"; x.lineWidth = 44; x.beginPath(); x.arc(130, 790, 170, 0, Math.PI * 2); x.stroke();
  x.fillStyle = "rgba(255, 255, 255, 0.22)"; x.beginPath(); x.moveTo(560, P.y); x.lineTo(650, P.y); x.lineTo(520, P.y + P.h); x.lineTo(430, P.y + P.h); x.closePath(); x.fill();
  x.restore();
  dashedLine(x, tear, P.y + 44, tear, P.y + P.h - 44, "rgba(9, 51, 42, 0.3)");
  dot(x, tear, P.y, 30, C.forest); dot(x, tear, P.y + P.h, 30, C.forest);

  crown(x, 130, 392, 34, C.forest);
  spaced(x, 5); text(x, "PREMIUM TUTOR", 180, 422, font(800, 28), C.forest); spaced(x, 0);
  dot(x, 235, 590, 112, C.forest);
  avatar(x, photo, d.name, 235, 590, 100, false);
  text(x, fit(x, d.name, font(800, 76), 380), 372, 590, font(800, 76), C.forest);
  text(x, fit(x, `T-${d.code}${d.school ? ` · ${d.school}` : ""}`, font(600, 30), 380), 374, 642, font(600, 30), C.forestMid);
  const sx = (tear + P.x + P.w) / 2;
  spaced(x, 3); text(x, "MEMBER", sx, 430, font(700, 22), C.forestMid, "center"); spaced(x, 0);
  text(x, d.no, sx, 472, font(800, 32), C.forest, "center");
  text(x, "90", sx, 640, font(800, 130), C.forest, "center");
  spaced(x, 4); text(x, "DAYS", sx, 690, font(800, 28), C.forest, "center"); spaced(x, 0);

  // Valid from / till, then where and what they teach.
  const tile = (label: string, value: string, X: number) => {
    rr(x, X, 870, 440, 130, 28, C.pale);
    text(x, label, X + 36, 918, font(600, 26), C.emerald);
    text(x, value, X + 36, 975, font(800, 46), C.forest);
  };
  tile("Valid from", d.from, 80);
  tile("Valid till", d.till, 560);
  text(x, "Areas", 80, 1052, font(600, 26), C.muted);
  text(x, fit(x, d.areas || "—", font(700, 32), 430), 80, 1094, font(700, 32), C.ink);
  text(x, "Classes", 560, 1052, font(600, 26), C.muted);
  text(x, fit(x, d.classes || "—", font(700, 32), 440), 560, 1094, font(700, 32), C.ink);
  await footer(x, "Premium is private: only you and HTR see it");
  return toBlob(c);
}

export type ReceiptCard = {
  kind: "payment" | "refund"; no: string; amount: string; name: string; code: number; method: string; account: string; trx: string; date: string;
  lines: [string, string][];
};

/** A paper receipt on a pale table: forest head, the amount with a stamp, a tear line, then the details. */
export async function receiptCard(d: ReceiptCard): Promise<Blob> {
  await fontsReady();
  const [c, x] = sheet();
  x.fillStyle = C.pale; x.fillRect(0, 0, W, H);
  const P = { x: 60, y: 60, w: 960, h: 1230 }, L = 120, R = 960, tear = 650;
  x.save(); x.shadowColor = "rgba(9, 51, 42, 0.14)"; x.shadowBlur = 40; x.shadowOffsetY = 12;
  rr(x, P.x, P.y, P.w, P.h, 36, C.cream); x.restore();
  x.save(); x.beginPath(); x.roundRect(P.x, P.y, P.w, P.h, 36); x.clip(); band(x, 330, P.y); x.restore();

  text(x, d.kind === "payment" ? "Payment receipt" : "Refund receipt", L, 190, font(800, 68), C.cream);
  text(x, "Hikmah Tutors · Premium", L + 2, 244, font(600, 30), C.mint);
  pill(x, d.no, L, 266, 24);

  text(x, d.kind === "payment" ? "Amount paid" : "Amount refunded", L, 420, font(600, 30), C.muted);
  text(x, d.amount, L - 6, 560, font(800, 140), C.forest);

  // The stamp, turned a little, as if pressed by hand.
  x.save(); x.translate(800, 470); x.rotate(-0.22); x.globalAlpha = 0.9;
  x.strokeStyle = C.emerald; x.lineWidth = 8; x.beginPath(); x.arc(0, 0, 118, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 98, 0, Math.PI * 2); x.stroke();
  // Each line fits inside the inner ring at its height.
  spaced(x, 2); text(x, "HIKMAH TUTORS", 0, -42, font(700, 15), C.emerald, "center");
  spaced(x, 1); text(x, d.kind === "payment" ? "VERIFIED" : "REFUNDED", 0, 14, font(800, 31), C.emerald, "center");
  spaced(x, 2); text(x, d.date.toUpperCase(), 0, 54, font(700, 15), C.emerald, "center");
  spaced(x, 0); x.restore();

  dashedLine(x, P.x + 50, tear, P.x + P.w - 50, tear, C.line);
  dot(x, P.x, tear, 30, C.pale); dot(x, P.x + P.w, tear, 30, C.pale);

  let y = 730;
  for (const [k, v] of [["Tutor", `${d.name} · T-${d.code}`], [d.kind === "payment" ? "Paid by" : "Sent to", `${d.method} · ${d.account}`], ["TrxID", d.trx], ["Date", d.date], ...d.lines] as [string, string][]) {
    row(x, k, v, y, L, R);
    y += 72;
  }
  await footer(x, d.kind === "payment" ? "Premium deposit = media fee paid in advance" : "Refunded by Hikmah Tutors", 1140, L, R);
  return toBlob(c);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "05 Nov 2026", Dhaka time. */
export function cardDate(unix: number) {
  const d = new Date((unix + 6 * 3600) * 1000);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
/** "017••••4321": the number on a card, so a forwarded picture doesn't carry it whole. */
export const maskPhone = (p: string | null) => (p ? `${p.slice(0, 3)}••••${p.slice(-4)}` : "—");

// ---------- The three Premium cards, from a term ----------

type Term = {
  id: number; price: number; areas: string; anywhere: number; classes: string; starts_at: number | null; ends_at: number | null;
  pay_method: string | null; pay_from: string | null; pay_trx: string | null; pay_amount: number | null; verified_at: number | null;
  refund_amount: number | null; refund_trx: string | null; refund_sent_at: number | null; end_reason: string | null;
};
type Person = { name: string; code: number; school: string; hasPhoto: boolean };
const METHOD: Record<string, string> = { bkash: "bKash", nagad: "Nagad" };
const pad = (id: number) => String(id).padStart(4, "0");
const tk = (n: number) => `৳${new Intl.NumberFormat("en-IN").format(n)}`;

export function welcomeOf(m: Term, p: Person, labels: { areas: string; classes: string }): WelcomeCard {
  return {
    name: p.name, code: p.code, school: p.school, photo: p.hasPhoto ? `/photos/tutor/${p.code}` : null, no: `No. ${pad(m.id)}`,
    from: m.starts_at ? cardDate(m.starts_at) : "—", till: m.ends_at ? cardDate(m.ends_at) : "—",
    areas: m.anywhere ? "Anywhere in Rajshahi" : labels.areas, classes: labels.classes,
  };
}
export function paymentOf(m: Term, p: Person): ReceiptCard {
  return {
    kind: "payment", no: `PRM-${pad(m.id)}`, amount: tk(m.pay_amount ?? m.price), name: p.name, code: p.code,
    method: METHOD[m.pay_method ?? ""] ?? "—", account: maskPhone(m.pay_from), trx: m.pay_trx ?? "—", date: m.verified_at ? cardDate(m.verified_at) : "—",
    lines: [["Valid till", m.ends_at ? cardDate(m.ends_at) : "—"]],
  };
}
const REASON: Record<string, string> = { delivered: "Deposit above the fee", day90_refund: "90 days, no tuition", problems: "Premium ended (3 problems)", htr_stopped: "Stopped by HTR" };
export function refundOf(m: Term, p: Person): ReceiptCard {
  return {
    kind: "refund", no: `RFD-${pad(m.id)}`, amount: tk(m.refund_amount ?? 0), name: p.name, code: p.code,
    method: METHOD[m.pay_method ?? ""] ?? "—", account: maskPhone(m.pay_from), trx: m.refund_trx ?? "—", date: m.refund_sent_at ? cardDate(m.refund_sent_at) : "—",
    lines: [["Reason", REASON[m.end_reason ?? ""] ?? "Refund"], ["For receipt", `PRM-${pad(m.id)}`]],
  };
}
