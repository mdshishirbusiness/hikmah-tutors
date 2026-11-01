import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";

export function SiteHeader() {
  return (
    <header className="bg-cream">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" aria-label="Hikmah Tutors" className="flex min-h-11 items-center">
          <img src="/brand/logo-wide.webp" alt="Hikmah Tutors Rajshahi" className="h-11 w-auto" />
        </Link>
        <Link to="/me" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-forest hover:bg-brand-50">আমার প্রোফাইল</Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-14 bg-forest text-cream">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="font-semibold">Hikmah Tutors Rajshahi</p>
        <p className="mt-1 text-sm text-brand-200">রাজশাহীর বিশ্বস্ত হোম টিউটর মিডিয়া</p>
      </div>
    </footer>
  );
}

/** Opens the phone's share sheet, or copies the link where there is none. */
export function useShare() {
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const share = useCallback(async (path: string, title: string) => {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title });
      } catch {
        // the person closed the share sheet
      }
      return;
    }
    let message = `কপি করা যায়নি। লিংক: ${url}`;
    try {
      await navigator.clipboard.writeText(url);
      message = "শেয়ার লিংক কপি হয়েছে";
    } catch {
      // keeps the message that shows the link
    }
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 3000);
  }, []);

  return { share, toast };
}

export function Toast({ message }: { message: string }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center">
      {message && <p className="animate-rise rounded-xl bg-forest px-4 py-3 text-sm font-semibold break-all text-cream shadow-lg">{message}</p>}
    </div>
  );
}
