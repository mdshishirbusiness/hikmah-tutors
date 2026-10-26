import { env } from "cloudflare:workers";
import type { LeadInput } from "./lead";

export type LeadRow = {
  id: number;
  phone: string;
  guardian_name: string | null;
  class_level: string;
  medium: string | null;
  student_gender: string | null;
  tutor_gender: string | null;
  subjects: string | null;
  area: string;
  address: string | null;
  salary: number | null;
  days_per_week: number | null;
  notes: string | null;
  lead_source: string | null;
  status: string;
  created_at: number;
};

/** Stores a lead. Saving the same client_id twice (a retry after a weak connection) is a no-op, not a duplicate. */
export async function insertLead(lead: LeadInput): Promise<{ duplicate: boolean }> {
  const r = await env.DB.prepare(
    `INSERT INTO leads (client_id, phone, guardian_name, class_level, medium, student_gender, tutor_gender, subjects,
                        area, address, salary, days_per_week, notes, lead_source, created_at, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    )
    .run();
  return { duplicate: r.meta.changes === 0 };
}

export async function recentLeads(limit = 100): Promise<LeadRow[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, phone, guardian_name, class_level, medium, student_gender, tutor_gender, subjects, area, address,
            salary, days_per_week, notes, lead_source, status, created_at
     FROM leads ORDER BY created_at DESC LIMIT ?`,
  )
    .bind(limit)
    .all<LeadRow>();
  return results;
}
