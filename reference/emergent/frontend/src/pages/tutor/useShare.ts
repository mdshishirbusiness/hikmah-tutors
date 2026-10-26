import { useCallback } from "react";
import { toast } from "sonner";
import { shareUrl } from "../../api/client";
import type { Tuition } from "../../types";
import { shareLink } from "../../components/Toast";

export function useShare() {
  return useCallback(async (tu: Tuition) => {
    const url = shareUrl(tu.code_label);
    const r = await shareLink(url, `${tu.code_label} · Hikmah Tutors Rajshahi`);
    if (r === "copied") toast.success("শেয়ার লিংক কপি হয়েছে");
    if (r === "failed") toast.error(`কপি করা যায়নি — ${url}`);
  }, []);
}
