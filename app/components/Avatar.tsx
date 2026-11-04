// A tutor's photo, or their initials on a tinted disc when there is none. Photos are private (admin and the tutor only);
// /photos/tutor/:code checks the viewer, so this component never decides who may see one.
import { useState } from "react";

const TINTS = ["bg-brand-100 text-brand-700", "bg-amber-100 text-amber-900", "bg-sky-100 text-sky-900", "bg-rose-100 text-rose-900", "bg-violet-100 text-violet-900", "bg-lime-100 text-lime-900"];

const SIZES = { xs: "size-8 text-xs", sm: "size-10 text-sm", md: "size-12 text-base", lg: "size-16 text-xl", xl: "size-24 text-3xl" } as const;

export function initials(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")).toUpperCase() || "?";
}

export function Avatar({ code, name, hasPhoto, size = "sm", className = "" }: {
  code: number | null; name: string | null; hasPhoto: boolean; size?: keyof typeof SIZES; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const tint = TINTS[(code ?? 0) % TINTS.length];
  const base = `${SIZES[size]} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`;
  if (code && hasPhoto && !failed) {
    return <img src={`/photos/tutor/${code}`} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className={`${base} bg-brand-50`} />;
  }
  return <span aria-hidden className={`${base} grid place-items-center font-bold ${tint}`}>{initials(name)}</span>;
}
