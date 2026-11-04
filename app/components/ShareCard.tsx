// A Premium card button (owner, 2026-11-05). Draws the card in the browser, shows it, then on a phone puts the picture
// into the share sheet (pick the tutor's WhatsApp chat); elsewhere, or for the tutor's own copy, it saves a PNG.
import { useEffect, useState } from "react";
import { Download, Image as ImageIcon, Send } from "lucide-react";
import { Sheet } from "~/components/tutor";

export function ShareCard({ label, title, filename, make, text = "", share = true, className = "" }: {
  label: string; title: string; filename: string; make: () => Promise<Blob>; text?: string; share?: boolean; className?: string;
}) {
  const [card, setCard] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { if (card) URL.revokeObjectURL(card.url); }, [card]);

  async function open() {
    setBusy(true); setError("");
    try {
      const blob = await make();
      setCard({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError("The card couldn't be drawn. Try again.");
    } finally {
      setBusy(false);
    }
  }
  const file = card ? new File([card.blob], filename, { type: "image/png" }) : null;
  const canShare = share && !!file && typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [file] });

  function save() {
    if (!card) return;
    const a = document.createElement("a");
    a.href = card.url; a.download = filename;
    a.click();
  }
  async function send() {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text });
    } catch (e) {
      if ((e as Error).name !== "AbortError") save();
    }
  }

  return (
    <>
      <button type="button" onClick={open} disabled={busy} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold disabled:opacity-60 ${className}`}>
        <ImageIcon size={16} aria-hidden />{busy ? "Drawing…" : label}
      </button>
      {error && <span role="alert" className="text-xs font-semibold text-rose-700">{error}</span>}
      <Sheet open={!!card} onClose={() => setCard(null)} title={title}>
        {card && <img src={card.url} alt={title} className="mx-auto w-full max-w-sm rounded-2xl shadow-card ring-1 ring-brand-100" />}
        <div className="mt-4 flex gap-2">
          {canShare && (
            <button type="button" onClick={send} className="wa-btn inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold">
              <Send size={16} aria-hidden />Send on WhatsApp
            </button>
          )}
          <button type="button" onClick={save} className={`inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-extrabold ${canShare ? "bg-white text-forest shadow-ring" : "bg-forest text-cream"}`}>
            <Download size={16} aria-hidden />Save picture
          </button>
        </div>
        {share && !canShare && <p className="mt-2 text-xs text-slate-500">এই ব্রাউজার থেকে সরাসরি পাঠানো যায় না। ছবিটা সেভ করে WhatsApp-এ পাঠান।</p>}
      </Sheet>
    </>
  );
}
