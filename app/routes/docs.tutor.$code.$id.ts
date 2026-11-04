import { env } from "cloudflare:workers";
import type { Route } from "./+types/docs.tutor.$code.$id";
import { getViewer, requireAdmin } from "~/lib/auth.server";

// One document a tutor sent at registration (student ID card, result sheet, NID...). Only the admin and the tutor
// themself may see it (owner, 2026-11-05); guardians and the public never do. Each admin view is written to audit_log.
export async function loader({ request, params }: Route.LoaderArgs) {
  const code = Number(params.code), id = Number(params.id);
  const viewer = await getViewer(request);
  const doc = Number.isInteger(code) && Number.isInteger(id)
    ? await env.DB.prepare(`SELECT d.r2_key, d.kind, t.user_id FROM tutor_documents d JOIN tutors t ON t.id = d.tutor_id WHERE d.id = ? AND t.code = ? AND t.deleted_at IS NULL`)
      .bind(id, code).first<{ r2_key: string; kind: string; user_id: number | null }>()
    : null;
  const own = viewer?.role === "tutor" && doc?.user_id === viewer.id;
  const admin = own ? null : await requireAdmin(request); // null for the owner too under DEV_ADMIN, so log on !own
  const object = doc ? await env.PHOTOS.get(doc.r2_key) : null;
  if (!doc || !object) throw new Response("No document", { status: 404 });
  if (!own) {
    await env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, 'doc_viewed', 'tutor', ?, ?, ?)`)
      .bind(admin?.id ?? null, String(code), JSON.stringify({ doc: id, kind: doc.kind }), Math.floor(Date.now() / 1000)).run();
  }
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
