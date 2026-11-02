// Shared pieces for the design-lab concepts: flow state, icons, a bottom sheet and a big checkbox row.
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Plan } from "./sample";

export type Stage = "board" | "detail" | "apply" | "done";

/** Where a lab flow is. A new full screen starts at the top; `keep` stays put (for sheets over a page). */
export function useStage() {
  const [stage, setStage] = useState<Stage>("board");
  const go = (next: Stage, keep = false) => {
    setStage(next);
    if (!keep) window.scrollTo({ top: 0 });
  };
  return [stage, go] as const;
}

/** The answers an application needs (PRD FR-APP-001): fee plan, availability, terms, an optional note. */
export function useApply() {
  const [plan, setPlan] = useState<Plan>("standard"); // PRD §7.3: standard is the default
  const [can, setCan] = useState(false);
  const [agree, setAgree] = useState(false);
  const [note, setNote] = useState("");
  return { plan, setPlan, can, setCan, agree, setAgree, note, setNote: (v: string) => setNote(v.slice(0, 300)), ready: can && agree };
}

const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  back: "M15 5l-7 7 7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  bookmark: "M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z",
  share: "M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7",
  pin: "M12 21s-7-6-7-11.5a7 7 0 0 1 14 0C19 15 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  book: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15zM5 19.5A1.5 1.5 0 0 0 6.5 21H19",
  calendar: "M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M9 3v4M15 3v4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0",
  send: "M5 12l14-7-5 14-2.5-5.5L5 12z",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  filter: "M4 6h16M7 12h10M10 18h4",
  shield: "M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6l7-3zM9 12l2 2 4-4",
  camera: "M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  restart: "M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5",
} as const;

export function Icon({ name, className = "size-5" }: { name: keyof typeof PATHS; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}

/** A bottom sheet over the page, at most phone width. Escape or a tap outside closes it. */
export function Sheet({ label, onClose, className = "", children }: { label: string; onClose: () => void; className?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label={label}>
      <div aria-hidden onClick={onClose} className="animate-fade absolute inset-0 bg-black/55" />
      <div ref={box} tabIndex={-1} className={`animate-sheet absolute inset-x-0 bottom-0 mx-auto max-h-[92dvh] max-w-[440px] overflow-y-auto overscroll-contain rounded-t-[28px] outline-none ${className}`}>
        <div aria-hidden className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-current opacity-20" />
        {children}
      </div>
    </div>
  );
}

/** A real checkbox drawn as a big tappable row; `box` styles the square for the checked state. */
export function CheckRow({ checked, onChange, className, box, children }: { checked: boolean; onChange: (v: boolean) => void; className: string; box: string; children: ReactNode }) {
  return (
    <label className={`relative flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${className}`}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span aria-hidden className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors duration-150 ${box}`}>
        {checked && <Icon name="check" className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}
