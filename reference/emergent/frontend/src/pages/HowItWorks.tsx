import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { PageShell } from "../components/PageShell";
import { GuardianPanel } from "../components/GuardianPanel";
import { linkButton } from "../components/Button";

export default function HowItWorks() {
  const { t, n } = useI18n();
  const steps = [1, 2, 3, 4];
  return (
    <PageShell title={t("how.title")} sub={t("how.sub")} testId="how-it-works-page">
      <ol className="space-y-4">
        {steps.map((i) => (
          <li key={i} className="flex gap-4 rounded-2xl bg-white border border-brand-100 p-5 animate-rise" style={{ animationDelay: `${i * 50}ms` }} data-testid={`how-step-${i}`}>
            <span className="shrink-0 h-12 w-12 rounded-full bg-mango text-forest font-bold text-xl inline-flex items-center justify-center">{n(i)}</span>
            <div>
              <h2 className="text-lg font-bold text-forest">{t(`how.s${i}.title`)}</h2>
              <p className="mt-1 text-slate-700">{t(`how.s${i}.body`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Link to="/" className={linkButton("primary")} data-testid="how-cta-board">{t("nav.board")}</Link>
        <Link to="/fees" className={linkButton("secondary")} data-testid="how-cta-fees">{t("fees.title")}</Link>
      </div>
      <GuardianPanel compact />
    </PageShell>
  );
}
