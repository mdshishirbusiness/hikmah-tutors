import { useI18n } from "../i18n";
import { PageShell, Prose } from "../components/PageShell";

export default function Terms() {
  const { t } = useI18n();
  return (
    <PageShell title={t("terms.title")} draft testId="terms-page">
      <Prose>
        <p>{t("terms.p1")}</p>
        <h2>{t("terms.h2")}</h2>
        <p>{t("terms.p2")}</p>
        <h2>{t("terms.h3")}</h2>
        <p>{t("terms.p3")}</p>
        <h2>{t("terms.h4")}</h2>
        <p>{t("terms.p4")}</p>
        <h2>{t("terms.h5")}</h2>
        <p>{t("terms.p5")}</p>
      </Prose>
    </PageShell>
  );
}
