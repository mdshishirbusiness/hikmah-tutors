import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { tutorApi } from "../api/client";
import { useI18n } from "../i18n";
import { useTutorId } from "./tutorSession";

export function useMe() {
  const tid = useTutorId();
  return useQuery({ queryKey: ["me", tid], queryFn: tutorApi.me, enabled: !!tid, retry: false });
}

export function useSaved() {
  const tid = useTutorId();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useI18n();
  const mut = useMutation({
    mutationFn: tutorApi.toggleSaved,
    onSuccess: (r) => {
      toast.success(r.saved ? t("card.save_added") : t("card.save_removed"));
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["saved"] });
    },
  });
  const saved = new Set(me.data?.saved_codes ?? []);
  const toggle = (code: number) => {
    if (!tid) {
      toast(t("card.pick_tutor"));
      navigate("/tutor");
      return;
    }
    mut.mutate(code);
  };
  return { isSaved: (code: number) => saved.has(code), toggle };
}
