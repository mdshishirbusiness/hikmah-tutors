import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { adminApi } from "../../api/client";
import { useI18n } from "../../i18n";
import { optLabel } from "../../lib/options";
import { gstyle } from "../../lib/gender";
import { Card, Loading, PanelTitle } from "../../components/panel/ui";
import { Button } from "../../components/Button";

function Out({ title, text, id }: { title: string; text: string; id: string }) {
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success("কপি হয়েছে"); } catch { toast.error("কপি করা যায়নি"); }
  };
  return (
    <Card testId={`post-out-${id}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-bold text-forest">{title}</p>
        <Button variant="secondary" className="min-h-[40px] px-4 text-sm" onClick={copy} data-testid={`post-copy-${id}`}><Copy size={16} aria-hidden /> কপি</Button>
      </div>
      <pre className="whitespace-pre-wrap font-sans text-sm bg-slate-50 rounded-xl p-3 max-h-80 overflow-auto" data-testid={`post-text-${id}`}>{text}</pre>
    </Card>
  );
}

export default function AdminPosts() {
  const { lang } = useI18n();
  const [sp] = useSearchParams();
  const [sel, setSel] = useState<number[]>(sp.get("codes") ? sp.get("codes")!.split(",").map(Number) : []);
  const [trust, setTrust] = useState(true);
  const [link, setLink] = useState(false);
  const list = useQuery({ queryKey: ["admin-tuitions", "", ""], queryFn: () => adminApi.tuitions() });
  const gen = useMutation({ mutationFn: () => adminApi.posts({ codes: sel, include_trust: trust, include_link: link }) });
  const items = (list.data?.items || []).filter((t) => t.is_public && ["available", "processing"].includes(t.status));
  const toggle = (c: number) => setSel((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  return (
    <div data-testid="admin-posts">
      <PanelTitle title="পোস্ট জেনারেটর" sub="শুধু পাবলিশ করা টিউশন দেখাচ্ছে। এক বা একাধিক বাছুন। পোস্টে কখনো অভিভাবকের ফোন, ঠিকানা বা শিক্ষার্থীর নাম যায় না।" />
      {list.isPending ? <Loading /> : (
        <Card>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((tu) => (
              <label key={tu.code} className={`flex items-center gap-3 min-h-[52px] rounded-xl border-2 px-3 cursor-pointer transition-colors ${sel.includes(tu.code) ? "border-brand-600 bg-brand-50" : "border-brand-100 bg-white"}`}>
                <input type="checkbox" className="h-5 w-5 accent-brand-600" checked={sel.includes(tu.code)} onChange={() => toggle(tu.code)} data-testid={`post-pick-${tu.code}`} />
                <span className={`h-2.5 w-2.5 rounded-full ${gstyle(tu.tutor_gender_pref).bar}`} aria-hidden />
                <span className="text-sm"><b>{tu.code_label}</b> · {optLabel("class_levels", tu.class_level, lang)} · {optLabel("areas", tu.area, lang)}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-semibold min-h-[44px]"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={trust} onChange={(e) => setTrust(e.target.checked)} data-testid="post-trust" /> WhatsApp-এ "Why trust" অংশ</label>
            <label className="inline-flex items-center gap-2 text-sm font-semibold min-h-[44px]"><input type="checkbox" className="h-5 w-5 accent-brand-600" checked={link} onChange={(e) => setLink(e.target.checked)} data-testid="post-link" /> ওয়েবসাইট লিংক যোগ করুন</label>
          </div>
          <Button className="mt-3" disabled={!sel.length || gen.isPending} onClick={() => gen.mutate()} data-testid="post-generate">পোস্ট তৈরি করুন ({sel.length})</Button>
        </Card>
      )}
      {gen.data && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Out id="facebook" title="Facebook পোস্ট" text={gen.data.facebook} />
          <Out id="whatsapp" title="WhatsApp পোস্ট" text={gen.data.whatsapp} />
          <Out id="contact" title="কন্টাক্ট-সেভ লাইন" text={gen.data.contact_line} />
          <Out id="sheet" title="শিট রো (ট্যাব দিয়ে আলাদা)" text={gen.data.sheet_row} />
        </div>
      )}
    </div>
  );
}
