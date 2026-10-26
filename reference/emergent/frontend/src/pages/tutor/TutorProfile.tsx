import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, tutorApi } from "../../api/client";
import { useMe } from "../../lib/useSaved";
import { ClassPicker } from "../../components/ClassPicker";
import { Card, Field, Loading, OptionChips, PanelTitle, inputCls } from "../../components/panel/ui";
import { Button } from "../../components/Button";

export default function TutorProfile() {
  const me = useMe();
  const qc = useQueryClient();
  const [f, setF] = useState<Record<string, any> | null>(null);
  useEffect(() => {
    if (me.data && !f) setF({ ...me.data.profile, phone: me.data.profile.phone || "" });
  }, [me.data, f]);
  const save = useMutation({
    mutationFn: () => tutorApi.updateMe({
      full_name: f!.full_name, gender: f!.gender, phone: f!.phone, institution: f!.institution, department: f!.department || "",
      subjects: f!.subjects || [], class_levels: f!.class_levels || [], areas: f!.areas || [], mode: f!.mode || "home",
      experience_note: f!.experience_note || "", availability_paused: !!f!.availability_paused,
    }),
    onSuccess: () => { toast.success("প্রোফাইল সেভ হয়েছে"); qc.invalidateQueries({ queryKey: ["me"] }); qc.invalidateQueries({ queryKey: ["suggested"] }); },
    onError: (e) => toast.error(e instanceof ApiError && e.detail === "invalid_phone" ? "সঠিক মোবাইল নম্বর দিন" : "সেভ করা যায়নি"),
  });
  if (!f) return <Loading />;
  const set = (k: string) => (v: any) => setF((p) => ({ ...p!, [k]: v }));
  return (
    <div data-testid="tutor-profile">
      <PanelTitle title="প্রোফাইল" sub="বিষয়, ক্লাস ও এলাকা দিয়ে আপনার পছন্দ সাজান। খোলা ডেমো প্যানেলে শুধু নমুনা যোগাযোগের তথ্য ব্যবহার করুন।" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <Field label="পূর্ণ নাম" htmlFor="tp-name"><input id="tp-name" className={inputCls} value={f.full_name || ""} onChange={(e) => set("full_name")(e.target.value)} data-testid="profile-name" /></Field>
          <Field label="মোবাইল" htmlFor="tp-phone"><input id="tp-phone" inputMode="tel" className={inputCls} value={f.phone} onChange={(e) => set("phone")(e.target.value)} data-testid="profile-phone" /></Field>
          <Field label="লিঙ্গ"><OptionChips group="tutor_genders_profile" value={f.gender || ""} onChange={set("gender")} testPrefix="profile-gender" /></Field>
          <Field label="প্রতিষ্ঠান" htmlFor="tp-inst"><input id="tp-inst" className={inputCls} value={f.institution || ""} onChange={(e) => set("institution")(e.target.value)} data-testid="profile-institution" /></Field>
          <Field label="বিভাগ" htmlFor="tp-dept"><input id="tp-dept" className={inputCls} value={f.department || ""} onChange={(e) => set("department")(e.target.value)} data-testid="profile-department" /></Field>
          <Field label="অভিজ্ঞতা (ছোট করে)" htmlFor="tp-exp"><textarea id="tp-exp" rows={3} maxLength={300} className={`${inputCls} py-3`} value={f.experience_note || ""} onChange={(e) => set("experience_note")(e.target.value)} data-testid="profile-experience" /></Field>
          <label className="flex items-center justify-between gap-3 min-h-[48px] rounded-xl bg-slate-50 px-4">
            <span className="font-semibold text-forest text-sm">বিরতি (এখন নতুন টিউশন নিচ্ছি না)</span>
            <input type="checkbox" className="h-6 w-6 accent-brand-600" checked={!!f.availability_paused} onChange={(e) => set("availability_paused")(e.target.checked)} data-testid="profile-paused" />
          </label>
        </Card>
        <Card className="space-y-5">
          <Field label="বিষয়"><OptionChips group="subjects" multi value={f.subjects || []} onChange={set("subjects")} testPrefix="profile-subject" /></Field>
          <Field label="ক্লাস / ব্যাচ" hint="একাধিক"><ClassPicker multi compact testPrefix="profile-class" value={f.class_levels || []} onChange={set("class_levels")} /></Field>
          <Field label="পছন্দের এলাকা"><OptionChips group="areas" multi value={f.areas || []} onChange={set("areas")} testPrefix="profile-area" limit={24} /></Field>
        </Card>
      </div>
      <div className="mt-6 border-t border-brand-100 pt-5 flex flex-wrap items-center justify-between gap-3" data-testid="profile-save-bar">
        <p className="text-xs text-slate-500">টিউশনের সাজেশন আপনার পছন্দ অনুযায়ী দেখানো হবে।</p>
        <Button className="w-full sm:w-auto rounded-xl" onClick={() => save.mutate()} disabled={save.isPending} data-testid="profile-save">{save.isPending ? "সেভ হচ্ছে…" : "প্রোফাইল সেভ করুন"}</Button>
      </div>
    </div>
  );
}
