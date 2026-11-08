// Offline (owner, 2026-11-08): registers public/sw.js, which opens pages from the last copy this phone saw when there is
// no net, and shows a small mango pill while offline so a saved copy is never taken for live data.
import { useEffect, useSyncExternalStore } from "react";
import { CloudOff } from "lucide-react";

const subscribe = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};

export function Offline() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  useEffect(() => {
    // A production build always; `npm run dev:synthetic` too, to try it on invented data.
    if ("serviceWorker" in navigator && (import.meta.env.PROD || import.meta.env.MODE === "synthetic")) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  if (online) return null;
  return (
    <div role="status" className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      <p className="inline-flex animate-rise items-center gap-1.5 rounded-full bg-mango px-3 py-1.5 text-xs font-bold text-forest shadow-lift">
        <CloudOff size={14} aria-hidden />Offline · last saved copy
      </p>
    </div>
  );
}
