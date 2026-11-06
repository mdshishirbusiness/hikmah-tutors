// Profile: a checked tutor changes their photo or adds an ID card or other document (owner, 2026-11-06). What they send
// waits for HTR; the current photo and documents stay until HTR approves. Its own form, outside Profile's main form.
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { Camera, Clock, FilePlus2, FileText, X, XCircle } from "lucide-react";
import { Avatar } from "~/components/Avatar";
import { DocViewer } from "~/components/DocViewer";
import { ACADEMIC_DOCS_MAX, DOC_LABELS } from "~/lib/join";
import { prepareInput, shrinkDoc, squarePhoto } from "~/lib/images";

type Doc = { id: number; kind: "academic" | "nid"; label: string | null; created_at: number };
type Up = { id: number; kind: "photo" | "academic" | "nid"; label: string | null; status: string; note: string | null; created_at: number };
type Result = { uploadError?: string | null; uploadSent?: boolean } | undefined;

const docName = (kind: string, label: string | null) => (kind === "photo" ? "Photo" : kind === "nid" ? "NID" : DOC_LABELS.find((l) => l.key === label)?.label ?? "Document");
const btn = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold";

/** Pick → see it → Send for check. The file is made small on the phone first. */
function SendForm({ kind, children }: { kind: "photo" | "doc"; children?: React.ReactNode }) {
  const fetcher = useFetcher<Result>();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [docType, setDocType] = useState("student_id");
  const sending = fetcher.state !== "idle";
  const error = fetcher.data?.uploadError;
  useEffect(() => { if (fetcher.state === "idle" && fetcher.data?.uploadSent) setPreview(null); }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form method="post" encType="multipart/form-data" className="space-y-3">
      <input type="hidden" name="intent" value="send_upload" />
      <input type="hidden" name="kind" value={kind === "photo" ? "photo" : docType === "nid" ? "nid" : "academic"} />
      {kind === "doc" && <input type="hidden" name="label" value={docType === "nid" ? "" : docType} />}
      {kind === "doc" && !preview && (
        <select value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type"
          className="min-h-11 w-full rounded-xl bg-white px-3 text-sm ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-brand-600">
          {DOC_LABELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
          <option value="nid">NID (extra security)</option>
        </select>
      )}
      {preview && (
        <div className="flex items-center gap-3 rounded-xl bg-cream p-3">
          <img src={preview} alt="" className={`${kind === "photo" ? "size-16 rounded-full" : "h-16 w-24 rounded-lg"} shrink-0 object-cover ring-2 ring-white`} />
          <p className="min-w-0 flex-1 text-sm text-slate-700">{kind === "photo" ? "নতুন ছবি" : docName(docType === "nid" ? "nid" : "academic", docType)}। পাঠালে HTR দেখে approve করবে।</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <label className={`${btn} cursor-pointer ${preview ? "bg-white text-forest ring-1 ring-slate-200" : "bg-forest text-cream"} has-focus-visible:outline-2 has-focus-visible:outline-brand-600`}>
          {kind === "photo" ? <Camera size={16} aria-hidden /> : <FilePlus2 size={16} aria-hidden />}{preview ? "Pick another" : children}
          <input ref={input} type="file" name="file" accept="image/*" className="sr-only"
            onChange={async (e) => setPreview(await prepareInput(e.currentTarget, kind === "photo" ? squarePhoto : shrinkDoc))} />
        </label>
        {preview && <button disabled={sending} className={`${btn} bg-mango text-forest disabled:opacity-60`}>{sending ? "Sending…" : "Send for check"}</button>}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-rose-700">{error}</p>}
    </fetcher.Form>
  );
}

function Waiting({ code, up }: { code: number; up: Up }) {
  const fetcher = useFetcher();
  return (
    <li className="flex min-h-12 items-center gap-3 py-2">
      {up.kind === "photo"
        ? <img src={`/uploads/tutor/${code}/${up.id}`} alt="" className="size-10 shrink-0 rounded-full object-cover" />
        : <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-900"><FileText size={18} aria-hidden /></span>}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{docName(up.kind, up.label)}</span>
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-800"><Clock size={12} aria-hidden />Waiting for HTR check</span>
      </span>
      {up.kind !== "photo" && <DocViewer src={`/uploads/tutor/${code}/${up.id}`} title={docName(up.kind, up.label)} className="min-h-11 px-2 text-sm font-semibold text-brand-700">View</DocViewer>}
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="withdraw_upload" />
        <input type="hidden" name="id" value={up.id} />
        <button aria-label={`Cancel ${docName(up.kind, up.label)}`} disabled={fetcher.state !== "idle"} className="grid size-11 place-items-center rounded-xl text-slate-400 hover:text-rose-700"><X size={18} aria-hidden /></button>
      </fetcher.Form>
    </li>
  );
}

export function ProfileUploads({ code, name, hasPhoto, documents, uploads }: { code: number; name: string; hasPhoto: boolean; documents: Doc[]; uploads: Up[] }) {
  const pending = uploads.filter((u) => u.status === "pending");
  const declined = uploads.filter((u) => u.status === "declined");
  const photoWaiting = pending.find((u) => u.kind === "photo");
  const academicCount = documents.filter((d) => d.kind === "academic").length + pending.filter((u) => u.kind === "academic").length;

  return (
    <section id="uploads" className="mt-6 scroll-mt-24 rounded-2xl bg-white p-4 shadow-ring sm:p-5">
      <h2 className="flex items-center gap-2 font-extrabold text-forest"><Camera size={16} aria-hidden />Photo and documents</h2>
      <p className="mt-0.5 text-sm text-slate-500">নতুন ছবি বা ডকুমেন্ট পাঠালে HTR দেখে approve করবে। ততক্ষণ আগেরটাই থাকবে। শুধু HTR দেখে।</p>

      {declined.length > 0 && (
        <ul className="mt-3 space-y-2">
          {declined.map((u) => (
            <li key={u.id} className="flex gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
              <XCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span><b>{docName(u.kind, u.label)} not accepted.</b>{u.note ? ` ${u.note}` : ""} আবার পাঠাতে পারেন।</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-start gap-4 border-t border-brand-50 pt-4">
        <Avatar code={code} name={name} hasPhoto={hasPhoto} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-forest">Photo</p>
          {photoWaiting ? <ul><Waiting code={code} up={photoWaiting} /></ul> : <div className="mt-2"><SendForm kind="photo">Change photo</SendForm></div>}
        </div>
      </div>

      <div className="mt-4 border-t border-brand-50 pt-4">
        <p className="text-sm font-bold text-forest">Documents</p>
        <ul className="divide-y divide-brand-50">
          {documents.map((d) => (
            <li key={d.id} className="flex min-h-12 items-center gap-3 py-2">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700"><FileText size={18} aria-hidden /></span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">{docName(d.kind, d.label)}</span>
              <DocViewer src={`/docs/tutor/${code}/${d.id}`} title={docName(d.kind, d.label)} className="min-h-11 px-2 text-sm font-semibold text-brand-700">View</DocViewer>
            </li>
          ))}
          {pending.filter((u) => u.kind !== "photo").map((u) => <Waiting key={u.id} code={code} up={u} />)}
        </ul>
        <div className="mt-3">
          {academicCount < ACADEMIC_DOCS_MAX || !pending.some((u) => u.kind === "nid")
            ? <SendForm kind="doc">Add a document</SendForm>
            : <p className="text-sm text-slate-500">Up to {ACADEMIC_DOCS_MAX} documents. To change one, message HTR.</p>}
        </div>
      </div>
    </section>
  );
}
