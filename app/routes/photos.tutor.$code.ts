import { env } from "cloudflare:workers";
import type { Route } from "./+types/photos.tutor.$code";
import { getViewer, requireAdmin } from "~/lib/auth.server";

// A tutor's photo from the private bucket. Only the admin and the tutor themself may see it (owner, 2026-11-03);
// guardians and the public never do.
export async function loader({ request, params }: Route.LoaderArgs) {
  const code = Number(params.code);
  const viewer = await getViewer(request);
  const tutor = Number.isInteger(code)
    ? await env.DB.prepare(`SELECT photo_key, user_id FROM tutors WHERE code = ? AND deleted_at IS NULL`).bind(code).first<{ photo_key: string | null; user_id: number | null }>()
    : null;
  const ownPhoto = viewer?.role === "tutor" && tutor?.user_id === viewer.id;
  if (!ownPhoto) await requireAdmin(request);
  const object = tutor?.photo_key ? await env.PHOTOS.get(tutor.photo_key) : null;
  if (!object) throw new Response("ছবি নেই", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/webp",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
