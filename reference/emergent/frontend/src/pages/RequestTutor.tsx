import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageCircle, Phone } from "lucide-react";
import { ApiError, createLead } from "../api/client";
import { useI18n } from "../i18n";
import { optList } from "../lib/options";
import { normalizePhone } from "../lib/phone";
import { telLink, waLink } from "../lib/format";
import { PageShell } from "../components/PageShell";
import { Button, linkButton } from "../components/Button";
import { Chip } from "../components/Chip";
import { ClassPicker } from "../components/ClassPicker";
import { gstyle } from "../lib/gender";
import { useSettings } from "../components/SettingsContext";

type Errors = Partial<Record<"name" | "phone" | "area" | "class_level" | "subjects" | "consent" | "form", string>>;

const field = "w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 transition-colors";

export default function RequestTutor() {
  const { t, lang } = useI18n();
  const s = useSettings();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [areaOther, setAreaOther] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [tutorGender, setTutorGender] = useState<"any" | "male" | "female">("any");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const clientId = useMemo(() => crypto.randomUUID(), []);

  const lbl = (o: { label: string; label_en: string }) => (lang === "bn" ? o.label : o.label_en);
  const areaValue = area === "__other" ? areaOther.trim() : area;

  const clearErr = (k: keyof Errors) => setErrors((prev) => (prev[k] ? { ...prev, [k]: undefined } : prev));

  const validate = (): Errors => {
    const e: Errors = {};
    if (name.trim().length < 2) e.name = t("request.err_name");
    if (!normalizePhone(phone)) e.phone = t("request.err_phone");
    if (!areaValue) e.area = t("request.err_area");
    if (!classLevel) e.class_level = t("request.err_class");
    if (subjects.length === 0) e.subjects = t("request.err_subject");
    if (!consent) e.consent = t("request.err_consent");
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-testid="request-form"] [aria-invalid="true"], [data-testid^="request-error-"]')?.scrollIntoView({ block: "center", behavior: "smooth" }));
      return;
    }
    setBusy(true);
    try {
      await createLead({ name: name.trim(), phone: normalizePhone(phone)!, area: areaValue, class_level: classLevel, tutor_gender: tutorGender, subjects, note: note.trim(), consent, website, client_id: clientId });
      setDone(true);
    } catch (err) {
      setErrors({ form: err instanceof ApiError && err.status === 429 ? t("request.err_rate") : err instanceof ApiError && err.detail === "invalid_phone" ? t("request.err_phone") : t("request.err_generic") });
    } finally {
      setBusy(false);
    }
  };

  const err = (k: keyof Errors) => errors[k] && <p className="mt-1 text-sm text-red-700" role="alert" data-testid={`request-error-${k}`}>{errors[k]}</p>;

  const contactRow = (
    <div className="flex flex-col sm:flex-row gap-2">
      <a href={waLink(s.contact_whatsapp, t("guardian.wa_text"))} target="_blank" rel="noreferrer" className={linkButton("secondary")} data-testid="request-whatsapp"><MessageCircle size={18} aria-hidden /> {t("guardian.whatsapp")}</a>
      <a href={telLink(s.contact_call)} className={linkButton("secondary")} data-testid="request-call"><Phone size={18} aria-hidden /> {t("guardian.call")}</a>
    </div>
  );

  if (done) {
    return (
      <PageShell title={t("request.title")} testId="request-tutor-page">
        <div className="rounded-3xl bg-brand-50 border border-brand-100 p-8 text-center animate-rise" role="status" data-testid="request-success">
          <CheckCircle2 className="mx-auto text-brand-600" size={48} aria-hidden />
          <p className="mt-4 text-2xl font-bold text-forest">{t("request.success")}</p>
          <p className="mt-2 text-slate-700">{t("request.success_sub")}</p>
          <div className="mt-6 flex justify-center">{contactRow}</div>
          <Link to="/" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 hover:underline" data-testid="request-success-board">{t("request.back")}</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={t("request.title")} sub={t("request.sub")} testId="request-tutor-page">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900" data-testid="request-preview-notice">{t("request.preview")}</p>
      <form onSubmit={submit} noValidate className="space-y-6" data-testid="request-form">
        <section className="rounded-2xl border border-brand-100 bg-white p-5 sm:p-7 space-y-5" data-testid="request-contact-section">
          <div className="flex items-start gap-3 pb-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">{lang === "bn" ? "০১" : "01"}</span><div><h2 className="text-base md:text-lg font-bold text-forest">{t("request.contact_section")}</h2><p className="mt-1 text-xs text-slate-500">{t("request.contact_hint")}</p></div></div>
        <div>
          <label htmlFor="rq-name" className="block font-semibold text-forest mb-1">{t("request.name")}</label>
          <input id="rq-name" value={name} onChange={(e) => { setName(e.target.value); clearErr("name"); }} className={field} autoComplete="name" data-testid="request-name" aria-invalid={!!errors.name} maxLength={80} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="rq-phone" className="block font-semibold text-forest mb-1">{t("request.phone")}</label>
          <input id="rq-phone" value={phone} onChange={(e) => { setPhone(e.target.value); clearErr("phone"); }} className={field} inputMode="tel" autoComplete="tel" placeholder={t("request.phone_hint")} data-testid="request-phone" aria-invalid={!!errors.phone} />
          {err("phone")}
        </div>
        <div>
          <label htmlFor="rq-area" className="block font-semibold text-forest mb-1">{t("request.area")}</label>
          <select id="rq-area" value={area} onChange={(e) => { setArea(e.target.value); clearErr("area"); }} className={field} data-testid="request-area" aria-invalid={!!errors.area}>
            <option value="">{t("request.area_placeholder")}</option>
            {optList("areas").map((a) => <option key={a.key} value={a.key}>{lbl(a)}</option>)}
            <option value="__other">{t("request.area_other")}</option>
          </select>
          {area === "__other" && (
            <input value={areaOther} onChange={(e) => { setAreaOther(e.target.value); clearErr("area"); }} className={`${field} mt-2`} placeholder={t("request.area_other_label")} aria-label={t("request.area_other_label")} data-testid="request-area-other" maxLength={60} />
          )}
          {err("area")}
        </div>
        </section>
        <section className="rounded-2xl border border-brand-100 bg-white p-5 sm:p-7 space-y-5" data-testid="request-learning-section">
          <div className="flex items-start gap-3 pb-2"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">{lang === "bn" ? "০২" : "02"}</span><div><h2 className="text-base md:text-lg font-bold text-forest">{t("request.learning_section")}</h2><p className="mt-1 text-xs text-slate-500">{t("request.learning_hint")}</p></div></div>
        <fieldset data-testid="request-class">
          <legend className="font-semibold text-forest mb-1">{t("request.class")} <span className="text-sm font-normal text-slate-500">— {t("request.class_hint")}</span></legend>
          <div className="rounded-2xl border border-brand-100 bg-white p-4">
            <ClassPicker testPrefix="request-class" value={classLevel} onChange={(v) => { setClassLevel(v); clearErr("class_level"); }} />
          </div>
          {err("class_level")}
        </fieldset>
        <fieldset>
          <legend className="font-semibold text-forest mb-1">{t("request.tutor_gender")}</legend>
          <div className="grid grid-cols-3 gap-2" data-testid="request-tutor-gender">
            {(["any", "male", "female"] as const).map((g) => (
              <button key={g} type="button" aria-pressed={tutorGender === g} onClick={() => setTutorGender(g)} data-testid={`request-tutor-gender-${g}`}
                className={`min-h-[48px] rounded-xl border-2 px-2 text-sm font-bold transition-colors duration-150 ${tutorGender === g ? gstyle(g).chipOn : `bg-white ${gstyle(g).border} text-forest`}`}>
                {t(g === "any" ? "card.tutor_any" : g === "male" ? "card.tutor_male" : "card.tutor_female")}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="font-semibold text-forest mb-1">{t("request.subject")} <span className="text-sm font-normal text-slate-500">— {t("request.subject_hint")}</span></legend>
          <div className="flex flex-wrap gap-2" data-testid="request-subjects">
            {optList("subjects").map((sub) => (
              <Chip key={sub.key} active={subjects.includes(sub.key)} testId={`request-subject-${sub.key}`}
                onClick={() => { clearErr("subjects"); setSubjects((prev) => (prev.includes(sub.key) ? prev.filter((x) => x !== sub.key) : [...prev, sub.key])); }}>
                {lbl(sub)}
              </Chip>
            ))}
          </div>
          {err("subjects")}
        </fieldset>
        </section>
        <section className="rounded-2xl border border-brand-100 bg-white p-5 sm:p-7 space-y-5" data-testid="request-finish-section">
          <div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700">{lang === "bn" ? "০৩" : "03"}</span><h2 className="text-base md:text-lg font-bold text-forest">{t("request.finish_section")}</h2></div>
        <div>
          <label htmlFor="rq-note" className="block font-semibold text-forest mb-1">{t("request.note")}</label>
          <textarea id="rq-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} className={`${field} py-3`} placeholder={t("request.note_placeholder")} data-testid="request-note" />
        </div>
        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" data-testid="request-honeypot" />
        <div>
          <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); clearErr("consent"); }} className="mt-1 h-5 w-5 accent-brand-600" data-testid="request-consent" aria-invalid={!!errors.consent} />
            <span className="text-sm text-slate-700">
              {t("request.consent")} <Link to="/privacy" className="text-brand-700 underline" data-testid="request-privacy-link">{t("request.consent_link")}</Link>
            </span>
          </label>
          {err("consent")}
        </div>
        {errors.form && <p className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm" role="alert" data-testid="request-error-form">{errors.form}</p>}
        <Button type="submit" disabled={busy} className="w-full rounded-xl bg-forest hover:bg-forest-mid" data-testid="request-submit">{busy ? t("request.submitting") : t("request.submit")}</Button>
        </section>
      </form>
      <div>
        <p className="text-sm text-slate-600 mb-2">{t("request.or")}</p>
        {contactRow}
      </div>
    </PageShell>
  );
}
