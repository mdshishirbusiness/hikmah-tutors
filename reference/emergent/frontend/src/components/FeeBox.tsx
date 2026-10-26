import type { Fees } from "../types";
import { useI18n } from "../i18n";
import { fmtTaka } from "../lib/format";

export function FeeBox({ fees }: { fees: Fees }) {
  const { t, lang } = useI18n();
  const tk = (v: number) => `৳ ${fmtTaka(v, lang)}`;
  return (
    <section className="rounded-3xl border border-brand-100 bg-brand-50 p-5 sm:p-6" data-testid="fee-box">
      <h2 className="text-base md:text-lg font-bold text-forest">{t("fee.title")}</h2>
      <p className="mt-1 text-sm text-slate-700">{t("fee.intro")}</p>
      <blockquote className="mt-3 rounded-xl bg-white border-l-4 border-brand-600 px-4 py-3 text-forest font-semibold" lang="bn" data-testid="fee-canonical">
        {t("fee.canonical")}
      </blockquote>
      {fees.is_example ? (
        <p className="mt-3 text-sm font-semibold text-slate-700" data-testid="fee-example-note">{t("fee.example_note")}</p>
      ) : (
        <p className="mt-3 text-sm text-slate-600" data-testid="fee-basis">{t("fee.basis", { amt: tk(fees.basis) })}</p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white border border-brand-100 p-4" data-testid="fee-standard">
          <p className="font-bold text-forest">{t("fee.standard_title")}</p>
          <p className="text-sm text-slate-600">{t("fee.standard_desc")}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">{t("fee.first")}</dt><dd className="font-semibold" data-testid="fee-standard-first">{tk(fees.first)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-600">{t("fee.second")}</dt><dd className="font-semibold" data-testid="fee-standard-second">{tk(fees.second)}</dd></div>
            <div className="flex justify-between border-t border-brand-100 pt-2 mt-2"><dt className="font-bold text-forest">{t("fee.total")}</dt><dd className="text-xl font-bold text-forest" data-testid="fee-standard-total">{tk(fees.standard_total)}</dd></div>
          </dl>
        </div>
        <div className="rounded-2xl bg-white border-2 border-brand-600 p-4" data-testid="fee-early">
          <p className="font-bold text-forest">{t("fee.early_title")}</p>
          <p className="text-sm text-slate-600">{t("fee.early_desc")}</p>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-600">{t("fee.within7")}</dt><dd className="font-semibold">{tk(fees.early_total)}</dd></div>
            <div className="flex justify-between border-t border-brand-100 pt-2 mt-2"><dt className="font-bold text-forest">{t("fee.total")}</dt><dd className="text-xl font-bold text-forest" data-testid="fee-early-total">{tk(fees.early_total)}</dd></div>
          </dl>
          <p className="mt-2 inline-block rounded-full bg-mango px-3 py-0.5 text-xs font-bold text-forest" data-testid="fee-saving">{t("fee.saving", { amt: tk(fees.saving) })}</p>
        </div>
      </div>
      {fees.is_example && <p className="mt-3 text-sm font-semibold text-forest" lang="bn" data-testid="fee-pending">{t("fee.pending")}</p>}
      <p className="mt-3 text-sm text-slate-600">{t("fee.no_reg")}</p>
    </section>
  );
}
