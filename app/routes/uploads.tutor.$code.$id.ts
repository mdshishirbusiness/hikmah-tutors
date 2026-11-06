import { env } from "cloudflare:workers";
import type { Route } from "./+types/uploads.tutor.$code.$id";
import { getViewer, requireAdmin } from "~/lib/auth.server";
import { uploadFile } from "~/lib/uploads.server";

// A photo or document a tutor sent for checking (owner, 2026-11-06). Only the admin and the tutor themself may see it;
// each admin view of a document is written to audit_log, as for registration documents.
export async function loader({ request, params }: Route.LoaderArgs) {
  const code = Number(params.code), id = Number(params.id);
  const viewer = await getViewer(request);
  const up = Number.isInteger(code) && Number.isInteger(id) ? await uploadFile(code, id) : null;
  const own = viewer?.role === "tutor" && up?.user_id === viewer.id;
  const admin = own ? null : await requireAdmin(request);
  const object = up?.status === "pending" ? await env.PHOTOS.get(up.r2_key) : null;
  if (!up || !object) throw new Response("Not found", { status: 404 });
  if (!own && up.kind !== "photo") {
    await env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, 'upload_viewed', 'tutor_upload', ?, ?, ?)`)
      .bind(admin?.id ?? null, String(code), JSON.stringify({ upload: id, kind: up.kind }), Math.floor(Date.now() / 1000)).run();
  }
  return new Response(object.body, {
    headers: { "Content-Type": object.httpMetadata?.contentType ?? "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
