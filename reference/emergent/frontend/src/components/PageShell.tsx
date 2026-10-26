import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "../i18n";

export function PageShell({ title, sub, children, draft, testId }: { title: string; sub?: string; children: ReactNode; draft?: boolean; testId: string }) {
  const { t } = useI18n();
  return (
    <div data-testid={testId}>
      <div className="on-forest bg-forest text-cream">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-brand-200 hover:text-mango min-h-[44px]" data-testid="page-back-link">
            <ArrowLeft size={16} aria-hidden /> {t("detail.back")}
          </Link>
          <h1 className="mt-2 text-4xl sm:text-5xl font-bold">{title}</h1>
          {sub && <p className="mt-3 text-brand-200 max-w-xl">{sub}</p>}
          {draft && <><p className="mt-4 inline-block rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-sm font-bold" data-testid="draft-label">{t("draft.label")}</p><p className="mt-3 text-xs text-brand-200" data-testid="draft-preview-note">{t("request.preview")}</p></>}
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-12 space-y-8">{children}</div>
    </div>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-slate-800 [&_h2]:text-forest [&_h2]:font-bold [&_h2]:text-lg [&_h2]:mt-6">{children}</div>;
}
