// Several picks from a long list in one closed box (owner, 2026-11-05: a wall of chips wastes space and looks busy).
// The box shows what is picked; tapping it opens a sheet with search and ticks. Hidden inputs carry the picks, so a
// page still reads them with form.getAll(name). The ticks are real checkboxes inside the form, so a form's onChange
// (Profile's save bar) still hears every change. Short lists (3-6 choices) stay as chips.
// Grouped options show the groups as headings; with `groupTicks` (classes, owner 2026-11-05) each group is one row
// instead: its tick picks the whole group, and the arrow opens it to untick single choices. A group of one is just that
// choice. Searching lists the matches flat. Pass `value` to control the picks from the page.
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Minus, Search } from "lucide-react";
import { normalizeSearch } from "~/lib/tuition";

export type MultiOption = { key: string; label: string; alt?: string; group?: string; groupShort?: string };

const tickClass = (state: boolean | "some") =>
  `grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors duration-150 ${state ? "border-forest bg-forest text-cream" : "border-slate-300 bg-white"}`;

function Tick({ state }: { state: boolean | "some" }) {
  return (
    <span className={tickClass(state)}>
      {state === "some" ? <Minus size={16} strokeWidth={3} aria-hidden /> : state && <Check size={16} strokeWidth={3} aria-hidden />}
    </span>
  );
}

export function MultiSelect({ name, options, picked = [], value, title, placeholder, disabled = false, groupTicks = false, onChange }: {
  name: string; options: MultiOption[]; picked?: string[]; value?: string[]; title: string; placeholder: string; disabled?: boolean;
  groupTicks?: boolean; onChange?: (picked: string[]) => void;
}) {
  const [inner, setInner] = useState<string[]>(picked);
  const on = value ?? inner;
  // Several taps can land before the page re-renders (Clear taps every tick), so each change starts from the last one.
  const latest = useRef(on);
  latest.current = on;
  const setOn = (next: (prev: string[]) => string[]) => {
    const v = next(latest.current);
    latest.current = v;
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (open && !d?.open) d?.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  const groups = useMemo(() => {
    const list: { label: string; short: string; options: MultiOption[] }[] = [];
    for (const o of options) {
      if (!o.group) continue;
      const g = list.find((x) => x.label === o.group);
      if (g) g.options.push(o);
      else list.push({ label: o.group, short: o.groupShort ?? o.group, options: [o] });
    }
    return list;
  }, [options]);
  // Groups with some (not all) picks start open, so the tutor sees which.
  const [unfolded, setUnfolded] = useState<Set<string>>(() => new Set(groups.filter((g) => {
    const n = g.options.filter((o) => picked.includes(o.key)).length;
    return n > 0 && n < g.options.length;
  }).map((g) => g.label)));

  const q = normalizeSearch(query);
  const shown = useMemo(() => (q ? options.filter((o) => normalizeSearch(`${o.label} ${o.alt ?? ""} ${o.group ?? ""}`).includes(q)) : options), [q, options]);
  // The closed box names a whole group by its short name, then single picks.
  const labels = useMemo(() => {
    const whole = groupTicks ? groups.filter((g) => g.options.length > 1 && g.options.every((o) => on.includes(o.key))) : [];
    const inWhole = new Set(whole.flatMap((g) => g.options.map((o) => o.key)));
    return [...whole.map((g) => g.short), ...options.filter((o) => on.includes(o.key) && !inWhole.has(o.key)).map((o) => o.label)];
  }, [groupTicks, groups, options, on]);
  // On phones the tap that opens the sheet can land again on the row now under the finger; ignore that one.
  const openedAt = useRef(0);
  const early = () => Date.now() - openedAt.current < 400;
  const toggle = (key: string) => {
    if (early()) return;
    setOn((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const toggleGroup = (keys: string[]) => {
    if (early()) return;
    setOn((prev) => (keys.every((k) => prev.includes(k)) ? prev.filter((k) => !keys.includes(k)) : [...new Set([...prev, ...keys])]));
  };
  const unfold = (label: string) => setUnfolded((prev) => {
    const next = new Set(prev);
    if (!next.delete(label)) next.add(label);
    return next;
  });
  // Clear taps each ticked choice, so the form hears real change events.
  const clear = () => ref.current?.querySelectorAll<HTMLInputElement>("input[data-choice]:checked").forEach((c) => c.click());
  const close = () => { setOpen(false); setQuery(""); };

  const row = (o: MultiOption, indent = false) => {
    const checked = on.includes(o.key);
    return (
      <label className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 select-none hover:bg-white has-focus-visible:outline-2 has-focus-visible:outline-brand-600 ${indent ? "ml-9" : ""}`}>
        <input type="checkbox" data-choice checked={checked} onChange={() => toggle(o.key)} className="sr-only" />
        <Tick state={checked} />
        <span className={`flex-1 text-base ${checked ? "font-semibold text-forest" : "text-slate-800"}`}>{o.label}</span>
        {o.alt && <span className="max-w-[45%] truncate text-sm text-slate-400">{o.alt}</span>}
      </label>
    );
  };

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
            {groupTicks && groups.length > 0 && !q ? groups.map((g) => {
              if (g.options.length === 1) return <li key={g.label}>{row(g.options[0])}</li>;
              const keys = g.options.map((o) => o.key);
              const n = keys.filter((k) => on.includes(k)).length;
              const state = n === keys.length ? true : n ? "some" : false;
              const isOpen = unfolded.has(g.label);
              return (
                <li key={g.label}>
                  <div className="flex items-center">
                    <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl px-2 select-none hover:bg-white has-focus-visible:outline-2 has-focus-visible:outline-brand-600">
                      <input type="checkbox" checked={state === true} onChange={() => toggleGroup(keys)} aria-label={`${g.label}, all`} className="sr-only" />
                      <Tick state={state} />
                      <span className={`flex-1 text-base ${state ? "font-semibold text-forest" : "text-slate-800"}`}>{g.label}</span>
                      {state === "some" && <span className="text-sm font-semibold text-slate-500 tabular-nums">{n} of {keys.length}</span>}
                    </label>
                    <button type="button" onClick={() => unfold(g.label)} aria-expanded={isOpen} aria-label={`${isOpen ? "Hide" : "Show"} classes in ${g.label}`}
                      className="grid size-12 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-white">
                      <ChevronDown size={20} aria-hidden className={`transition-transform duration-200 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {/* Folded rows stay in the page (hidden), so Clear still reaches their ticks. */}
                  <ul hidden={!isOpen}>{g.options.map((o) => <li key={o.key}>{row(o, true)}</li>)}</ul>
                </li>
              );
            }) : shown.map((o, i) => (
              <li key={o.key}>
                {o.group && o.group !== o.label && o.group !== shown[i - 1]?.group && <p className="px-2 pt-3 pb-1 text-xs font-bold tracking-wide text-slate-500 uppercase">{o.group}</p>}
                {row(o)}
              </li>
            ))}
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
