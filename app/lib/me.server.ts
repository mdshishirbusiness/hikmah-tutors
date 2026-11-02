// A signed-in tutor's own record. Every query is keyed on their user id, so nobody can ask for someone else's.
// Named columns only: staff notes and the sheet's review labels never reach the tutor.
import { env } from "cloudflare:workers";

export type MyTutor = {
  id: number; code: number; full_name: string; gender: string | null; email: string | null; phone: string; alt_phone: string | null; institution: string | null; department: string | null;
  session_year: string | null; ssc_school: string | null; ssc_year: number | null; ssc_result: string | null; ssc_group: string | null; hsc_college: string | null; hsc_year: number | null;
  hsc_result: string | null; hsc_group: string | null; mediums: string | null; current_location: string | null; home_division: string | null; home_district: string | null;
  demo_willing: number | null; transport: string | null; availability_confirmed_at: number | null; photo_key: string | null;
};

const COLUMNS = `id, code, full_name, gender, email, phone, alt_phone, institution, department, session_year, ssc_school, ssc_year, ssc_result, ssc_group,
  hsc_college, hsc_year, hsc_result, hsc_group, mediums, current_location, home_division, home_district, demo_willing, transport, availability_confirmed_at, photo_key`;

export async function myProfile(userId: number) {
  const tutor = await env.DB.prepare(`SELECT ${COLUMNS} FROM tutors WHERE user_id = ? AND deleted_at IS NULL`).bind(userId).first<MyTutor>();
  if (!tutor) return null;
  const [subjects, statements, applications] = await Promise.all([
    env.DB.prepare(`SELECT band, subject FROM tutor_subjects WHERE tutor_id = ?`).bind(tutor.id).all<{ band: string; subject: string }>(),
    env.DB.prepare(`SELECT kind, body FROM tutor_statements WHERE tutor_id = ?`).bind(tutor.id).all<{ kind: string; body: string }>(),
    env.DB.prepare(
      `SELECT a.id, a.tuition_code, a.status, a.created_at, t.class_level, t.area FROM applications a JOIN tuitions t ON t.code = a.tuition_code
       WHERE a.tutor_id = ? ORDER BY a.created_at DESC LIMIT 100`,
    ).bind(tutor.id).all<{ id: number; tuition_code: number; status: string; created_at: number; class_level: string; area: string }>(),
  ]);
  return { tutor, subjects: subjects.results, statements: statements.results, applications: applications.results };
}

export async function confirmAvailability(userId: number) {
  const t = Math.floor(Date.now() / 1000);
  await env.DB.prepare(`UPDATE tutors SET availability_confirmed_at = ?, updated_at = ? WHERE user_id = ? AND deleted_at IS NULL`).bind(t, t, userId).run();
}
