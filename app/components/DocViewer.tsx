// A registration document shown full screen inside the app, with a close button (owner, 2026-11-06). Opening it in a
// new tab made the phone's Back leave the installed app. Back now closes the viewer, as the X does.
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function DocViewer({ src, title, className, children }: { src: string; title: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    history.pushState({ ...history.state, docViewer: true }, "");
    const onPop = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && history.back();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    addEventListener("popstate", onPop);
    addEventListener("keydown", onKey);
    return () => {
      removeEventListener("popstate", onPop);
      removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex flex-col bg-forest/95 motion-safe:animate-fade" onClick={(e) => e.target === e.currentTarget && history.back()}>
          <div className="flex items-center gap-3 px-4 py-2 text-cream">
            <p className="min-w-0 flex-1 truncate font-bold">{title}</p>
            {/* history.back() pops the state pushed on open, so Back and X end the same way. */}
            <button type="button" autoFocus aria-label="Close" onClick={() => history.back()} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20">
              <X size={22} aria-hidden />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center p-3" onClick={(e) => e.target === e.currentTarget && history.back()}>
            <img src={src} alt={title} className="size-full max-w-3xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
