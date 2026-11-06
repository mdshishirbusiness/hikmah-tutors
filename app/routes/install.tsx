// /install (owner, 2026-11-06): one link to send on WhatsApp or Facebook. It finds the phone and browser and shows only
// the steps for it. Facebook and Messenger open links in their own browser, which cannot install, so those first go to
// Chrome or Safari. No loader: the page never touches the database.
import { type ReactNode, useEffect, useState } from "react";
import { Link } from "react-router";
import { Check, CircleCheck, Copy, Download, Ellipsis, EllipsisVertical, ExternalLink, HardDrive, Menu, Share, Smartphone, SquarePlus, Zap } from "lucide-react";
import type { Route } from "./+types/install";
import { PageShell, buttonClass } from "~/components/site";
import { promptInstall, useInstall } from "~/components/InstallApp";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Install the app · Hikmah Tutors" },
    { name: "description", content: "Play Store ছাড়াই Hikmah Tutors অ্যাপ ফোনে ইনস্টল করুন। Android ও iPhone-এর সহজ ধাপ।" },
  ];
}

type Kind = "chrome" | "samsung" | "android-other" | "inapp-android" | "ios-safari" | "ios-chrome" | "ios-other" | "inapp-ios" | "desktop";

function detect(): Kind {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /android/i.test(ua);
  if (/FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|; wv\)/i.test(ua)) return ios ? "inapp-ios" : android ? "inapp-android" : "desktop";
  if (ios) return /CriOS/i.test(ua) ? "ios-chrome" : /FxiOS|EdgiOS|OPiOS/i.test(ua) ? "ios-other" : "ios-safari";
  if (android) {
    if (/SamsungBrowser/i.test(ua)) return "samsung";
    return /Chrome\//i.test(ua) && !/MiuiBrowser|XiaoMi|OPR\/|EdgA|UCBrowser|YaBrowser|HeyTap|VivoBrowser|Firefox/i.test(ua) ? "chrome" : "android-other";
  }
  return "desktop";
}

// ---------- Small pictures of what the tutor will see ----------

/** A phone menu with the row to tap lit in mango. */
function MenuPic({ rows, pick }: { rows: string[]; pick: string }) {
  return (
    <div aria-hidden className="mt-3 w-full max-w-64 overflow-hidden rounded-xl bg-white py-1 text-sm shadow-card ring-1 ring-slate-200">
      {rows.map((r) => (
        <div key={r} className={`flex items-center justify-between px-3 py-2 ${r === pick ? "bg-mango font-bold text-forest" : "text-slate-400"}`}>
          {r}{r === pick && <span className="text-xs">← tap</span>}
        </div>
      ))}
    </div>
  );
}

/** A browser bar with one button circled. */
function BarPic({ icons, pick, top = false }: { icons: ReactNode[]; pick: number; top?: boolean }) {
  return (
    <div aria-hidden className={`mt-3 flex w-full max-w-64 items-center justify-around rounded-xl bg-slate-100 px-2 py-2 text-slate-400 ring-1 ring-slate-200 ${top ? "" : "rounded-t-none border-t-4 border-slate-200"}`}>
      {icons.map((icon, i) => (
        <span key={i} className={`grid size-9 place-items-center rounded-full ${i === pick ? "bg-mango text-forest ring-4 ring-mango/40" : ""}`}>{icon}</span>
      ))}
    </div>
  );
}

const I = (Icon: typeof Share) => <Icon size={18} strokeWidth={2.25} />;
const dots = <EllipsisVertical size={15} className="inline align-[-2px]" aria-label="three dots" />;
const share = <Share size={15} className="inline align-[-2px]" aria-label="Share" />;

type Step = { text: ReactNode; pic?: ReactNode };

const ANDROID_CHROME: Step[] = [
  { text: <>Chrome-এর উপরে ডান কোণে {dots} চাপুন।</>, pic: <BarPic top icons={[I(Smartphone), <span key="u" className="h-3 w-24 rounded-full bg-white" />, I(EllipsisVertical)]} pick={2} /> },
  { text: <>"Install app" বা "Add to Home screen" চাপুন।</>, pic: <MenuPic rows={["New tab", "History", "Install app", "Settings"]} pick="Install app" /> },
  { text: <>"Install" চাপুন। হোম স্ক্রিনে Hikmah Tutors আইকন চলে আসবে।</> },
];

const SAMSUNG: Step[] = [
  { text: <>নিচের বারে ডানে <Menu size={15} className="inline align-[-2px]" aria-label="menu" /> চাপুন।</>, pic: <BarPic icons={[I(Smartphone), I(SquarePlus), I(Menu)]} pick={2} /> },
  { text: <>"Add page to" চাপুন, তারপর "Home screen"।</>, pic: <MenuPic rows={["Bookmarks", "Add page to", "Settings"]} pick="Add page to" /> },
  { text: <>"Add" চাপুন। হোম স্ক্রিনে Hikmah Tutors আইকন চলে আসবে।</> },
];

const IOS_SAFARI: Step[] = [
  { text: <>Safari-র নিচে মাঝখানে {share} (Share) চাপুন।</>, pic: <BarPic icons={[I(Smartphone), I(Share), I(Ellipsis)]} pick={1} /> },
  { text: <>একটু নিচে নেমে "Add to Home Screen" চাপুন।</>, pic: <MenuPic rows={["Copy", "Add to Favourites", "Add to Home Screen", "Find on Page"]} pick="Add to Home Screen" /> },
  { text: <>উপরে ডানে "Add" চাপুন। হোম স্ক্রিনে Hikmah Tutors আইকন চলে আসবে।</> },
];

const IOS_CHROME: Step[] = [
  { text: <>Chrome-এ ঠিকানার ঘরের ডান পাশে {share} (Share) চাপুন।</>, pic: <BarPic top icons={[<span key="u" className="h-3 w-24 rounded-full bg-white" />, I(Share)]} pick={1} /> },
  { text: <>"Add to Home Screen" চাপুন, তারপর "Add"।</>, pic: <MenuPic rows={["Copy", "Add to Home Screen", "Find in Page"]} pick="Add to Home Screen" /> },
];

const INAPP_ANDROID: Step[] = [
  { text: <>উপরে ডান কোণে {dots} চাপুন।</> },
  { text: <>"Open in Chrome" বা "Open in external browser" চাপুন। Chrome-এ এই পেজটাই খুলবে, সেখানে Install বাটন পাবেন।</>, pic: <MenuPic rows={["Refresh", "Copy link", "Open in Chrome"]} pick="Open in Chrome" /> },
];

const INAPP_IOS: Step[] = [
  { text: <>উপরে বা নিচে ডান কোণে <Ellipsis size={15} className="inline align-[-2px]" aria-label="three dots" /> চাপুন।</> },
  { text: <>"Open in Safari" বা "Open in external browser" চাপুন। তারপর নিচের iPhone-এর ধাপ।</>, pic: <MenuPic rows={["Copy link", "Open in Safari"]} pick="Open in Safari" /> },
];

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-sm font-extrabold text-cream">{i + 1}</span>
          <div className="min-w-0 flex-1 pt-1.5 text-slate-800">{s.text}{s.pic}</div>
        </li>
      ))}
    </ol>
  );
}

// ---------- Page ----------

function CopyLink({ className = "" }: { className?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const url = `${location.origin}/install`;
    try { await navigator.clipboard.writeText(url); } catch {
      const t = Object.assign(document.createElement("textarea"), { value: url });
      document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 2500);
  }
  return (
    <button type="button" onClick={copy} className={buttonClass("secondary", className)}>
      {done ? <><Check size={18} aria-hidden />Copied</> : <><Copy size={18} aria-hidden />Copy link</>}
    </button>
  );
}

function ForThisPhone({ kind, canPrompt }: { kind: Kind; canPrompt: boolean }) {
  const [busy, setBusy] = useState(false);
  if (canPrompt) {
    return (
      <Card title="Install in one tap" tag={kind === "desktop" ? "This computer" : "This phone"}>
        <p className="text-slate-700">নিচের বাটন চাপুন, তারপর ছোট বক্সে "Install" চাপুন।</p>
        <button type="button" disabled={busy} onClick={async () => { setBusy(true); await promptInstall(); setBusy(false); }}
          className={buttonClass("mango", "mt-4 min-h-14 w-full text-lg font-extrabold")}>
          <Download size={22} aria-hidden />Install app
        </button>
      </Card>
    );
  }
  if (kind === "inapp-android") {
    const chrome = `intent://${location.host}/install#Intent;scheme=${location.protocol.replace(":", "")};package=com.android.chrome;end`;
    return (
      <Card title="First, open in Chrome" tag="Facebook / Messenger">
        <p className="text-slate-700">Facebook বা Messenger-এর ভেতর থেকে অ্যাপ ইনস্টল হয় না। আগে Chrome-এ খুলুন।</p>
        <a href={chrome} className={buttonClass("mango", "mt-4 min-h-14 w-full text-lg font-extrabold")}><ExternalLink size={20} aria-hidden />Open in Chrome</a>
        <p className="mt-5 text-sm font-bold text-forest">বাটনে কাজ না হলে:</p>
        <div className="mt-3"><Steps steps={INAPP_ANDROID} /></div>
      </Card>
    );
  }
  if (kind === "inapp-ios") {
    return (
      <Card title="First, open in Safari" tag="Facebook / Messenger">
        <p className="text-slate-700">Facebook বা Messenger-এর ভেতর থেকে অ্যাপ ইনস্টল হয় না। আগে Safari-তে খুলুন।</p>
        <div className="mt-4"><Steps steps={INAPP_IOS} /></div>
        <p className="mt-5 text-sm text-slate-600">অথবা লিংক কপি করে Safari-র ঠিকানার ঘরে paste করুন।</p>
        <CopyLink className="mt-3 w-full" />
      </Card>
    );
  }
  if (kind === "android-other") {
    return (
      <Card title="Open in Chrome" tag="This phone">
        <p className="text-slate-700">এই browser-এ ইনস্টল ঠিকমতো হয় না। লিংক কপি করে Chrome-এ খুলুন, তারপর নিচের ধাপ।</p>
        <CopyLink className="mt-4 w-full" />
        <div className="mt-5"><Steps steps={ANDROID_CHROME} /></div>
      </Card>
    );
  }
  if (kind === "ios-other") {
    return (
      <Card title="Open in Safari" tag="This iPhone">
        <p className="text-slate-700">লিংক কপি করে Safari-তে খুলুন, তারপর নিচের ধাপ।</p>
        <CopyLink className="mt-4 w-full" />
        <div className="mt-5"><Steps steps={IOS_SAFARI} /></div>
      </Card>
    );
  }
  if (kind === "desktop") {
    return (
      <Card title="On a computer" tag="This computer">
        <p className="text-slate-700">Chrome বা Edge-এ ঠিকানার ঘরের ডান পাশে Install আইকন চাপুন। ফোনে ইনস্টল করতে চাইলে লিংকটা ফোনে পাঠান।</p>
        <CopyLink className="mt-4 w-full" />
      </Card>
    );
  }
  const steps = kind === "samsung" ? SAMSUNG : kind === "ios-safari" ? IOS_SAFARI : kind === "ios-chrome" ? IOS_CHROME : ANDROID_CHROME;
  return <Card title="3 quick steps" tag={kind.startsWith("ios") ? "This iPhone" : "This phone"}><Steps steps={steps} /></Card>;
}

function Card({ title, tag, children }: { title: string; tag: string; children: ReactNode }) {
  return (
    <section className="animate-rise rounded-3xl bg-white p-5 shadow-ring sm:p-7">
      <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{tag}</span>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-forest">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

const OTHERS: [string, Step[]][] = [
  ["Android · Chrome", ANDROID_CHROME],
  ["Android · Samsung Internet", SAMSUNG],
  ["iPhone · Safari", IOS_SAFARI],
  ["Opened from Facebook or Messenger", INAPP_ANDROID],
];

const WHY = [
  [Zap, "হোম স্ক্রিন থেকে এক ট্যাপে খুলবে"],
  [Smartphone, "Play Store লাগবে না"],
  [HardDrive, "ফোনের জায়গা প্রায় লাগে না"],
] as const;

export default function Install() {
  const install = useInstall();
  const [kind, setKind] = useState<Kind | null>(null);
  useEffect(() => setKind(detect()), []);
  const share = typeof window === "undefined" ? "" : `https://wa.me/?text=${encodeURIComponent(`Hikmah Tutors অ্যাপ ফোনে ইনস্টল করুন: ${location.origin}/install`)}`;

  return (
    <PageShell title="Install the app" sub="Play Store ছাড়াই, এক মিনিটে। নতুন টিউশন দেখতে আর আবেদন করতে বারবার লিংক খুঁজতে হবে না।">
      {!install || !kind ? (
        <div className="h-72 animate-pulse rounded-3xl bg-white shadow-ring" />
      ) : install.installed ? (
        <Card title="The app is installed" tag="Done">
          <p className="flex items-start gap-2 text-slate-700"><CircleCheck size={22} className="shrink-0 text-brand-600" aria-hidden />হোম স্ক্রিনের Hikmah Tutors আইকন থেকে খুলুন।</p>
          <Link to="/" className={buttonClass("forest", "mt-4 w-full")}>Tuition board</Link>
        </Card>
      ) : (
        <ForThisPhone kind={kind} canPrompt={install.canPrompt} />
      )}

      <ul className="grid gap-2 sm:grid-cols-3">
        {WHY.map(([Icon, text]) => (
          <li key={text} className="flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-sm font-semibold text-forest">
            <Icon size={20} className="shrink-0 text-brand-600" aria-hidden />{text}
          </li>
        ))}
      </ul>

      <section>
        <h2 className="text-lg font-extrabold text-forest">Other phones</h2>
        <div className="mt-3 space-y-2">
          {OTHERS.map(([label, steps]) => (
            <details key={label} className="group rounded-2xl bg-white shadow-ring">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 font-bold text-forest [&::-webkit-details-marker]:hidden">
                {label}<span className="text-brand-600 transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <div className="px-4 pb-5"><Steps steps={steps} /></div>
            </details>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-forest p-5 text-cream sm:p-7">
        <h2 className="text-lg font-extrabold">Send this page</h2>
        <p className="mt-1 text-sm text-brand-200">যিনি বুঝতে পারছেন না, তাঁকে এই লিংক পাঠান। তাঁর ফোন অনুযায়ী ধাপ দেখাবে।</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a href={share} target="_blank" rel="noreferrer" className="wa-btn inline-flex min-h-12 items-center justify-center rounded-full px-5 font-bold">Share on WhatsApp</a>
          <CopyLink />
        </div>
      </section>
    </PageShell>
  );
}
