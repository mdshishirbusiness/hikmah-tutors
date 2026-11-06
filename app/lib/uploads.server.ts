// A checked tutor's new photo or document waits for the admin (owner, 2026-11-06; migration 0025). Approved, it becomes
// the tutor's photo or one of their documents; declined, the file is deleted and the reason shown to the tutor.
// The tutor's current photo and documents stay as they are until the admin approves.
import { env } from "cloudflare:workers";
import type { Viewer } from "./auth.server";
import { ACADEMIC_DOCS_MAX, DOC_LABELS, DOC_MAX_BYTES, PHOTO_MAX_BYTES } from "./join";
import { imageOf } from "./join.server";
import type { MyTutor } from "./me.server";

const now = () => Math.floor(Date.now() / 1000);
const DECLINED_SHOWN_DAYS = 14;

export type UploadKind = "photo" | "academic" | "nid";
export type Upload = { id: number; kind: UploadKind; label: string | null; status: "pending" | "approved" | "declined" | "withdrawn"; note: string | null; created_at: number; decided_at: number | null };

function audit(actorId: number | null, action: string, code: number, meta: unknown) {
  // entity 'tutor_upload', not 'tutor': the tutor's Home lists the admin's 'tutor' entries as profile changes.
  return env.DB.prepare(`INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, meta_json, created_at) VALUES (?, ?, 'tutor_upload', ?, ?, ?)`)
    .bind(actorId, action, String(code), JSON.stringify(meta), now());
}

/** What the tutor sees: uploads waiting for HTR, and ones declined in the last two weeks with the reason. */
export async function myUploads(tutorId: number): Promise<Upload[]> {
  const { results } = await env.DB.prepare(
    `SELECT id, kind, label, status, note, created_at, decided_at FROM tutor_uploads
     WHERE tutor_id = ? AND (status = 'pending' OR (status = 'declined' AND decided_at > ?)) ORDER BY created_at DESC LIMIT 20`,
  ).bind(tutorId, now() - DECLINED_SHOWN_DAYS * 86400).all<Upload>();
  return results;
}

export async function myDocumentList(tutorId: number) {
  const { results } = await env.DB.prepare(`SELECT id, kind, label, created_at FROM tutor_documents WHERE tutor_id = ? ORDER BY kind, id`)
    .bind(tutorId).all<{ id: number; kind: "academic" | "nid"; label: string | null; created_at: number }>();
  return results;
}

/** Sends one new photo or document for checking. A new photo or NID replaces one still waiting. */
export async function sendUpload(viewer: Viewer, me: MyTutor, form: FormData): Promise<string | null> {
  if (me.review_status !== "approved") return "While your registration is being checked, change it on the registration form.";
  const kind = String(form.get("kind") ?? "") as UploadKind;
  if (!["photo", "academic", "nid"].includes(kind)) return "Pick what you are sending.";
  const file = await imageOf(form.get("file"), kind === "photo" ? PHOTO_MAX_BYTES : DOC_MAX_BYTES);
  if (file === null) return "Pick a photo first.";
  if (file === "too_big") return "This photo is too large. Pick a smaller one.";
  if (file === "bad") return "Use a JPG, PNG or WebP photo.";
  const rawLabel = String(form.get("label") ?? "");
  const label = kind === "academic" ? (DOC_LABELS.some((l) => l.key === rawLabel) ? rawLabel : "other") : null;

  if (kind === "academic") {
    const row = await env.DB.prepare(
      `SELECT (SELECT count(*) FROM tutor_documents WHERE tutor_id = ?1 AND kind = 'academic') + (SELECT count(*) FROM tutor_uploads WHERE tutor_id = ?1 AND kind = 'academic' AND status = 'pending') n`,
    ).bind(me.id).first<{ n: number }>();
    if ((row?.n ?? 0) >= ACADEMIC_DOCS_MAX) return `Up to ${ACADEMIC_DOCS_MAX} documents. Ask HTR to remove an old one first.`;
  }
  const old = kind === "academic" ? null
    : await env.DB.prepare(`SELECT id, r2_key FROM tutor_uploads WHERE tutor_id = ? AND kind = ? AND status = 'pending'`).bind(me.id, kind).first<{ id: number; r2_key: string }>();

  const t = now();
  const key = `${kind === "photo" ? "tutors" : "docs"}/T${me.code}-new-${crypto.randomUUID().slice(0, 8)}.${file.ext}`;
  await env.PHOTOS.put(key, file.bytes, { httpMetadata: { contentType: file.type } });
  await env.DB.batch([
    ...(old ? [env.DB.prepare(`UPDATE tutor_uploads SET status = 'withdrawn', decided_at = ? WHERE id = ?`).bind(t, old.id)] : []),
    env.DB.prepare(`INSERT INTO tutor_uploads (tutor_id, kind, label, r2_key, created_at) VALUES (?, ?, ?, ?, ?)`).bind(me.id, kind, label, key, t),
    audit(viewer.id, "upload_sent", me.code, { kind }),
  ]);
  if (old) await env.PHOTOS.delete(old.r2_key);
  return null;
}

export async function withdrawUpload(viewer: Viewer, me: MyTutor, id: number) {
  const up = await env.DB.prepare(`SELECT r2_key FROM tutor_uploads WHERE id = ? AND tutor_id = ? AND status = 'pending'`).bind(id, me.id).first<{ r2_key: string }>();
  if (!up) return;
  await env.DB.batch([
    env.DB.prepare(`UPDATE tutor_uploads SET status = 'withdrawn', decided_at = ? WHERE id = ?`).bind(now(), id),
    audit(viewer.id, "upload_withdrawn", me.code, { id }),
  ]);
  await env.PHOTOS.delete(up.r2_key);
}

// ---------- Admin ----------

export async function pendingUploads(tutorId: number) {
  const { results } = await env.DB.prepare(`SELECT id, kind, label, status, note, created_at, decided_at FROM tutor_uploads WHERE tutor_id = ? AND status = 'pending' ORDER BY created_at`)
    .bind(tutorId).all<Upload>();
  return results;
}

/** Approve: the photo or document takes its place (an approved NID replaces the old one). Decline: the file is deleted. */
export async function decideUpload(actorId: number | null, tutorId: number, id: number, approve: boolean, rawNote: string): Promise<string | null> {
  const up = await env.DB.prepare(
    `SELECT u.kind, u.label, u.r2_key, t.code, t.photo_key FROM tutor_uploads u JOIN tutors t ON t.id = u.tutor_id WHERE u.id = ? AND u.tutor_id = ? AND u.status = 'pending'`,
  ).bind(id, tutorId).first<{ kind: UploadKind; label: string | null; r2_key: string; code: number; photo_key: string | null }>();
  if (!up) return "Already decided.";
  const note = rawNote.replace(/\s+/g, " ").trim().slice(0, 300) || null;
  const t = now();
  const decided = env.DB.prepare(`UPDATE tutor_uploads SET status = ?, note = ?, decided_at = ?, decided_by = ? WHERE id = ?`)
    .bind(approve ? "approved" : "declined", note, t, actorId, id);

  if (!approve) {
    await env.DB.batch([decided, audit(actorId, "upload_declined", up.code, { kind: up.kind })]);
    await env.PHOTOS.delete(up.r2_key);
    return null;
  }
  const oldNids = up.kind === "nid"
    ? (await env.DB.prepare(`SELECT id, r2_key FROM tutor_documents WHERE tutor_id = ? AND kind = 'nid'`).bind(tutorId).all<{ id: number; r2_key: string }>()).results
    : [];
  await env.DB.batch([
    decided,
    ...(up.kind === "photo"
      ? [env.DB.prepare(`UPDATE tutors SET photo_key = ?, updated_at = ? WHERE id = ?`).bind(up.r2_key, t, tutorId)]
      : [
        ...oldNids.map((d) => env.DB.prepare(`DELETE FROM tutor_documents WHERE id = ?`).bind(d.id)),
        env.DB.prepare(`INSERT INTO tutor_documents (tutor_id, kind, label, r2_key, created_at) VALUES (?, ?, ?, ?, ?)`).bind(tutorId, up.kind, up.label, up.r2_key, t),
      ]),
    audit(actorId, "upload_approved", up.code, { kind: up.kind }),
  ]);
  const gone = [...(up.kind === "photo" && up.photo_key && up.photo_key !== up.r2_key ? [up.photo_key] : []), ...oldNids.map((d) => d.r2_key)];
  await Promise.all(gone.map((k) => env.PHOTOS.delete(k)));
  return null;
}

/** Removes one of a tutor's documents, e.g. an old ID card after a new one is approved. */
export async function removeDocument(actorId: number | null, tutorId: number, docId: number): Promise<string | null> {
  const doc = await env.DB.prepare(`SELECT d.r2_key, t.code FROM tutor_documents d JOIN tutors t ON t.id = d.tutor_id WHERE d.id = ? AND d.tutor_id = ?`)
    .bind(docId, tutorId).first<{ r2_key: string; code: number }>();
  if (!doc) return "Document not found.";
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM tutor_documents WHERE id = ?`).bind(docId),
    audit(actorId, "document_removed", doc.code, { doc: docId }),
  ]);
  await env.PHOTOS.delete(doc.r2_key);
  return null;
}

/** One upload's file, for the tutor who sent it or the admin. */
export async function uploadFile(code: number, id: number) {
  return env.DB.prepare(`SELECT u.r2_key, u.kind, u.status, t.user_id FROM tutor_uploads u JOIN tutors t ON t.id = u.tutor_id WHERE u.id = ? AND t.code = ? AND t.deleted_at IS NULL`)
    .bind(id, code).first<{ r2_key: string; kind: UploadKind; status: string; user_id: number | null }>();
}
