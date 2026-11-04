// "Install app" (owner, 2026-11-05: until there is a Play Store app). Android and desktop Chrome open their own
// install prompt; on an iPhone, where Safari has no prompt, a short how-to shows. Hidden once the app is installed.
import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let saved: PromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    saved = e as PromptEvent;
    window.dispatchEvent(new Event("htr:installable"));
  });
}

export function InstallButton({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    if (installed) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const update = () => setMode(saved ? "prompt" : ios ? "ios" : "hidden");
    update();
    window.addEventListener("htr:installable", update);
    return () => window.removeEventListener("htr:installable", update);
  }, []);
  if (mode === "hidden") return null;

  async function install() {
    if (mode === "ios" || !saved) return setHelp(true);
    await saved.prompt();
    const choice = await saved.userChoice;
    if (choice.outcome === "accepted") { saved = null; setMode("hidden"); }
  }

  return (
    <>
      <button type="button" onClick={install} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${className}`}>
        <Download size={16} aria-hidden />Install app
      </button>
      {help && (
        <div role="dialog" aria-label="Install on iPhone" className="fixed inset-x-3 bottom-3 z-50 animate-rise rounded-2xl bg-white p-4 text-left text-forest shadow-lift ring-1 ring-brand-100">
          <div className="flex items-center justify-between">
            <p className="font-extrabold">Install on iPhone</p>
            <button type="button" onClick={() => setHelp(false)} aria-label="Close" className="grid size-9 place-items-center rounded-lg text-slate-400"><X size={16} aria-hidden /></button>
          </div>
          <ol className="mt-2 space-y-1.5 text-sm text-slate-700">
            <li>1. Safari-তে নিচের <Share size={14} className="inline align-[-2px]" aria-label="Share" /> বাটনে চাপুন।</li>
            <li>2. "Add to Home Screen" বেছে নিন।</li>
            <li>3. "Add" চাপুন। হোম স্ক্রিনে Hikmah Tutors অ্যাপের মতো খুলবে।</li>
          </ol>
        </div>
      )}
    </>
  );
}
