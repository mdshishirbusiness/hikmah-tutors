import { env } from "cloudflare:workers";
import type { LeadInput } from "./lead";

/** How many website requests this phone number sent in the last day (the public form allows a few). */
export async function recentWebsiteLeads(phone: string): Promise<number> {
  const since = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM leads WHERE phone = ? AND lead_source = 'website' AND synced_at > ?`)
    .bind(phone, since)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Stores a lead. Saving the same client_id twice (a retry after a weak connection) is a no-op, not a duplicate. */
export async function insertLead(lead: LeadInput): Promise<{ duplicate: boolean }> {
  const r = await env.DB.prepare(
    `INSERT INTO leads (client_id, phone, guardian_name, class_level, medium, student_gender, tutor_gender, subjects,
                        area, address, salary, days_per_week, notes, lead_source, created_at, synced_at,
                        class_other, subject_other, time_of_day, time_from, time_to, session_minutes, tutor_from, requirement_keys)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (client_id) DO NOTHING`,
  )
    .bind(
      lead.client_id,
      lead.phone,
      lead.guardian_name || null,
      lead.class_level,
      lead.medium || null,
      lead.student_gender || null,
      lead.tutor_gender || null,
      lead.subjects.join(",") || null,
      lead.area,
      lead.address || null,
      lead.salary,
      lead.days_per_week,
      lead.notes || null,
      lead.lead_source || null,
      lead.created_at,
      Math.floor(Date.now() / 1000),
      lead.class_other || null,
      lead.subject_other || null,
      lead.time_of_day || null,
      lead.time_from ?? null,
      lead.time_to ?? null,
      lead.session_minutes ?? null,
      lead.tutor_from?.join(",") || null,
      lead.requirement_keys?.join(",") || null,
    )
    .run();
  return { duplicate: r.meta.changes === 0 };
}
