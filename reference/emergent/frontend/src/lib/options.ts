import optionsJson from "../../../shared/options.json";
import type { ClassOption, Lang, Option } from "../types";

const base = optionsJson as unknown as Record<string, any>;

export const options: Record<string, any> & { days_per_week: number[]; salary_filter_steps: number[]; salary_presets: number[] } = {
  ...base,
  all_class_levels: [...base.class_levels, ...base.legacy_class_levels],
  tutor_genders_profile: base.tutor_genders.filter((o: Option) => o.key !== "any"),
} as any;

export const CLASS_GROUPS = ["early", "school", "ssc", "hsc", "other"] as const;

export function setServerOptions(o: { class_levels: ClassOption[]; all_class_levels: ClassOption[] }) {
  options.class_levels = o.class_levels;
  options.all_class_levels = o.all_class_levels;
}

function listFor(group: string): Option[] {
  return group === "class_levels" ? options.all_class_levels : options[group] || [];
}

export function optLabel(group: string, key: string | null | undefined, lang: Lang): string {
  if (!key) return "";
  const o = listFor(group).find((x) => x.key === key);
  if (!o) return key;
  return lang === "bn" ? o.label : o.label_en;
}

export function optList(group: string): Option[] {
  return options[group] || [];
}

export function classOptions(): ClassOption[] {
  return options.class_levels;
}

export function isLegacyClass(key: string | null | undefined): boolean {
  return !!key && (options.legacy_class_levels as ClassOption[]).some((c) => c.key === key);
}
