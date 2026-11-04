// Small, dependency-free charts for the admin (dataviz rules: thin marks with 4px rounded ends from one baseline,
// hairline grid, a legend for two or more series, values on hover/focus and a table view, text in text colours only).
// Plain HTML/CSS bars, so they stay sharp at any width and cost nothing on a phone.
import { useState } from "react";
import { Link } from "react-router";

export const CHART = { one: "var(--color-chart-1)", two: "var(--color-chart-2)" };

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));

/** 0 and up to four clean steps covering max. */
function ticks(max: number) {
  if (max <= 0) return [0];
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => Math.round(i * step));
}

export type Series = { key: string; label: string; color: string };

export function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {series.map((s) => (
        <li key={s.key} className="inline-flex items-center gap-1.5"><span aria-hidden className="size-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</li>
      ))}
    </ul>
  );
}

/** Grouped columns over time (one group per period). */
export function ColumnChart({ title, data, series, height = 176, unit = "" }: {
  title: string; data: ({ label: string; full?: string } & Record<string, number | string | undefined>)[]; series: Series[]; height?: number; unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const values = data.flatMap((d) => series.map((s) => Number(d[s.key] ?? 0)));
  const scale = ticks(Math.max(1, ...values));
  const top = scale.at(-1) || 1;
  const every = data.length > 16 ? 4 : data.length > 8 ? 2 : 1;
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-forest">{title}</span>
        <span className="flex items-center gap-3">
          <Legend series={series} />
          <button type="button" onClick={() => setTable((t) => !t)} aria-pressed={table} className="min-h-8 rounded-lg px-2 text-xs font-semibold text-brand-700 hover:bg-brand-50">
            {table ? "Chart" : "Table"}
          </button>
        </span>
      </figcaption>
      {table ? (
        <div className="max-h-64 overflow-auto scroll-thin">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-slate-500"><th className="py-1 font-semibold">Period</th>{series.map((s) => <th key={s.key} className="py-1 text-right font-semibold">{s.label}</th>)}</tr></thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.label} className="border-t border-grid"><td className="py-1.5 text-slate-700">{d.full ?? d.label}</td>{series.map((s) => <td key={s.key} className="py-1.5 text-right font-semibold text-slate-900 tabular-nums">{Number(d[s.key] ?? 0)}{unit}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative pl-8" style={{ height }} onMouseLeave={() => setHover(null)}>
          {scale.map((t) => (
            <div key={t} aria-hidden className="absolute right-0 left-8 border-t border-grid" style={{ bottom: `${(t / top) * 100}%` }}>
              <span className="absolute -left-8 w-6 -translate-y-1/2 text-right text-[11px] text-slate-400 tabular-nums">{compact(t)}</span>
            </div>
          ))}
          <div className="absolute inset-y-0 right-0 left-8 flex items-end">
            {data.map((d, i) => (
              <div
                key={d.label}
                tabIndex={0}
                role="img"
                aria-label={`${d.full ?? d.label}: ${series.map((s) => `${s.label} ${Number(d[s.key] ?? 0)}${unit}`).join(", ")}`}
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className={`relative flex h-full flex-1 items-end justify-center gap-0.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${hover === i ? "bg-brand-50/60" : ""}`}
              >
                {series.map((s) => (
                  <span
                    key={s.key}
                    className="block w-full max-w-3 origin-bottom animate-grow rounded-t-[4px]"
                    style={{ height: `${(Number(d[s.key] ?? 0) / top) * 100}%`, background: s.color, animationDelay: `${i * 25}ms` }}
                  />
                ))}
              </div>
            ))}
          </div>
          {hover !== null && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-forest px-3 py-2 text-xs whitespace-nowrap text-cream shadow-lift"
              style={{ left: `calc(2rem + (100% - 2rem) * ${(hover + 0.5) / data.length})`, top: 0 }}
            >
              <p className="font-bold">{data[hover].full ?? data[hover].label}</p>
              {series.map((s) => (
                <p key={s.key} className="mt-0.5 flex items-center gap-1.5 tabular-nums">
                  <span aria-hidden className="size-2 rounded-sm" style={{ background: s.color }} />{s.label}: <b>{Number(data[hover][s.key] ?? 0)}{unit}</b>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {!table && (
        <div aria-hidden className="mt-1.5 flex pl-8 text-[11px] text-slate-400">
          {data.map((d, i) => <span key={d.label} className="flex-1 text-center whitespace-nowrap">{i % every === (data.length - 1) % every ? d.label : ""}</span>)}
        </div>
      )}
    </figure>
  );
}

/** Ranked horizontal bars, one series: value at the tip, the share in muted text. */
export function BarList({ title, items, color = CHART.one, total, empty = "Nothing yet." }: {
  title: string; items: { label: string; value: number; note?: string }[]; color?: string; total?: number; empty?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <figure className="min-w-0">
      <figcaption className="mb-3 text-sm font-bold text-forest">{title}</figcaption>
      {items.length === 0 ? <p className="text-sm text-slate-500">{empty}</p> : (
        <ul className="space-y-2.5">
          {items.map((it, i) => (
            <li key={it.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr] items-center gap-3 text-sm" title={`${it.label}: ${it.value}`}>
              <span className="truncate text-slate-700">{it.label}</span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 origin-left animate-grow-x rounded-r-[4px]" style={{ width: `${Math.max((it.value / max) * 100, 2)}%`, background: color, animationDelay: `${i * 40}ms` }} />
                <span className="shrink-0 font-semibold text-slate-900 tabular-nums">{it.value}</span>
                {(it.note || total) && <span className="shrink-0 text-xs text-slate-400 tabular-nums">{it.note ?? `${Math.round((it.value / (total || 1)) * 100)}%`}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

/** A 12-point trend for a stat tile: the de-emphasised line, the latest point in the accent. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const w = 112, h = 36, pad = 4;
  const max = Math.max(1, ...values), min = Math.min(0, ...values);
  const x = (i: number) => pad + (i / (values.length - 1)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad);
  const line = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} className="shrink-0">
      <path d={`${line} L${x(values.length - 1)},${h - pad} L${x(0)},${h - pad} Z`} fill="var(--color-chart-1)" opacity="0.1" />
      <path d={line} fill="none" stroke="#9fb7af" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values.at(-1)!)} r="4" fill="var(--color-chart-1)" stroke="white" strokeWidth="2" />
    </svg>
  );
}

/** Label, value, optional change against a named period and a sparkline. */
export function StatTile({ label, value, delta, deltaLabel, upIsGood = true, trend, to, note }: {
  label: string; value: string; delta?: number; deltaLabel?: string; upIsGood?: boolean; trend?: number[]; to?: string; note?: string;
}) {
  const good = delta === undefined || delta === 0 ? null : (delta > 0) === upIsGood;
  const body = (
    <>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-3xl leading-none font-bold tracking-tight text-forest">{value}</p>
        {trend && <Sparkline values={trend} label={`${label}, last ${trend.length} weeks`} />}
      </div>
      {delta !== undefined && (
        <p className="mt-2 text-xs text-slate-500">
          <span className={`mr-1 inline-flex items-center rounded-full px-1.5 py-px font-bold tabular-nums ${good === null ? "bg-slate-100 text-slate-600" : good ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "●"} {delta > 0 ? "+" : ""}{delta}
          </span>
          {deltaLabel}
        </p>
      )}
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </>
  );
  const cls = "block min-w-0 rounded-2xl bg-white p-4 shadow-ring transition-shadow duration-150";
  return to ? <Link to={to} className={`${cls} hover:shadow-lift`}>{body}</Link> : <div className={cls}>{body}</div>;
}

// Parts of a whole (owner, 2026-11-05: "a pie chart where it helps"). Validated categorical order (dataviz validator,
// light surface): emerald, amber, blue, rose, violet; anything past five folds into a neutral Other. Amber is under 3:1,
// so every slice's number and share are printed in the legend beside it.
export const PART_COLORS = ["#169a82", "#d99a1a", "#2f6fd0", "#e0477a", "#8b5cf6"];
const OTHER_COLOR = "#a3aebd";

/** A ring split into parts with a 2px gap between slices, the total in the middle and a legend with the numbers. */
export function Donut({ title, parts, centerLabel, empty = "Nothing yet." }: {
  title: string; parts: { label: string; value: number }[]; centerLabel: string; empty?: string;
}) {
  const sorted = parts.filter((p) => p.value > 0).sort((a, b) => b.value - a.value);
  const shown = sorted.length > 5 ? [...sorted.slice(0, 4), { label: "Other", value: sorted.slice(4).reduce((n, p) => n + p.value, 0) }] : sorted;
  const total = shown.reduce((n, p) => n + p.value, 0);
  const r = 42, c = 2 * Math.PI * r, gap = shown.length > 1 ? 2 : 0;
  const [hover, setHover] = useState<number | null>(null);
  let offset = 0;
  const color = (i: number) => (shown[i].label === "Other" && sorted.length > 5 ? OTHER_COLOR : PART_COLORS[i]);
  return (
    <figure>
      <figcaption className="text-sm font-bold text-forest">{title}</figcaption>
      {!total ? <p className="mt-3 text-sm text-slate-500">{empty}</p> : (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <svg viewBox="0 0 100 100" className="size-32 shrink-0 -rotate-90" role="img" aria-label={`${title}: ${shown.map((p) => `${p.label} ${p.value}`).join(", ")}`}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-grid)" strokeWidth="12" />
            {shown.map((p, i) => {
              const len = (p.value / total) * c;
              const seg = (
                <circle key={p.label} cx="50" cy="50" r={r} fill="none" stroke={color(i)} strokeWidth={hover === i ? 14 : 12}
                  strokeDasharray={`${Math.max(len - gap, 0.5)} ${c}`} strokeDashoffset={-offset} className="transition-[stroke-width] duration-150"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <title>{`${p.label}: ${p.value} (${Math.round((100 * p.value) / total)}%)`}</title>
                </circle>
              );
              offset += len;
              return seg;
            })}
            <text x="50" y="47" transform="rotate(90 50 50)" textAnchor="middle" className="fill-forest text-[17px] font-extrabold">{total}</text>
            <text x="50" y="61" transform="rotate(90 50 50)" textAnchor="middle" className="fill-slate-500 text-[8px] font-semibold">{centerLabel}</text>
          </svg>
          <ul className="min-w-[11rem] flex-1 space-y-1.5 text-sm">
            {shown.map((p, i) => (
              <li key={p.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                className={`flex items-center gap-2 rounded-md px-1 transition-colors ${hover === i ? "bg-slate-50" : ""}`}>
                <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: color(i) }} />
                <span className="min-w-[5rem] flex-1 truncate text-slate-700">{p.label}</span>
                <span className="font-bold text-slate-900 tabular-nums">{p.value}</span>
                <span className="w-9 text-right text-xs text-slate-500 tabular-nums">{Math.round((100 * p.value) / total)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </figure>
  );
}
