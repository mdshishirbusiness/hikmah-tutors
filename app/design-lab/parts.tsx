// Shared pieces for the design-lab concepts: flow state, icons, a bottom sheet and a big checkbox row.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "~/components/Icon";
import type { Plan } from "./sample";

export { Icon };

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
