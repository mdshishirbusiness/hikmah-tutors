import { useI18n } from "../i18n";
import { PageShell } from "../components/PageShell";
import { FeeBox } from "../components/FeeBox";
import { fmtTaka } from "../lib/format";
import type { Fees as FeesT } from "../types";

function breakdown(basis: number): FeesT {
  const standard_total = Math.floor((basis * 60 + 50) / 100);
  const early_total = Math.floor((basis * 50 + 50) / 100);
  const first = Math.floor(standard_total / 2);
  return { basis, standard_total, early_total, first, second: standard_total - first, saving: standard_total - early_total, is_example: false };
}

export default function Fees() {
  const { t, lang } = useI18n();
  const tk = (v: number) => `৳ ${fmtTaka(v, lang)}`;
  const example = breakdown(4000);
  return (
    <PageShell title={t("fees.title")} sub={t("fees.sub")} testId="fees-page">
      <FeeBox fees={{ ...example, is_example: true }} />
      <section className="rounded-2xl bg-white border border-brand-100 p-5" data-testid="fees-examples">
        <h2 className="text-base md:text-lg font-bold text-forest">{t("fees.examples")}</h2>
        <ul className="mt-3 space-y-2 text-sm sm:text-base">
          {[3000, 4000, 5000, 8000].map((b) => {
            const f = breakdown(b);
            return (
              <li key={b} className="rounded-xl bg-brand-50 px-4 py-2" data-testid={`fees-example-${b}`}>
                {t("fees.example_row", { salary: tk(b), first: tk(f.first), second: tk(f.second), total: tk(f.standard_total), early: tk(f.early_total), saving: tk(f.saving) })}
              </li>
            );
          })}
        </ul>
      </section>
      <p className="text-slate-700" data-testid="fees-guardian-note">{t("fees.guardian_note")}</p>
    </PageShell>
  );
}
