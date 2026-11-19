// A WhatsApp voice note, photo or file from a chat (R2, private, deleted after 90 days). Staff with the Inbox switch only.
import { env } from "cloudflare:workers";
import type { Route } from "./+types/admin.inbox.media.$id";
import { requireStaff } from "~/lib/auth.server";
import { mediaFor } from "~/lib/wa.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const viewer = await requireStaff(request, "inbox");
  const row = await mediaFor(Number(params.id), viewer?.role === "moderator" ? viewer.staffId ?? -1 : null);
  if (!row) throw new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(row.media_key);
  if (!obj) throw new Response("Not found", { status: 404 });
  // Anyone can send us a file: only plain audio, video, photos and PDF open in the page; the rest downloads, sandboxed.
  const type = obj.httpMetadata?.contentType ?? "";
  const inline = /^(audio\/[\w.+-]+|video\/[\w.+-]+|image\/(jpeg|png|webp|gif)|application\/pdf)(;.*)?$/i.test(type);
  return new Response(obj.body, {
    headers: {
      "Content-Type": inline ? type : "application/octet-stream",
      "Content-Disposition": inline ? "inline" : `attachment; filename="whatsapp-${params.id}"`,
      "Content-Security-Policy": "sandbox; default-src 'none'; media-src 'self'; img-src 'self'",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
