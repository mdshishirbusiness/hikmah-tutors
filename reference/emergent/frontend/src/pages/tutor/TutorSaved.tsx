import { useQuery } from "@tanstack/react-query";
import { tutorApi } from "../../api/client";
import { useTutorId } from "../../lib/tutorSession";
import { TuitionCard } from "../../components/TuitionCard";
import { Empty, Loading, PanelTitle } from "../../components/panel/ui";
import { useShare } from "./useShare";

export default function TutorSaved() {
  const tid = useTutorId();
  const q = useQuery({ queryKey: ["saved", tid], queryFn: tutorApi.saved });
  const onShare = useShare();
  return (
    <div data-testid="tutor-saved">
      <PanelTitle title="সেভ করা টিউশন" sub="বন্ধ হয়ে যাওয়া টিউশন ধূসর দেখাবে।" />
      {q.isPending ? <Loading /> : (q.data?.items.length ?? 0) === 0 ? <Empty text="এখনো কিছু সেভ করেননি। বোর্ডে ♡ চাপুন।" testId="tutor-saved-empty" /> : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {q.data!.items.map((t, i) => (
            <div key={t.code} className={t.is_available ? "" : "opacity-60 grayscale relative"}>
              {!t.is_available && <span className="absolute z-10 top-12 right-3 rounded-full bg-slate-800 text-white text-xs font-bold px-2.5 py-1" data-testid={`saved-closed-${t.code}`}>আর খালি নেই</span>}
              <TuitionCard t={t} index={i} onShare={onShare} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
