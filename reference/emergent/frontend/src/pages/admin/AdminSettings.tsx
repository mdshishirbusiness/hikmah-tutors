import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Plus } from "lucide-react";
import { ApiError, adminApi, getOptions } from "../../api/client";
import { useI18n } from "../../i18n";
import { setServerOptions } from "../../lib/options";
import { Card, Field, Loading, PanelTitle, inputCls } from "../../components/panel/ui";
import { Button } from "../../components/Button";

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24);

export default function AdminSettings() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: adminApi.settings });
  const [f, setF] = useState<any>(null);
  const [nl, setNl] = useState({ label: "", label_en: "", group: "ssc" });
  useEffect(() => { if (q.data && !f) setF(q.data); }, [q.data, f]);
  const save = useMutation({
    mutationFn: () => adminApi.saveSettings({
      contact_whatsapp: f.contact_whatsapp || null, contact_call: f.contact_call || null, facebook_page_url: f.facebook_page_url || "",
      daily_application_limit: Number(f.daily_application_limit) || 20, post_opening: f.post_opening || "", post_closing: f.post_closing || "",
      post_trust: f.post_trust || "", post_multi_headline: f.post_multi_headline || "", class_levels: f.class_levels,
    }),
    onSuccess: async (r) => {
      setF(r);
      setServerOptions(await getOptions());
      qc.invalidateQueries();
      toast.success("সেটিংস সেভ হয়েছে");
    },
    onError: (e) => toast.error(e instanceof ApiError ? `সেভ হয়নি: ${e.detail}` : "সেভ হয়নি"),
  });
  if (!f) return <Loading />;
  const set = (k: string) => (e: any) => setF((p: any) => ({ ...p, [k]: e.target.value }));
  const setLevel = (i: number, patch: any) => setF((p: any) => ({ ...p, class_levels: p.class_levels.map((c: any, j: number) => (j === i ? { ...c, ...patch } : c)) }));
  const addLevel = () => {
    const key = slug(nl.label_en);
    if (!key || !nl.label.trim()) { toast.error("বাংলা ও English নাম দিন"); return; }
    if (f.class_levels.some((c: any) => c.key === key)) { toast.error("এই নামে আগেই আছে"); return; }
    setF((p: any) => ({ ...p, class_levels: [...p.class_levels, { key, label: nl.label.trim(), label_en: nl.label_en.trim(), group: nl.group, hidden: false, alt: [] }] }));
    setNl({ label: "", label_en: "", group: nl.group });
  };
  return (
    <div data-testid="admin-settings">
      <PanelTitle title="সেটিংস" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4" testId="settings-contacts">
          <h2 className="font-bold text-forest">যোগাযোগ ও সীমা</h2>
          <Field label="WhatsApp নম্বর" htmlFor="s-wa"><input id="s-wa" className={inputCls} value={f.contact_whatsapp || ""} onChange={set("contact_whatsapp")} data-testid="settings-whatsapp" /></Field>
          <Field label="কল নম্বর" htmlFor="s-call"><input id="s-call" className={inputCls} value={f.contact_call || ""} onChange={set("contact_call")} data-testid="settings-call" /></Field>
          <Field label="Facebook পেজ লিংক" htmlFor="s-fb"><input id="s-fb" className={inputCls} value={f.facebook_page_url || ""} onChange={set("facebook_page_url")} data-testid="settings-facebook" /></Field>
          <Field label="দৈনিক আবেদনের সীমা" htmlFor="s-lim"><input id="s-lim" inputMode="numeric" className={inputCls} value={f.daily_application_limit ?? ""} onChange={set("daily_application_limit")} data-testid="settings-limit" /></Field>
        </Card>
        <Card className="space-y-4" testId="settings-posts">
          <h2 className="font-bold text-forest">পোস্টের লেখা</h2>
          <Field label="শুরুর লাইন (Facebook)" htmlFor="s-open"><textarea id="s-open" rows={2} className={`${inputCls} py-3`} value={f.post_opening || ""} onChange={set("post_opening")} data-testid="settings-post-opening" /></Field>
          <Field label="শেষের লাইন" htmlFor="s-close"><textarea id="s-close" rows={2} className={`${inputCls} py-3`} value={f.post_closing || ""} onChange={set("post_closing")} data-testid="settings-post-closing" /></Field>
          <Field label='"Why trust" অংশ' htmlFor="s-trust"><textarea id="s-trust" rows={3} className={`${inputCls} py-3`} value={f.post_trust || ""} onChange={set("post_trust")} data-testid="settings-post-trust" /></Field>
          <Field label="একাধিক টিউশনের হেডলাইন" hint="{total} {male} {female}" htmlFor="s-multi"><input id="s-multi" className={inputCls} value={f.post_multi_headline || ""} onChange={set("post_multi_headline")} data-testid="settings-post-multi" /></Field>
        </Card>
      </div>
      <Card className="mt-4" testId="settings-class-levels">
        <h2 className="font-bold text-forest">ক্লাস ও ব্যাচ তালিকা</h2>
        <p className="text-sm text-slate-600">নাম বদলাতে বা লুকাতে পারবেন। কী (key) কখনো বদলায় না, তাই পুরোনো টিউশন ঠিক থাকে। নতুন বছরের ব্যাচ (যেমন SSC ২০২৯) নিচে যোগ করুন।</p>
        <div className="mt-3 divide-y divide-brand-100">
          {f.class_levels.map((c: any, i: number) => (
            <div key={c.key} className={`grid grid-cols-[1fr_1fr_auto] sm:grid-cols-[1fr_1fr_140px_auto] gap-2 py-2 items-center ${c.hidden ? "opacity-50" : ""}`} data-testid={`class-row-${c.key}`}>
              <input className={inputCls} value={c.label} onChange={(e) => setLevel(i, { label: e.target.value })} aria-label="বাংলা নাম" data-testid={`class-label-${c.key}`} />
              <input className={inputCls} value={c.label_en} onChange={(e) => setLevel(i, { label_en: e.target.value })} aria-label="English name" data-testid={`class-label-en-${c.key}`} />
              <select className={`${inputCls} hidden sm:block`} value={c.group} onChange={(e) => setLevel(i, { group: e.target.value })} aria-label="গ্রুপ" data-testid={`class-group-${c.key}`}>
                {f.class_groups.map((g: string) => <option key={g} value={g}>{t(`class.group.${g}`)}</option>)}
              </select>
              <button type="button" onClick={() => setLevel(i, { hidden: !c.hidden })} aria-label={c.hidden ? "দেখান" : "লুকান"} className="h-12 w-12 inline-flex items-center justify-center rounded-xl hover:bg-brand-50 text-forest" data-testid={`class-hide-${c.key}`}>
                {c.hidden ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto] items-end rounded-xl bg-brand-50 p-3">
          <input className={inputCls} value={nl.label} onChange={(e) => setNl({ ...nl, label: e.target.value })} placeholder="বাংলা, যেমন SSC ২০২৯" data-testid="class-new-label" />
          <input className={inputCls} value={nl.label_en} onChange={(e) => setNl({ ...nl, label_en: e.target.value })} placeholder="English, e.g. SSC 2029" data-testid="class-new-label-en" />
          <select className={inputCls} value={nl.group} onChange={(e) => setNl({ ...nl, group: e.target.value })} data-testid="class-new-group">
            {f.class_groups.map((g: string) => <option key={g} value={g}>{t(`class.group.${g}`)}</option>)}
          </select>
          <Button variant="secondary" onClick={addLevel} data-testid="class-add"><Plus size={18} aria-hidden /> যোগ</Button>
        </div>
      </Card>
      <div className="sticky bottom-4 mt-6 z-20"><Button className="w-full sm:w-auto shadow-lg" onClick={() => save.mutate()} disabled={save.isPending} data-testid="settings-save">{save.isPending ? "সেভ হচ্ছে…" : "সব সেটিংস সেভ করুন"}</Button></div>
    </div>
  );
}
