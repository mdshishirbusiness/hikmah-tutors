import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { linkButton } from "../components/Button";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center" data-testid="not-found-page">
      <h1 className="text-4xl font-bold text-forest">{t("notfound.title")}</h1>
      <p className="mt-3 text-slate-700">{t("notfound.body")}</p>
      <Link to="/" className={`${linkButton("primary")} mt-8`} data-testid="not-found-back">{t("notfound.back")}</Link>
    </div>
  );
}
