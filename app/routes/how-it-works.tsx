import { Link } from "react-router";
import type { Route } from "./+types/how-it-works";
import { GuardianPanel, PageShell, buttonClass } from "~/components/site";
import { bnDigits } from "~/lib/tuition";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "কীভাবে কাজ করে · Hikmah Tutors" },
    { name: "description", content: "Hikmah Tutors-এ টিউটরদের জন্য চারটি ছোট ধাপ: লগইন, প্রোফাইল, আবেদন, শর্টলিস্ট ও ট্রায়াল।" },
  ];
}

const STEPS = [
  ["Google দিয়ে লগইন", "আগে Hikmah Tutors-এর ফর্ম পূরণ করে থাকলে সেই Google অ্যাকাউন্ট দিয়ে লগইন করুন। আপনার প্রোফাইল নিজে থেকেই খুলে যাবে।"],
  ["প্রোফাইল দেখে নিন", "বিষয়, ক্লাস ও পড়াশোনার তথ্য ঠিক আছে কি না দেখুন, আর এখনো পড়াতে আগ্রহী হলে নিশ্চিত করুন। প্রোফাইল পাবলিক নয়।"],
  ["আবেদন", "বোর্ড থেকে পছন্দের টিউশন বেছে নিন। সাইটে আবেদন শিগগিরই চালু হবে। ফি-শর্ত আবেদনের আগেই দেখানো হয়।"],
  ["শর্টলিস্ট ও ট্রায়াল", "HTR অভিভাবকের সাথে কথা বলে শর্টলিস্ট করে, ট্রায়াল ক্লাস ঠিক করে। প্রতিটি ধাপ আপনি প্রোফাইলে দেখতে পাবেন।"],
];

export default function HowItWorks() {
  return (
    <PageShell title="কীভাবে কাজ করে" sub="টিউটরদের জন্য চারটি ছোট ধাপ।">
      <ol className="space-y-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex animate-rise gap-4 rounded-2xl border border-brand-100 bg-white p-5" style={{ animationDelay: `${(i + 1) * 50}ms` }}>
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-mango text-xl font-bold text-forest">{bnDigits(i + 1)}</span>
            <div>
              <h2 className="text-lg font-bold text-forest">{title}</h2>
              <p className="mt-1 text-slate-700">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        <Link to="/" className={buttonClass("primary")}>টিউশন বোর্ড</Link>
        <Link to="/fees" className={buttonClass("secondary")}>ফি</Link>
      </div>
      <GuardianPanel />
    </PageShell>
  );
}
