// POST /api/wa/webhook — YCloud's global webhook (owner, 2026-11-18). Checks the signature, stores the event, says OK at
// once, then answers in the background (YCloud wants a reply within ~6 s and retries anything that isn't 2xx).
import { waitUntil } from "cloudflare:workers";
import type { Route } from "./+types/api.wa.webhook";
import { respond } from "~/lib/wa-ai.server";
import { handleEvent, verifySignature, type YEvent } from "~/lib/wa.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const raw = await request.text();
  if (!(await verifySignature(raw, request.headers.get("YCloud-Signature")))) return new Response("Bad signature", { status: 401 });
  let ev: YEvent;
  try {
    ev = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const inbound = await handleEvent(ev);
  if (inbound) waitUntil(respond(inbound).catch((e) => console.error("WhatsApp reply failed", e)));
  return new Response("ok");
}

export const loader = () => new Response("Method not allowed", { status: 405 });
