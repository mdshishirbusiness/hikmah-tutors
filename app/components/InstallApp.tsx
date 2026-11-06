// "Install app" (owner, 2026-11-05: until there is a Play Store app). Where the browser offers its own install prompt
// (Android and desktop Chrome) the button opens it; everywhere else it goes to /install, which shows the steps for that
// phone and browser (owner, 2026-11-06). Hidden once the app is installed.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Download } from "lucide-react";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let saved: PromptEvent | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    saved = e as PromptEvent;
    window.dispatchEvent(new Event("htr:installable"));
  });
  window.addEventListener("appinstalled", () => {
    saved = null;
    window.dispatchEvent(new Event("htr:installable"));
  });
}

export const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;

/** null until the page has run in the browser; then whether the app is installed and the browser's prompt is ready. */
export function useInstall() {
  const [state, setState] = useState<{ installed: boolean; canPrompt: boolean } | null>(null);
  useEffect(() => {
    const update = () => setState({ installed: isInstalled(), canPrompt: !!saved });
    update();
    window.addEventListener("htr:installable", update);
    return () => window.removeEventListener("htr:installable", update);
  }, []);
  return state;
}

/** Opens the browser's own install prompt. True when the tutor accepted. */
export async function promptInstall() {
  if (!saved) return false;
  await saved.prompt();
  const { outcome } = await saved.userChoice;
  if (outcome === "accepted") saved = null;
  window.dispatchEvent(new Event("htr:installable"));
  return outcome === "accepted";
}

export function InstallButton({ className = "" }: { className?: string }) {
  const state = useInstall();
  if (!state || state.installed) return null;
  const cls = `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold ${className}`;
  const label = <><Download size={16} aria-hidden />Install app</>;
  return state.canPrompt
    ? <button type="button" onClick={promptInstall} className={cls}>{label}</button>
    : <Link to="/install" className={cls}>{label}</Link>;
}
