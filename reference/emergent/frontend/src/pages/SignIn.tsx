import { Link } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useI18n } from "../i18n";
import { linkButton } from "../components/Button";

export default function SignIn({ kind }: { kind: "signin" | "claim" }) {
  const { t } = useI18n();
  const title = kind === "claim" ? t("claim.title") : t("signin.title");
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center" data-testid={`${kind}-page`}>
      <div className="mx-auto h-16 w-16 rounded-full bg-brand-50 text-brand-600 inline-flex items-center justify-center">
        <LogIn size={28} aria-hidden />
      </div>
      <h1 className="mt-6 text-4xl font-bold text-forest">{title}</h1>
      <p className="mt-4 inline-block rounded-full bg-mango px-4 py-1 text-sm font-bold text-forest" data-testid="signin-coming-soon">{t("signin.coming")}</p>
      <p className="mt-4 text-slate-700">{kind === "claim" ? t("claim.body") : t("signin.body")}</p>
      <p className="mt-2 text-sm text-slate-600">{t("signin.why")}</p>
      <Link to="/" className={`${linkButton("primary")} mt-8`} data-testid="signin-back-link">{t("signin.back")}</Link>
    </div>
  );
}
