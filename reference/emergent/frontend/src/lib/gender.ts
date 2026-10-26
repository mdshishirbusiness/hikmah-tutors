export type GenderPref = "male" | "female" | "any";

export const GENDER_STYLE: Record<GenderPref, { strip: string; border: string; bar: string; badge: string; icon: string; chipOn: string }> = {
  male: {
    strip: "bg-blue-50 text-blue-900",
    border: "border-blue-200 hover:border-blue-400",
    bar: "bg-blue-600",
    badge: "bg-blue-100 text-blue-900 border border-blue-300",
    icon: "text-blue-700",
    chipOn: "bg-blue-700 border-blue-700 text-white",
  },
  female: {
    strip: "bg-rose-50 text-rose-900",
    border: "border-rose-200 hover:border-rose-400",
    bar: "bg-rose-600",
    badge: "bg-rose-100 text-rose-900 border border-rose-300",
    icon: "text-rose-700",
    chipOn: "bg-rose-700 border-rose-700 text-white",
  },
  any: {
    strip: "bg-emerald-50 text-emerald-900",
    border: "border-emerald-200 hover:border-emerald-400",
    bar: "bg-emerald-600",
    badge: "bg-emerald-100 text-emerald-900 border border-emerald-300",
    icon: "text-emerald-700",
    chipOn: "bg-emerald-700 border-emerald-700 text-white",
  },
};

export function genderNeedKey(pref: string): string {
  return pref === "male" ? "card.need_male" : pref === "female" ? "card.need_female" : "card.need_any";
}

export function gstyle(pref: string | null | undefined) {
  return GENDER_STYLE[(pref as GenderPref) in GENDER_STYLE ? (pref as GenderPref) : "any"];
}
