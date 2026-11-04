// Tutor registration on the site (owner, 2026-11-04, review step 2). A Google account with no tutor record fills one
// form and gets a code from 5001 up (the sheet's codes run from 1001 and still grow with top-ups). The tutor then waits
// for the owner's check before applying. While waiting or asked to fix, they may change everything; once checked, the
// details lock as for every tutor and change through HTR.
import { env } from "cloudflare:workers";
import type { Viewer } from "./auth.server";
import { ACADEMIC_DOCS_MAX, DOC_LABELS, DOC_MAX_BYTES, PHOTO_MAX_BYTES, UNIVERSITIES, sessionYears } from "./join";
import { bdPhone } from "./lead";
import type { MyTutor } from "./me.server";
import { AREAS, BANDS, CLASS_CHOICES, SUBJECTS, TRANSPORTS } from "./options";

const now = () => Math.floor(Date.now() / 1000);
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const BAND_KEYS = new Set(BANDS.map((b) => b.key));
const SUBJECT_KEYS = new Set(SUBJECTS.map((s) => s.key));

export type JoinErrors = Partial<Record<"photo" | "documents" | "nid" | "name" | "phone" | "gender" | "university" | "institution" | "department" | "session" | "areas" | "classes" | "subjects" | "confirm" | "form", string>>;

export type TutorDocument = { id: number; kind: "academic" | "nid"; label: string | null; r2_key: string };

/** The documents a tutor has already sent, for the registration form and for the admin's check. */
export async function myDocuments(tutorId: number): Promise<TutorDocument[]> {
  const { results } = await env.DB.prepare(`SELECT id, kind, label, r2_key FROM tutor_documents WHERE tutor_id = ? ORDER BY id`).bind(tutorId).all<TutorDocument>();
  return results;
}

/** An image is kept only if its first bytes say JPEG, PNG or WebP, whatever the browser claims. */
async function imageOf(file: FormDataEntryValue | null, max = PHOTO_MAX_BYTES): Promise<{ bytes: ArrayBuffer; type: string; ext: string } | "too_big" | "bad" | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > max) return "too_big";
  const bytes = await file.arrayBuffer();
  const b = new Uint8Array(bytes.slice(0, 12));
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { bytes, type: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { bytes, type: "image/png", ext: "png" };
  if (String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { bytes, type: "image/webp", ext: "webp" };
  return "bad";
}

/** Registers a new tutor (me = null) or saves a waiting / asked-to-fix registration. Returns errors, or the code. */
export async function saveJoin(viewer: Viewer, me: MyTutor | null, form: FormData): Promise<{ errors: JoinErrors } | { code: number }> {
  const errors: JoinErrors = {};
  const name = text(form.get("full_name"), 60);
  const phone = bdPhone(form.get("phone"));
  const gender = String(form.get("gender") ?? "");
  const uniKey = String(form.get("university") ?? "");
  const uni = UNIVERSITIES.find((u) => u.key === uniKey);
  const institution = uni?.institution ?? text(form.get("institution"), 80);
  const department = text(form.get("department"), 60);
  const session = String(form.get("session_year") ?? "");
  const anywhere = form.get("anywhere") === "1";
  const areas = [...new Set(form.getAll("areas").map(String))].filter((k) => AREAS.some((a) => a.key === k));
  const classes = [...new Set(form.getAll("classes").map(String))].filter((k) => CLASS_CHOICES.some((c) => c.key === k));
  const subjects = [...new Set(form.getAll("subjects").map(String))].map((v) => v.split(":")).filter(([band, s]) => BAND_KEYS.has(band) && SUBJECT_KEYS.has(s));
  const minSalary = Number(form.get("min_salary")) || null;
  const transport = String(form.get("transport") ?? "");
  const photo = await imageOf(form.get("photo"));

  // Documents (owner, 2026-11-05): at least one academic proof is needed; the NID is an optional extra and never counts as it.
  const existingDocs = me ? await myDocuments(me.id) : [];
  const keepIds = new Set(form.getAll("keep_doc").map(Number));
  const keptAcademic = existingDocs.filter((d) => d.kind === "academic" && keepIds.has(d.id));
  const newAcademic: { file: { bytes: ArrayBuffer; type: string; ext: string }; label: string }[] = [];
  for (let i = 0; i < ACADEMIC_DOCS_MAX; i++) {
    const file = await imageOf(form.get(`doc_file_${i}`), DOC_MAX_BYTES);
    if (file === null) continue;
    if (file === "too_big") errors.documents = "A document is too large. Take a clearer, smaller photo of it.";
    else if (file === "bad") errors.documents = "Use JPG, PNG or WebP photos of your documents.";
    else {
      const label = String(form.get(`doc_label_${i}`) ?? "");
      newAcademic.push({ file, label: DOC_LABELS.some((l) => l.key === label) ? label : "other" });
    }
  }
  const nidFile = await imageOf(form.get("nid"), DOC_MAX_BYTES);
  const oldNid = existingDocs.find((d) => d.kind === "nid");
  if (nidFile === "too_big") errors.nid = "This photo is too large. Pick a smaller one.";
  else if (nidFile === "bad") errors.nid = "Use a JPG, PNG or WebP photo.";
  if (!errors.documents) {
    if (keptAcademic.length + newAcademic.length === 0) errors.documents = "Add at least one academic document, such as your student ID card.";
    else if (keptAcademic.length + newAcademic.length > ACADEMIC_DOCS_MAX) errors.documents = `Up to ${ACADEMIC_DOCS_MAX} academic documents.`;
  }

  if (photo === "too_big") errors.photo = "This photo is too large. Pick another one.";
  else if (photo === "bad") errors.photo = "Use a JPG, PNG or WebP photo.";
  else if (!photo && !me?.photo_key) errors.photo = "Add a clear photo of your face.";
  if (name.length < 3) errors.name = "Write your full name.";
  if (!phone) errors.phone = "Use an 11-digit mobile number starting 013–019.";
  if (gender !== "male" && gender !== "female") errors.gender = "Pick one.";
  if (!uni) errors.university = "Pick your university.";
  else if (!institution) errors.institution = uniKey === "medical" ? "Write your medical college." : "Write your college or university.";
  if (department.length < 2) errors.department = "Write your department.";
  if (!sessionYears().includes(session)) errors.session = "Pick your session.";
  if (!anywhere && !areas.length) errors.areas = "Pick at least one area, or Anywhere in Rajshahi.";
  if (!classes.length) errors.classes = "Pick the classes you want to teach.";
  if (!subjects.length) errors.subjects = "Pick at least one subject.";
  if (minSalary !== null && (!Number.isInteger(minSalary) || minSalary < 0 || minSalary > 100000)) errors.form = "Lowest salary not valid.";
  if (transport && !TRANSPORTS.some((t) => t.key === transport)) errors.form = "Pick a transport option.";
  if (form.get("available") !== "1" || form.get("terms") !== "1") errors.confirm = "Tick both to continue.";

  // One number, one tutor: an old registration under another Google account is linked by HTR, never doubled.
  if (phone && !errors.phone) {
    const taken = await env.DB.prepare(`SELECT 1 FROM tutors WHERE (phone = ?1 OR alt_phone = ?1) AND deleted_at IS NULL AND id <> ?2 LIMIT 1`)
      .bind(phone, me?.id ?? 0).first();
    if (taken) errors.phone = "This number is already registered with HTR, maybe under another Google account. Message HTR to link it.";
  }
  if (Object.keys(errors).length) return { errors };

  const t = now();
  let id = me?.id, code = me?.code;
  if (!me) {
    try {
      const row = await env.DB.prepare(
        `INSERT INTO tutors (code, user_id, claim_status, created_via, email, full_name, gender, phone, institution, department, session_year, university,
                             transport, min_salary, anywhere, availability_confirmed_at, terms_accepted_at, setup_done_at, registered_at, review_status, created_at, updated_at)
         SELECT COALESCE(MAX(code), 5000) + 1, ?, 'claimed', 'signup', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?
         FROM tutors WHERE code BETWEEN 5001 AND 89999
         RETURNING id, code`,
      ).bind(viewer.id, viewer.email.toLowerCase(), name, gender, phone, institution, department, session, uniKey, transport || null, minSalary, anywhere ? 1 : 0, t, t, t, t, t, t)
        .first<{ id: number; code: number }>();
      if (!row) return { errors: { form: "Couldn't save. Try again." } };
      ({ id, code } = row);
    } catch {
      // The email or user already has a tutor record (a second tab, or an old registration).
      return { errors: { form: "This Google account already has a tutor profile. Open My home, or message HTR." } };
    }
  }
  const tutorId = id!, tutorCode = code!;

  const steps: D1PreparedStatement[] = [];
  if (me) {
    steps.push(env.DB.prepare(
      `UPDATE tutors SET full_name = ?, gender = ?, phone = ?, institution = ?, department = ?, session_year = ?, university = ?, transport = ?, min_salary = ?,
              anywhere = ?, review_status = 'waiting', updated_at = ? WHERE id = ? AND review_status <> 'approved'`,
    ).bind(name, gender, phone, institution, department, session, uniKey, transport || null, minSalary, anywhere ? 1 : 0, t, tutorId));
  }
  if (photo && typeof photo === "object") {
    const key = `tutors/T${tutorCode}.${photo.ext}`;
    await env.PHOTOS.put(key, photo.bytes, { httpMetadata: { contentType: photo.type } });
    if (me?.photo_key && me.photo_key !== key) await env.PHOTOS.delete(me.photo_key);
    steps.push(env.DB.prepare(`UPDATE tutors SET photo_key = ? WHERE id = ?`).bind(key, tutorId));
  }
  // Documents: new files go to R2 first, the rows change in the same batch, and removed files are deleted from R2 after it.
  const nidChanged = typeof nidFile === "object" && nidFile !== null || form.get("remove_nid") === "1";
  const dropped = existingDocs.filter((d) => (d.kind === "academic" ? !keepIds.has(d.id) : nidChanged));
  for (const d of dropped) steps.push(env.DB.prepare(`DELETE FROM tutor_documents WHERE id = ? AND tutor_id = ?`).bind(d.id, tutorId));
  const added = [...newAcademic.map((d) => ({ kind: "academic", label: d.label, file: d.file })), ...(nidFile && typeof nidFile === "object" ? [{ kind: "nid", label: null, file: nidFile }] : [])];
  for (const d of added) {
    const key = `docs/T${tutorCode}-${crypto.randomUUID().slice(0, 8)}.${d.file.ext}`;
    await env.PHOTOS.put(key, d.file.bytes, { httpMetadata: { contentType: d.file.type } });
    steps.push(env.DB.prepare(`INSERT INTO tutor_documents (tutor_id, kind, label, r2_key, created_at) VALUES (?, ?, ?, ?, ?)`).bind(tutorId, d.kind, d.label, key, t));
  }
  steps.push(
    env.DB.prepare(`DELETE FROM tutor_areas WHERE tutor_id = ?`).bind(tutorId),
    ...(anywhere ? [] : areas).map((a) => env.DB.prepare(`INSERT INTO tutor_areas (tutor_id, area) VALUES (?, ?)`).bind(tutorId, a)),
    env.DB.prepare(`DELETE FROM tutor_classes WHERE tutor_id = ?`).bind(tutorId),
    ...classes.map((c) => env.DB.prepare(`INSERT INTO tutor_classes (tutor_id, class_level) VALUES (?, ?)`).bind(tutorId, c)),
    env.DB.prepare(`DELETE FROM tutor_subjects WHERE tutor_id = ?`).bind(tutorId),
    ...subjects.map(([band, s]) => env.DB.prepare(`INSERT INTO tutor_subjects (tutor_id, band, subject) VALUES (?, ?, ?)`).bind(tutorId, band, s)),
    env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, 'tutor_join', ?, ?, ?)`)
      .bind(viewer.id, me ? "tutor_join_edited" : "tutor_joined", String(tutorCode), JSON.stringify({ areas: areas.length, anywhere, classes: classes.length, subjects: subjects.length, photo: !!photo, academic: keptAcademic.length + newAcademic.length, nid: typeof nidFile === "object" && nidFile !== null || (!!oldNid && !nidChanged) }), t),
  );
  await env.DB.batch(steps);
  await Promise.all(dropped.map((d) => env.PHOTOS.delete(d.r2_key)));
  return { code: tutorCode };
}
