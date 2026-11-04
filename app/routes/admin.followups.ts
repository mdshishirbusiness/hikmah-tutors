// Follow-ups and notes, posted from anywhere in admin by a fetcher (owner, 2026-11-05, part D).
import type { Route } from "./+types/admin.followups";
import { requireAdmin } from "~/lib/auth.server";
import { addNote, createFollowup, finishFollowup, moveFollowup } from "~/lib/followups.server";

export async function action({ request }: Route.ActionArgs) {
  const viewer = await requireAdmin(request);
  const f = await request.formData();
  const actor = viewer?.id ?? null;
  const id = Number(f.get("id")) || 0;
  switch (f.get("intent")) {
    case "create":
      return { error: await createFollowup(String(f.get("kind")), Number(f.get("ref_id")), Number(f.get("due_at")), String(f.get("note") ?? ""), actor), done: "set" };
    case "done":
      await finishFollowup(id, String(f.get("outcome") ?? ""), actor);
      return { error: null, done: "done" };
    case "later":
      await moveFollowup(id, Number(f.get("due_at")), actor);
      return { error: null, done: "later" };
    case "note":
      return { error: await addNote(String(f.get("kind")), Number(f.get("ref_id")), String(f.get("body") ?? ""), actor), done: "note" };
    default:
      return { error: "Unknown action.", done: null };
  }
}
