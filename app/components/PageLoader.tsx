// Feedback while the next page loads (owner, 2026-11-04, after Towfique HSC English): a thin bar across the top soon
// after a tap, and the logo with a sliding bar in the middle when a new page takes longer than 0.4 s. Fast pages and
// filters on the same page never flash the middle screen.
import { useEffect, useState } from "react";
import { useLocation, useNavigation } from "react-router";

export function PageLoader() {
  const nav = useNavigation();
  const { pathname } = useLocation();
  const busy = nav.state !== "idle";
  const newPage = nav.state === "loading" && nav.location.pathname !== pathname;
  const [bar, setBar] = useState(false);
  const [screen, setScreen] = useState(false);

  useEffect(() => {
    if (!busy) {
      setBar(false);
      setScreen(false);
      return;
    }
    const a = setTimeout(() => setBar(true), 100);
    const b = newPage ? setTimeout(() => setScreen(true), 400) : undefined;
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [busy, newPage]);

  return (
    <>
      <div aria-hidden className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] overflow-hidden transition-opacity duration-200 ${bar ? "opacity-100" : "opacity-0"}`}>
        {bar && <span className="block h-full w-2/5 animate-slide rounded-full bg-brand-500" />}
      </div>
      {screen && (
        <div role="status" className="fixed inset-0 z-[65] flex animate-fade flex-col items-center justify-center gap-3 bg-cream/90 backdrop-blur-sm">
          <img src="/brand/mark.webp" alt="" width={72} height={72} className="size-18 animate-breathe" />
          <p className="text-xl font-extrabold tracking-tight text-forest">Hikmah Tutors<span className="text-brand-600">.</span></p>
          <span aria-hidden className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-brand-100">
            <span className="block h-full w-2/5 animate-slide rounded-full bg-forest" />
          </span>
          <span className="sr-only">Loading</span>
        </div>
      )}
    </>
  );
}
