// The scroll progress line (owner, 2026-11-05): the header's bottom edge fills with emerald as the page scrolls, and a
// small rickshaw rides it toward a house at the right end, the way a tutor rides to a student's home. The wheels turn
// with the scroll (backwards on the way up), the rickshaw shows only while the page moves and passes behind the header's
// logo and buttons, and the logo's star pops over the house at the bottom of the page. It rides on every page that
// scrolls at least a quarter of a screen (owner, 2026-11-05: every page, the Profile too); shorter pages show nothing.
// Put it inside a `relative` header whose row sits above it (`relative z-10`); `bare` draws the line alone, for places
// with no header above it.
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

const RIDE_W = 30; // the rickshaw's width in px, as drawn below
const HOUSE_W = 14;
const BACK_R = 4.4; // wheel radii, for turning them by the distance travelled
const FRONT_R = 2.9;

export function ScrollRide({ bare = false }: { bare?: boolean }) {
  const { pathname } = useLocation();
  const root = useRef<HTMLDivElement>(null);
  const ride = useRef<SVGSVGElement>(null);
  const back = useRef<SVGGElement>(null);
  const front = useRef<SVGGElement>(null);


  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let idle = 0;
    let first = true;
    const draw = () => {
      frame = 0;
      const doc = document.documentElement;
      const room = doc.scrollHeight - window.innerHeight;
      const on = room > window.innerHeight * 0.25;
      el.toggleAttribute("data-on", on);
      if (!on) return;
      const p = Math.min(1, Math.max(0, window.scrollY / room));
      el.style.setProperty("--p", String(p));
      el.toggleAttribute("data-end", p > 0.995);
      if (bare || !ride.current) return;
      const x = p * Math.max(0, el.clientWidth - RIDE_W - HOUSE_W - 4);
      ride.current.style.transform = `translateX(${x}px)`;
      if (!still.matches) {
        back.current?.setAttribute("transform", `rotate(${(x / BACK_R) * (180 / Math.PI)} 8 18)`);
        front.current?.setAttribute("transform", `rotate(${(x / FRONT_R) * (180 / Math.PI)} 25.5 19.5)`);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
      if (bare) return;
      // The first draw is the page loading, not the reader moving.
      if (first) return void (first = false);
      el.setAttribute("data-moving", "");
      clearTimeout(idle);
      idle = window.setTimeout(() => el.removeAttribute("data-moving"), 900);
    };
    const sized = new ResizeObserver(() => {
      if (!frame) frame = requestAnimationFrame(draw);
    });
    sized.observe(document.body);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(idle);
      sized.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.removeAttribute("data-moving");
    };
  }, [pathname, bare]);

  return (
    <div ref={root} aria-hidden className={`group pointer-events-none absolute inset-x-0 z-0 opacity-0 ${bare ? "top-0 h-[3px]" : "-bottom-px h-7"} transition-opacity duration-300 data-on:opacity-100`}>
      <div className="absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
        <div className="h-full w-full rounded-r-full bg-brand-600 [transform:translateX(calc((var(--p,0)-1)*100%))]" />
      </div>
      {!bare && (
        <>
          <svg ref={ride} viewBox="0 0 30 23" width={RIDE_W} height={23} className="absolute bottom-[3px] left-0 opacity-0 transition-opacity duration-300 will-change-transform group-data-moving:opacity-100">
            <path d="M2.5 12 Q3.5 2.5 12.5 2.5 H14 V12 Z" className="fill-forest" />
            <path d="M1.8 12 H17 L19.5 16.2 H5.5 Z" className="fill-mango stroke-forest" strokeWidth={1.2} strokeLinejoin="round" />
            <path d="M17 13.6 H24.5 L26.3 17.4" fill="none" className="stroke-forest" strokeWidth={1.3} strokeLinecap="round" />
            <circle cx={23} cy={7.8} r={2} className="fill-forest" />
            <path d="M23 9.8 L22.2 13.4" className="stroke-forest" strokeWidth={1.5} strokeLinecap="round" />
            <g ref={back}>
              <circle cx={8} cy={18} r={BACK_R} className="fill-cream stroke-forest" strokeWidth={1.5} />
              <path d="M8 14 V22 M4 18 H12" className="stroke-forest" strokeWidth={0.9} />
            </g>
            <g ref={front}>
              <circle cx={25.5} cy={19.5} r={FRONT_R} className="fill-cream stroke-forest" strokeWidth={1.3} />
              <path d="M25.5 16.9 V22.1 M22.9 19.5 H28.1" className="stroke-forest" strokeWidth={0.8} />
            </g>
          </svg>
          <svg viewBox="0 0 14 14" width={HOUSE_W} height={14} className="absolute right-px bottom-[3px]">
            <path d="M1.6 6.4 L7 1.8 L12.4 6.4 V13 H1.6 Z" className="fill-cream stroke-forest" strokeWidth={1.3} strokeLinejoin="round" />
            <rect x={5.4} y={8.6} width={3.2} height={4.4} className="fill-mango stroke-forest" strokeWidth={1} />
          </svg>
          <svg viewBox="0 0 12 12" width={11} height={11} className="absolute right-0.5 bottom-[19px] scale-50 opacity-0 transition duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1.4)] group-data-end:scale-100 group-data-end:opacity-100">
            <path d="M6 .8l1.5 3.3 3.6.4-2.7 2.4.8 3.5L6 8.6 2.8 10.4l.8-3.5L.9 4.5l3.6-.4z" className="fill-mango-deep stroke-forest" strokeWidth={0.8} />
          </svg>
        </>
      )}
    </div>
  );
}
