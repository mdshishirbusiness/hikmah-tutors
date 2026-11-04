// The documents part of tutor registration (owner, 2026-11-05): at least one academic proof (student ID card, admission slip,
// result sheet, certificate), up to 5, and an optional NID as extra security. Photos are shrunk on the phone before sending.
import { useState } from "react";
import { FileImage, Plus, Trash2 } from "lucide-react";
import { ACADEMIC_DOCS_MAX, DOC_LABELS } from "~/lib/join";

export type ExistingDoc = { id: number; kind: "academic" | "nid"; label: string | null };

/** A readable copy no larger than 1600 px on its long side. Not cropped. Drawing it again also drops hidden photo details such as location. */
async function shrinkDoc(file: File): Promise<File> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const encode = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await encode("image/webp", 0.85);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.88); // Safari can't write WebP
  if (!blob) throw new Error("encode");
  return new File([blob], blob.type === "image/webp" ? "doc.webp" : "doc.jpg", { type: blob.type });
}

/** A file picker that shrinks what is chosen and shows it. */
function Picker({ name, preview, onPreview, children }: { name: string; preview: string | null; onPreview: (url: string) => void; children: React.ReactNode }) {
  const [busy, setBusy] = useState(false);
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget, file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const small = await shrinkDoc(file);
      const dt = new DataTransfer();
      dt.items.add(small);
      input.files = dt.files;
      onPreview(URL.createObjectURL(small));
    } catch {
      onPreview(URL.createObjectURL(file)); // the server still checks type and size
    }
    setBusy(false);
  }
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 ring-1 ring-brand-100">
        {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <FileImage size={24} className="text-brand-600" aria-hidden />}
      </span>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-forest shadow-ring has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600">
        {busy ? "Preparing…" : children}
        <input type="file" name={name} accept="image/*" onChange={pick} className="sr-only" />
      </label>
    </div>
  );
}

const removeButton = "inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-700";
const labelOf = (key: string | null) => DOC_LABELS.find((l) => l.key === key)?.label ?? "Document";

export function JoinDocuments({ code, existing, error, nidError }: { code: number | null; existing: ExistingDoc[]; error?: string; nidError?: string }) {
  const [kept, setKept] = useState(existing.filter((d) => d.kind === "academic"));
  const [rows, setRows] = useState<{ slot: number; label: string; preview: string | null }[]>(kept.length ? [] : [{ slot: 0, label: "student_id", preview: null }]);
  const [nid, setNid] = useState(existing.find((d) => d.kind === "nid") ?? null);
  const [nidPreview, setNidPreview] = useState<string | null>(null);
  const total = kept.length + rows.length;
  // Functional updates: a photo finishes shrinking after other taps, and must not undo them.
  const addRow = () => setRows((rs) => {
    const slot = [0, 1, 2, 3, 4].find((s) => !rs.some((r) => r.slot === s));
    return slot === undefined ? rs : [...rs, { slot, label: kept.length + rs.length === 0 ? "student_id" : "result", preview: null }];
  });
  const patch = (slot: number, p: Partial<(typeof rows)[number]>) => setRows((rs) => rs.map((r) => (r.slot === slot ? { ...r, ...p } : r)));

  return (
    <div>
      <p className="text-sm text-slate-600">At least one is needed. A student ID card is best; if you don't have one yet, send an admission slip, result sheet or certificate. You can add more to strengthen your profile.</p>
      <p className="mt-1 text-xs text-slate-500">কমপক্ষে একটি শিক্ষা-সংক্রান্ত ডকুমেন্টের ছবি দিন। শুধু HTR দেখবে, গার্ডিয়ান বা অন্য কেউ নয়।</p>

      <ul className="mt-4 space-y-3">
        {kept.map((d) => (
          <li key={d.id} className="flex items-center gap-3 rounded-xl bg-brand-50/60 p-2">
            <input type="hidden" name="keep_doc" value={d.id} />
            <img src={`/docs/tutor/${code}/${d.id}`} alt="" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-brand-100" />
            <p className="min-w-0 flex-1 text-sm font-bold text-forest">{labelOf(d.label)}<span className="block text-xs font-normal text-slate-500">Sent already</span></p>
            <button type="button" aria-label={`Remove ${labelOf(d.label)}`} onClick={() => setKept((ks) => ks.filter((k) => k.id !== d.id))} className={removeButton}><Trash2 size={18} aria-hidden /></button>
          </li>
        ))}
        {rows.map((r) => (
          <li key={r.slot} className="rounded-xl bg-brand-50/60 p-2">
            <div className="flex items-center gap-2">
              <select name={`doc_label_${r.slot}`} value={r.label} onChange={(e) => patch(r.slot, { label: e.target.value })} aria-label="Which document" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-forest">
                {DOC_LABELS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
              </select>
              <button type="button" aria-label="Remove this document" onClick={() => setRows((rs) => rs.filter((x) => x.slot !== r.slot))} className={removeButton}><Trash2 size={18} aria-hidden /></button>
            </div>
            <div className="mt-2">
              <Picker name={`doc_file_${r.slot}`} preview={r.preview} onPreview={(preview) => patch(r.slot, { preview })}>{r.preview ? "Change photo" : "Add photo"}</Picker>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
      {total < ACADEMIC_DOCS_MAX && (
        <button type="button" onClick={addRow} className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-brand-700 hover:bg-brand-50">
          <Plus size={16} aria-hidden />{total === 0 ? "Add a document" : "Add another document"}
        </button>
      )}

      <div className="mt-5 border-t border-brand-50 pt-4">
        <p className="text-sm font-bold text-forest">NID <span className="font-normal text-slate-500">(optional)</span></p>
        <p className="mb-2 text-xs text-slate-500">Extra security only. It does not replace the document above. শুধু HTR দেখবে।</p>
        {nid ? (
          <div className="flex items-center gap-3 rounded-xl bg-brand-50/60 p-2">
            <img src={`/docs/tutor/${code}/${nid.id}`} alt="" className="size-16 shrink-0 rounded-xl object-cover ring-1 ring-brand-100" />
            <p className="min-w-0 flex-1 text-sm font-bold text-forest">NID<span className="block text-xs font-normal text-slate-500">Sent already</span></p>
            <button type="button" aria-label="Remove NID" onClick={() => setNid(null)} className={removeButton}><Trash2 size={18} aria-hidden /></button>
          </div>
        ) : (
          <Picker name="nid" preview={nidPreview} onPreview={setNidPreview}>{nidPreview ? "Change photo" : "Add NID photo"}</Picker>
        )}
        {!nid && existing.some((d) => d.kind === "nid") && <input type="hidden" name="remove_nid" value="1" />}
        {nidError && <p role="alert" className="mt-2 text-sm font-semibold text-rose-700">{nidError}</p>}
      </div>
    </div>
  );
}
