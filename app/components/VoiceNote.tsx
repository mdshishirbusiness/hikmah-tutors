// The owner's voice on a page (owner, 2026-11-11): a floating button that plays a short clip explaining the page.
// A clip marked auto starts by itself the first time this visitor opens the page; browsers hold sound back until the
// page has been touched, so on a fresh load it starts at the first tap. The X stops it and keeps auto voice off on
// this phone; pressing play turns it back on. Nothing is downloaded until it plays.
import { useEffect, useRef, useState } from "react";
import { useLocation, useRouteLoaderData } from "react-router";
import { Pause, Play, Volume2, X } from "lucide-react";
import { type VoiceClip, type VoiceSpotKey, voiceSlotFor, voiceUrl } from "~/lib/voice";

const OFF = "htr-voice-off";
const heardKey = (c: VoiceClip) => `htr-voice-heard-${c.slot}`;
// A private window or a full disk can refuse storage; the button still works, it just forgets.
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* not kept */ } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { /* not kept */ } },
};
// One voice at a time: starting a clip (page or section) pauses whichever was playing.
let current: HTMLAudioElement | null = null;
const claim = (a: HTMLAudioElement) => { if (current && current !== a) current.pause(); current = a; };
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function VoiceNote({ clips }: { clips: VoiceClip[] }) {
  const { pathname } = useLocation();
  const slot = voiceSlotFor(pathname);
  const clip = slot && clips.find((c) => c.slot === slot.key);
  if (!clip) return null;
  // Profile has its own Save bar along the bottom; the button sits above it there.
  return <Player key={`${clip.slot}:${clip.v}`} clip={clip} raised={clip.slot === "profile"} />;
}

function Player({ clip, raised }: { clip: VoiceClip; raised: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [progress, setProgress] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const [fresh, setFresh] = useState(false); // not heard yet: the button says "Listen"

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const heard = store.get(heardKey(clip)) === String(clip.v);
    setFresh(!heard);
    let firstTouch: ((e: PointerEvent) => void) | null = null;
    if (clip.auto && !heard && store.get(OFF) !== "1") {
      a.play().catch(() => {
        firstTouch = (e) => {
          if (box.current?.contains(e.target as Node)) return; // the button does its own thing
          if (a.paused && store.get(OFF) !== "1") a.play().catch(() => {});
        };
        window.addEventListener("pointerdown", firstTouch, { once: true });
      });
    }
    return () => {
      if (firstTouch) window.removeEventListener("pointerdown", firstTouch);
      a.pause();
    };
  }, [clip]);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) { store.del(OFF); a.play().catch(() => {}); } else a.pause();
  };
  const stop = () => {
    const a = audio.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setState("idle");
    setProgress(0);
    setFresh(false);
    if (clip.auto) store.set(OFF, "1");
  };

  const active = state !== "idle";
  const r = 22, c = 2 * Math.PI * r;
  return (
    <div ref={box} className={`fixed right-4 z-30 flex items-center gap-2 lg:bottom-6 print:hidden ${raised ? "bottom-[calc(8.75rem+env(safe-area-inset-bottom))]" : "bottom-[calc(5rem+env(safe-area-inset-bottom))]"}`}>
      <audio ref={audio} src={voiceUrl(clip)} preload="none"
        onPlay={(e) => { claim(e.currentTarget); setState("playing"); setFresh(false); store.set(heardKey(clip), String(clip.v)); }}
        onPause={(e) => { if (!e.currentTarget.ended && e.currentTarget.currentTime > 0) setState("paused"); }}
        onEnded={() => { setState("idle"); setProgress(0); }}
        onTimeUpdate={(e) => { const a = e.currentTarget; if (a.duration > 0 && Number.isFinite(a.duration)) { setProgress(a.currentTime / a.duration); setLeft(a.duration - a.currentTime); } }} />
      {active && (
        <button type="button" onClick={stop} aria-label={clip.auto ? "Stop and keep voice off" : "Stop"} className="grid size-11 animate-pop place-items-center rounded-full bg-white text-slate-600 shadow-lift ring-1 ring-brand-100 motion-reduce:animate-none">
          <X size={18} aria-hidden />
        </button>
      )}
      <button type="button" onClick={toggle} aria-label={state === "playing" ? "Pause voice" : "Listen to HTR"} aria-pressed={state === "playing"}
        className="flex h-[52px] animate-rise items-center rounded-full bg-forest p-1 text-cream shadow-lift transition-transform duration-150 active:scale-95 motion-reduce:animate-none">
        {(fresh || active) && (
          <span className="pr-2.5 pl-4 text-left leading-tight">
            <span className="block text-[11px] font-bold tracking-[0.12em] text-brand-200 uppercase">HTR voice</span>
            <span className="block text-sm font-extrabold tabular-nums">{state === "playing" && left !== null ? clock(left) : state === "paused" ? "Resume" : "Listen"}</span>
          </span>
        )}
        <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-mango text-forest">
          <svg viewBox="0 0 48 48" aria-hidden className="absolute -inset-0.5 size-12 -rotate-90">
            {active && <circle cx="24" cy="24" r={r} fill="none" stroke="var(--color-cream)" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} className="transition-[stroke-dashoffset] duration-300 ease-linear" />}
          </svg>
          {state === "playing" ? (
            <span aria-hidden className="flex h-4 items-center gap-[3px]">
              {[0, 1, 2].map((i) => <span key={i} className="h-full w-[3px] origin-center animate-eq rounded-full bg-forest motion-reduce:animate-none" style={{ animationDelay: `${i * 150}ms` }} />)}
            </span>
          ) : state === "paused" ? <Pause size={18} aria-hidden /> : <Volume2 size={20} aria-hidden />}
        </span>
      </button>
    </div>
  );
}

/**
 * A short clip on one part of a page (owner, 2026-11-12): a small "Listen" pill beside a heading. Shows nothing until
 * the owner has uploaded that clip. Never starts by itself; the audio downloads only when pressed.
 */
/** `dark` for a pill on a forest or emerald band. */
export function VoiceSpot({ spot, dark = false, className = "" }: { spot: VoiceSpotKey; dark?: boolean; className?: string }) {
  const clips = (useRouteLoaderData("root") as { voice?: VoiceClip[] } | undefined)?.voice ?? [];
  const clip = clips.find((c) => c.slot === spot);
  return clip ? <SpotPlayer key={clip.v} clip={clip} dark={dark} className={className} /> : null;
}

function SpotPlayer({ clip, dark, className }: { clip: VoiceClip; dark: boolean; className: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [left, setLeft] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const r = 15, c = 2 * Math.PI * r;
  return (
    <span className={`inline-flex print:hidden ${className}`}>
      <audio ref={audio} src={voiceUrl(clip)} preload="none"
        onPlay={(e) => { claim(e.currentTarget); setState("playing"); }}
        onPause={(e) => { if (!e.currentTarget.ended) setState("paused"); }}
        onEnded={() => { setState("idle"); setProgress(0); setLeft(null); }}
        onTimeUpdate={(e) => { const a = e.currentTarget; if (a.duration > 0 && Number.isFinite(a.duration)) { setProgress(a.currentTime / a.duration); setLeft(a.duration - a.currentTime); } }} />
      <button type="button" onClick={toggle} aria-pressed={state === "playing"} aria-label={state === "playing" ? "Pause voice" : "Listen: HTR explains this part"}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full py-1 pr-3.5 pl-1 text-sm font-extrabold ring-1 transition-[background-color,transform] duration-150 active:scale-95 motion-reduce:transition-none ${dark ? "text-cream ring-white/25 hover:bg-white/10" : "text-forest ring-brand-100 hover:bg-brand-50"}`}>
        <span className={`relative grid size-9 shrink-0 place-items-center rounded-full ${dark ? "bg-mango text-forest" : "bg-forest text-mango"}`}>
          <svg viewBox="0 0 36 36" aria-hidden className="absolute inset-0 size-9 -rotate-90">
            {state !== "idle" && <circle cx="18" cy="18" r={r} fill="none" stroke={dark ? "var(--color-cream)" : "var(--color-mango)"} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - progress)} className="transition-[stroke-dashoffset] duration-300 ease-linear" />}
          </svg>
          {state === "playing" ? (
            <span aria-hidden className="flex h-3.5 items-center gap-[2.5px]">
              {[0, 1, 2].map((i) => <span key={i} className={`h-full w-[2.5px] origin-center animate-eq rounded-full ${dark ? "bg-forest" : "bg-mango"} motion-reduce:animate-none`} style={{ animationDelay: `${i * 150}ms` }} />)}
            </span>
          ) : state === "paused" ? <Pause size={14} aria-hidden /> : <Play size={14} className="translate-x-px" fill="currentColor" aria-hidden />}
        </span>
        <span className="tabular-nums">{state === "playing" && left !== null ? clock(left) : state === "paused" ? "Resume" : "Listen"}</span>
      </button>
    </span>
  );
}
