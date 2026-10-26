import { useI18n } from "../i18n";
import { CLASS_GROUPS, classOptions } from "../lib/options";
import { Chip } from "./Chip";

type Props = { testPrefix: string; compact?: boolean } & (
  | { multi?: false; value: string; onChange: (v: string) => void }
  | { multi: true; value: string[]; onChange: (v: string[]) => void }
);

export function ClassPicker(props: Props) {
  const { t, lang } = useI18n();
  const all = classOptions();
  const isOn = (k: string) => (props.multi ? props.value.includes(k) : props.value === k);
  const toggle = (k: string) => {
    if (props.multi) props.onChange(props.value.includes(k) ? props.value.filter((x) => x !== k) : [...props.value, k]);
    else props.onChange(props.value === k ? "" : k);
  };
  return (
    <div className="space-y-3" data-testid={`${props.testPrefix}-picker`}>
      {CLASS_GROUPS.map((g) => {
        const items = all.filter((c) => c.group === g);
        if (!items.length) return null;
        return (
          <div key={g}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">{t(`class.group.${g}`)}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((c) => (
                <Chip key={c.key} active={isOn(c.key)} onClick={() => toggle(c.key)} testId={`${props.testPrefix}-${c.key}`} className={props.compact ? "px-3" : ""}>
                  {lang === "bn" ? c.label : c.label_en}
                </Chip>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
