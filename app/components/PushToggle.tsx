// "Turn on alerts" for the admin's phone (owner, 2026-11-18): Web Push through the site's service worker. The push
// carries no text; public/sw.js asks /api/push for the note after the sign-in check.
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));

type State = "loading" | "unsupported" | "off" | "on" | "blocked" | "busy";

/** `compact`: a round bell for the WhatsApp header (filled when alerts are on). */
export function PushToggle({ publicKey, compact }: { publicKey: string | null; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState("unsupported");
    if (Notification.permission === "denied") return setState("blocked");
    navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription()).then((s) => setState(s ? "on" : "off")).catch(() => setState("off"));
  }, [publicKey]);

  async function turnOn() {
    setState("busy");
    setError(null);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setState("blocked");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromB64url(publicKey!) });
      const res = await fetch("/api/push", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Not saved");
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn on alerts");
      setState("off");
    }
  }

  async function turnOff() {
    setState("busy");
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setState("off");
  }

  const base = "inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-60";
  if (state === "loading") return null;
  if (compact) {
    const off = state === "unsupported" || state === "blocked";
    const label = state === "on" ? "Alerts on (tap to turn off)" : off ? (publicKey ? "Alerts are blocked or not supported here" : "Alerts are not set up yet") : "Turn on alerts";
    return (
      <span className="relative">
        <button type="button" onClick={state === "on" ? turnOff : turnOn} disabled={off || state === "busy"} aria-label={label} title={label}
          className={`grid size-11 place-items-center rounded-full transition-colors hover:bg-[#f0f2f5] disabled:opacity-40 ${state === "on" ? "text-[#00a884]" : "text-[#54656f]"}`}>
          {state === "on" ? <Bell size={21} fill="currentColor" /> : off ? <BellOff size={21} /> : <Bell size={21} />}
        </button>
        {error && <span role="alert" className="absolute top-11 right-0 z-30 w-56 rounded-lg bg-white p-2 text-xs text-rose-700 shadow-lift">{error}</span>}
      </span>
    );
  }
  if (state === "unsupported") return <p className="text-xs text-slate-500">{publicKey ? "এই ব্রাউজারে alert চলে না। ফোনে Chrome-এ খুলুন।" : "Alerts are not set up yet (VAPID keys)."}</p>;
  if (state === "blocked") return <p className="text-xs text-slate-500">Notifications are blocked for this site. Allow them in the browser settings.</p>;
  return (
    <div>
      {state === "on" ? (
        <button type="button" onClick={turnOff} className={`${base} bg-brand-50 text-forest hover:bg-brand-100`}><BellOff size={17} aria-hidden />Alerts on · turn off</button>
      ) : (
        <button type="button" onClick={turnOn} disabled={state === "busy"} className={`${base} bg-mango text-forest hover:bg-mango-deep`}><Bell size={17} aria-hidden />Turn on alerts</button>
      )}
      {error && <p role="alert" className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
