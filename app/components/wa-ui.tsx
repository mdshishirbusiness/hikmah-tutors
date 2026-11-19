// The WhatsApp Inbox looks and feels like WhatsApp (owner, 2026-11-19: "যেন মনে হয় আমি WhatsApp চালাচ্ছি"): its colours,
// chat list, bubbles with tails, ticks, date chips and the round send button. No WhatsApp logo or artwork.
import { AlertCircle, Check, CheckCheck, Clock } from "lucide-react";

export const WA = {
  green: "#1daa61", // titles, unread times
  badge: "#25d366", // unread count
  teal: "#00a884", // send button, links
  bubbleOut: "#d9fdd3",
  chat: "#efeae2", // chat wallpaper
  bar: "#f0f2f5", // composer and pane backgrounds
  ink: "#111b21",
  meta: "#667781",
  read: "#53bdeb",
  chipOn: "#d9fdd3",
  chipOnText: "#0a5c36",
};

// Soft avatar colours, picked by chat id so a person keeps theirs.
const AVATAR = ["#d4ead9", "#fde7c3", "#dbe7fb", "#f8d9e3", "#e3dcf7", "#d5ecef", "#f3e3d3"];
const AVATAR_INK = ["#0f5132", "#7a4b00", "#1d3f8a", "#8a1f45", "#4a2d8a", "#0d5560", "#6b3d12"];

export function WaAvatar({ id, name, size = 48, urgent }: { id: number; name: string; size?: number; urgent?: boolean }) {
  const i = id % AVATAR.length;
  const letter = name.replace(/^\+?\d[\d\s-]*$/, "#").trim().charAt(0).toUpperCase() || "#";
  return (
    <span aria-hidden className="relative grid shrink-0 place-items-center rounded-full font-bold"
      style={{ width: size, height: size, background: AVATAR[i], color: AVATAR_INK[i], fontSize: size * 0.42 }}>
      {letter}
      {urgent && <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-white bg-rose-600" />}
    </span>
  );
}

/** ✓ sent, ✓✓ delivered, blue ✓✓ read, clock while sending, red ! when it failed. */
export function Ticks({ status, size = 16 }: { status: string | null; size?: number }) {
  if (status === "failed") return <AlertCircle size={size - 2} className="text-rose-600" aria-label="Not sent" />;
  if (status === "sending") return <Clock size={size - 3} style={{ color: WA.meta }} aria-label="Sending" />;
  if (status === "read") return <CheckCheck size={size} style={{ color: WA.read }} aria-label="Read" />;
  if (status === "delivered") return <CheckCheck size={size} style={{ color: WA.meta }} aria-label="Delivered" />;
  return <Check size={size} style={{ color: WA.meta }} aria-label="Sent" />;
}

const dhakaDay = (sec: number) => new Date((sec + 6 * 3600) * 1000).toISOString().slice(0, 10);

/** Chat list time, like WhatsApp: "12:36 am" today, "Yesterday", a weekday this week, else "19/11/26". */
export function listTime(sec: number | null, now: number) {
  if (!sec) return "";
  const d = new Date(sec * 1000);
  if (dhakaDay(sec) === dhakaDay(now)) return d.toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true });
  if (dhakaDay(sec) === dhakaDay(now - 86400)) return "Yesterday";
  if (now - sec < 6 * 86400) return d.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", weekday: "long" });
  return d.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "2-digit", month: "2-digit", year: "2-digit" });
}

export const bubbleTime = (sec: number) => new Date(sec * 1000).toLocaleTimeString("en-GB", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit", hour12: true });

/** Date chip between messages: "Today", "Yesterday", or "19 November 2026". */
export function dayLabel(sec: number, now: number) {
  if (dhakaDay(sec) === dhakaDay(now)) return "Today";
  if (dhakaDay(sec) === dhakaDay(now - 86400)) return "Yesterday";
  return new Date(sec * 1000).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" });
}
export const sameDay = (a: number, b: number) => dhakaDay(a) === dhakaDay(b);

/** The faint dotted wallpaper behind the bubbles (our own, not WhatsApp's doodles). */
export const wallpaper = {
  backgroundColor: WA.chat,
  backgroundImage: "radial-gradient(rgba(17,27,33,0.06) 1px, transparent 1.2px)",
  backgroundSize: "16px 16px",
} as const;
