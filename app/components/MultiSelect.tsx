// Several picks from a long list in one closed box (owner, 2026-11-05: a wall of chips wastes space and looks busy).
// The box shows what is picked; tapping it opens a sheet with search and ticks. Hidden inputs carry the picks, so a
// page still reads them with form.getAll(name). The ticks are real checkboxes inside the form, so a form's onChange
// (Profile's save bar) still hears every change. Short lists (3-6 choices) stay as chips.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { normalizeSearch } from "~/lib/tuition";

export type MultiOption = { key: string; label: string; alt?: string; group?: string };

export function MultiSelect({ name, options, picked = [], title, placeholder, disabled = false, onChange }: {
  name: string; options: MultiOption[]; picked?: string[]; title: string; placeholder: string; disabled?: boolean;
  onChange?: (picked: string[]) => void;
}) {
  const [on, setOn] = useState<string[]>(picked);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    onChange?.(on);
  }, [on]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = normalizeSearch(query);
  const shown = useMemo(() => (q ? options.filter((o) => normalizeSearch(`${o.label} ${o.alt ?? ""} ${o.group ?? ""}`).includes(q)) : options), [q, options]);
  const labels = options.filter((o) => on.includes(o.key)).map((o) => o.label);
  // On phones the tap that opens the sheet can land again on the row now under the finger; ignore that one.
  const openedAt = useRef(0);
  const toggle = (key: string) => {
    if (Date.now() - openedAt.current < 400) return;
    setOn((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  // Clear taps each ticked box, so the form hears real change events.
  const clear = () => ref.current?.querySelectorAll<HTMLInputElement>("input[type=checkbox]:checked").forEach((c) => c.click());
  const close = () => { setOpen(false); setQuery(""); };

  return (
    <>
      {on.map((k) => <input key={k} type="hidden" name={name} value={k} />)}
      <button type="button" disabled={disabled} onClick={() => { openedAt.current = Date.now(); setOpen(true); }} aria-haspopup="dialog"
        className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-left text-base transition-colors hover:border-brand-500 focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-100 focus-visible:outline-none disabled:opacity-40">
        <span className={`min-w-0 flex-1 truncate ${labels.length ? "font-semibold text-forest" : "text-slate-500"}`}>
          {labels.length ? labels.slice(0, 3).join(", ") : placeholder}
        </span>
        {labels.length > 3 && <span className="shrink-0 rounded-full bg-forest px-2 py-0.5 text-xs font-bold text-cream">+{labels.length - 3}</span>}
        <ChevronDown size={18} className="shrink-0 text-slate-500" aria-hidden />
      </button>

      <dialog ref={ref} aria-label={title} onClose={close} onClick={(e) => e.target === ref.current && close()}
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-3xl bg-cream p-0 backdrop:bg-forest/50 sm:m-auto sm:max-w-md sm:rounded-3xl">
        <div className="flex max-h-[85dvh] flex-col">
          <div className="px-5 pt-4 pb-3">
            <div className="flex min-h-11 items-center justify-between">
              <h2 className="text-lg font-semibold text-forest">{title}</h2>
              {on.length > 0 && <button type="button" onClick={clear} className="min-h-11 px-2 text-sm font-semibold text-brand-700">Clear</button>}
            </div>
            <label className="relative mt-2 block">
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search (English or বাংলা)" aria-label={`Search ${title.toLowerCase()}`}
                className="min-h-11 w-full rounded-xl bg-white pr-3 pl-9 text-base outline-none ring-1 ring-brand-100 focus:ring-2 focus:ring-brand-200" />
            </label>
          </div>
          <ul className="flex-1 overflow-y-auto px-3 pb-2">
            {shown.map((o, i) => {
              const checked = on.includes(o.key);
              return (
                <li key={o.key}>
                  {o.group && o.group !== shown[i - 1]?.group && <p className="px-2 pt-3 pb-1 text-xs font-bold tracking-wide text-slate-500 uppercase">{o.group}</p>}
                  <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 select-none hover:bg-white has-focus-visible:outline-2 has-focus-visible:outline-brand-600">
                    <input type="checkbox" checked={checked} onChange={() => toggle(o.key)} className="sr-only" />
                    <span className={`grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors duration-150 ${checked ? "border-forest bg-forest text-cream" : "border-slate-300 bg-white"}`}>
                      {checked && <Check size={16} strokeWidth={3} aria-hidden />}
                    </span>
                    <span className={`flex-1 text-base ${checked ? "font-semibold text-forest" : "text-slate-800"}`}>{o.label}</span>
                    {o.alt && <span className="max-w-[45%] truncate text-sm text-slate-400">{o.alt}</span>}
                  </label>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-2 py-4 text-sm text-slate-500">Not on the list.</li>}
          </ul>
          <div className="border-t border-brand-100 px-5 py-4">
            <button type="button" onClick={close} className="min-h-12 w-full rounded-xl bg-forest text-base font-semibold text-white">
              {on.length ? `Done · ${on.length} picked` : "Done"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
