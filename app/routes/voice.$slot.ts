import { env } from "cloudflare:workers";
import type { Route } from "./+types/voice.$slot";
import { voiceRow } from "~/lib/voice.server";

// The owner's voice clip for one page: public, like the page it explains. Only keys under voice/ are ever served from
// here. Phones (Safari above all) ask for audio in byte ranges, so a Range request gets a 206 with just that part.
export async function loader({ request, params }: Route.LoaderArgs) {
  const row = await voiceRow(params.slot ?? "");
  if (!row || !row.r2_key.startsWith("voice/")) throw new Response("No voice clip", { status: 404 });
  const wantsRange = request.headers.has("range");
  const object = await env.PHOTOS.get(row.r2_key, wantsRange ? { range: request.headers } : undefined);
  if (!object) throw new Response("No voice clip", { status: 404 });
  const size = object.size;
  const headers = new Headers({
    "Content-Type": row.mime,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
    // The page asks with ?v=<time of upload>, so a replaced clip is a new address and this one can be kept for good.
    "Cache-Control": new URL(request.url).searchParams.has("v") ? "public, max-age=31536000, immutable" : "public, max-age=300",
  });
  const r = object.range as { offset?: number; length?: number; suffix?: number } | undefined;
  if (wantsRange && r) {
    const length = r.suffix !== undefined ? Math.min(r.suffix, size) : r.length ?? size - (r.offset ?? 0);
    const start = r.suffix !== undefined ? size - length : r.offset ?? 0;
    headers.set("Content-Range", `bytes ${start}-${start + length - 1}/${size}`);
    headers.set("Content-Length", String(length));
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(size));
  return new Response(object.body, { headers });
}
