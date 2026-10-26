import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, X } from "lucide-react";
import { ApiError, tutorApi } from "../api/client";
import type { Tuition } from "../types";
import { useMe } from "../lib/useSaved";
import { FeeBox } from "./FeeBox";
import { Button, linkButton } from "./Button";

const ERR: Record<string, string> = {
  profile_incomplete: "প্রোফাইল অসম্পূর্ণ। আগে প্রোফাইলের চেকলিস্ট পূরণ করুন।",
  already_applied: "এই টিউশনে আপনার একটি আবেদন চলমান আছে।",
  daily_limit: "আজকের আবেদনের সীমা শেষ। কাল আবার চেষ্টা করুন।",
  not_accepting: "এই টিউশনে এখন আবেদন নেওয়া হচ্ছে না।",
  gender_mismatch: "এই টিউশনে অন্য লিঙ্গের টিউটর চাওয়া হয়েছে।",
  availability_paused: "আপনার প্রোফাইল 'বিরতি'-তে আছে। প্রোফাইল থেকে চালু করুন।",
  confirm_required: "দুটি টিক চিহ্ন দিন।",
};

export function ApplyDialog({ tu, onClose }: { tu: Tuition; onClose: () => void }) {
  const me = useMe();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [avail, setAvail] = useState(false);
  const [terms, setTerms] = useState(false);
  const mut = useMutation({
    mutationFn: () => tutorApi.apply({ code: tu.code, note, availability_confirmed: avail, terms_accepted: terms }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-applications"] }),
  });
  const errMsg = mut.error instanceof ApiError ? ERR[mut.error.detail] || "আবেদন পাঠানো যায়নি।" : mut.error ? "আবেদন পাঠানো যায়নি।" : "";

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="আবেদন" data-testid="apply-dialog">
      <button type="button" className="absolute inset-0 bg-forest/60 animate-fade" aria-label="বন্ধ করুন" onClick={onClose} data-testid="apply-dialog-backdrop" />
      <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[560px] max-h-[92vh] overflow-y-auto bg-cream rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 animate-sheet sm:animate-fade">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-forest">{tu.code_label} — আবেদন</p>
          <button type="button" onClick={onClose} aria-label="বন্ধ করুন" className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-brand-50" data-testid="apply-dialog-close"><X size={22} aria-hidden /></button>
        </div>
        {!me.data ? (
          <div className="mt-4 space-y-4" data-testid="apply-need-tutor">
            <p className="text-slate-700">আবেদন করতে আগে টিউটর প্যানেলে একজন টিউটর বেছে নিন (এখন লগইন ছাড়া ডেমো মোড)।</p>
            <Link to="/tutor" className={linkButton("primary", "w-full")} data-testid="apply-go-tutor-panel">টিউটর প্যানেল খুলুন</Link>
          </div>
        ) : mut.isSuccess ? (
          <div className="mt-4 text-center space-y-3" role="status" data-testid="apply-success">
            <CheckCircle2 className="mx-auto text-brand-600" size={52} aria-hidden />
            <p className="text-2xl font-bold text-forest">আবেদন জমা হয়েছে!</p>
            <p className="text-slate-700">এরপর কী হবে: HTR আপনার আবেদন দেখবে। প্রতিটি পরিবর্তন "আমার আবেদন"-এ দেখতে পাবেন।</p>
            <Link to="/tutor/applications" className={linkButton("primary", "w-full")} data-testid="apply-view-applications">আমার আবেদন দেখুন</Link>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-slate-600">আবেদনকারী: <b className="text-forest" data-testid="apply-tutor-name">{me.data.profile.full_name}</b></p>
            <div>
              <label htmlFor="apply-note" className="block font-semibold text-forest mb-1">ছোট নোট (ঐচ্ছিক)</label>
              <textarea id="apply-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={3} data-testid="apply-note"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-brand-600" placeholder="যেমন: সন্ধ্যায় পড়াতে পারব, ২ বছরের অভিজ্ঞতা" />
              <p className="text-xs text-slate-500 text-right">{note.length}/300</p>
            </div>
            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={avail} onChange={(e) => setAvail(e.target.checked)} className="mt-1 h-5 w-5 accent-brand-600" data-testid="apply-availability" />
              <span className="font-semibold text-forest">আমি এই সময়ে পড়াতে পারব</span>
            </label>
            <FeeBox fees={tu.fees} />
            <label className="flex items-start gap-3 min-h-[44px] cursor-pointer">
              <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-1 h-5 w-5 accent-brand-600" data-testid="apply-terms" />
              <span className="text-sm text-slate-700">উপরের ফি-শর্ত পড়েছি এবং মেনে নিচ্ছি।</span>
            </label>
            {errMsg && <p className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm" role="alert" data-testid="apply-error">{errMsg}</p>}
            <Button className="w-full" disabled={!avail || !terms || mut.isPending} onClick={() => mut.mutate()} data-testid="apply-submit">
              {mut.isPending ? "পাঠানো হচ্ছে…" : "আবেদন জমা দিন"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
