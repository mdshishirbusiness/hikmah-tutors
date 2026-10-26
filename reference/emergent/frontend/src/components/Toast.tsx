import { useCallback, useEffect, useState } from "react";

export function useToast(): [string | null, (msg: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const id = window.setTimeout(() => setMsg(null), 2200);
    return () => window.clearTimeout(id);
  }, [msg]);
  const show = useCallback((m: string) => setMsg(m), []);
  return [msg, show];
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" aria-live="polite" data-testid="toast" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade rounded-full bg-forest text-cream px-5 py-3 text-sm font-semibold shadow-lg">
      {message}
    </div>
  );
}

export async function shareLink(url: string, title: string): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ url, title });
      return "shared";
    } catch {
      /* cancelled or unsupported: fall through to copy */
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok ? "copied" : "failed";
    } catch {
      return "failed";
    }
  }
}

export function shareToastMessage(result: "shared" | "copied" | "failed", url: string, t: (k: string, v?: Record<string, string | number>) => string): string | null {
  if (result === "copied") return t("detail.share_copied");
  if (result === "failed") return t("detail.share_failed", { url });
  return null;
}
