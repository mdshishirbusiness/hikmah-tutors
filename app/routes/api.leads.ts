// POST /api/leads — saves one Quick Pad lead (JSON). Called directly and when the phone sends its waiting leads.
import type { Route } from "./+types/api.leads";
import { requireAdmin } from "~/lib/auth.server";
import { parseLead } from "~/lib/lead";
import { insertLead } from "~/lib/leads.server";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405 });
  await requireAdmin(request);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }

  const { lead, errors } = parseLead(body);
  if (!lead) return Response.json({ error: "Invalid data", errors }, { status: 400 });

  const { duplicate } = await insertLead(lead);
  return Response.json({ ok: true, duplicate });
}
