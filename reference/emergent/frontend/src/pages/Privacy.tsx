import { useI18n } from "../i18n";
import { PageShell, Prose } from "../components/PageShell";

export default function Privacy() {
  const { t } = useI18n();
  return (
    <PageShell title={t("privacy.title")} draft testId="privacy-page">
      <Prose>
        <p>{t("privacy.p1")}</p>
        <h2>{t("privacy.h2")}</h2>
        <p>{t("privacy.p2")}</p>
        <h2>{t("privacy.h3")}</h2>
        <p>{t("privacy.p3")}</p>
        <h2>{t("privacy.h4")}</h2>
        <p>{t("privacy.p4")}</p>
      </Prose>
    </PageShell>
  );
}
