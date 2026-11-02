import { useState } from "react";
import { TicketCard } from "~/design-lab/Cards";
import { Flow } from "~/design-lab/Flow";
import { Icon } from "~/design-lab/parts";

export function meta() {
  return [{ title: "ডিজাইন ল্যাব · Hikmah Tutors" }, { name: "robots", content: "noindex" }];
}

// Design lab: the chosen ticket card with its detail, apply and done screens, on synthetic data. Dev-only; delete it
// once the design is confirmed and built into the real board.
export function loader() {
  if (!import.meta.env.DEV) throw new Response("Not found", { status: 404 });
  return null;
}

export default function DesignLab() {
  const [run, setRun] = useState(0);
  return (
    <div className="min-h-dvh bg-slate-200">
      <nav aria-label="ডিজাইন ল্যাব" className="sticky top-0 z-50 h-12 bg-slate-900">
        <div className="mx-auto flex h-full max-w-[440px] items-center justify-between pr-1 pl-4">
          <span className="text-sm font-semibold text-white">টিকিট ডিজাইন · নমুনা তথ্য</span>
          <button type="button" aria-label="শুরু থেকে দেখুন" onClick={() => { setRun(run + 1); window.scrollTo({ top: 0 }); }} className="grid size-11 place-items-center rounded-lg text-slate-300 hover:text-white">
            <Icon name="restart" />
          </button>
        </div>
      </nav>
      <main key={run} className="mx-auto max-w-[440px] overflow-x-clip shadow-xl">
        <Flow Card={TicketCard} />
      </main>
    </div>
  );
}
