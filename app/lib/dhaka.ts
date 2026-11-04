// Times as the owner lives them: Asia/Dhaka (UTC+6, no daylight saving). Shared by the server and the pages.
const OFFSET = 6 * 3600;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Unix seconds for a Dhaka day (0 = today, 1 = tomorrow …) at a Dhaka hour and minute. */
export function dhakaAt(dayOffset: number, hour: number, minute = 0, nowSec = Math.floor(Date.now() / 1000)) {
  const local = nowSec + OFFSET;
  const midnight = local - (local % 86400);
  return midnight + dayOffset * 86400 + hour * 3600 + minute * 60 - OFFSET;
}

/** The end of today in Dhaka, as unix seconds. */
export const endOfDhakaDay = (nowSec = Math.floor(Date.now() / 1000)) => dhakaAt(1, 0, 0, nowSec) - 1;

const clock = (sec: number) => {
  const d = new Date((sec + OFFSET) * 1000);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** "Today 7:00 PM", "Tomorrow 10:00 AM", "Tue 12 Nov, 10:00 AM". */
export function dueLabel(sec: number, nowSec = Math.floor(Date.now() / 1000)) {
  const day = Math.floor((sec + OFFSET) / 86400) - Math.floor((nowSec + OFFSET) / 86400);
  if (day === 0) return `Today ${clock(sec)}`;
  if (day === 1) return `Tomorrow ${clock(sec)}`;
  if (day === -1) return `Yesterday ${clock(sec)}`;
  const d = new Date((sec + OFFSET) * 1000);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${clock(sec)}`;
}

/** How late, in Bangla with English digits ("20 মিনিট দেরি"), as helper lines are (owner, 2026-11-04). */
export function lateBn(sec: number, nowSec = Math.floor(Date.now() / 1000)) {
  const m = Math.floor((nowSec - sec) / 60);
  if (m < 60) return `${Math.max(m, 1)} মিনিট দেরি`;
  if (m < 60 * 24) return `${Math.floor(m / 60)} ঘণ্টা দেরি`;
  return `${Math.floor(m / 1440)} দিন দেরি`;
}

/** "এইমাত্র", "20 মিনিট আগে", "3 ঘণ্টা আগে", "2 দিন আগে": helper lines in Bangla, digits English. */
export function agoBn(sec: number | null, nowSec = Math.floor(Date.now() / 1000)) {
  if (!sec) return "";
  const m = Math.floor((nowSec - sec) / 60);
  if (m < 2) return "এইমাত্র";
  if (m < 60) return `${m} মিনিট আগে`;
  if (m < 60 * 24) return `${Math.floor(m / 60)} ঘণ্টা আগে`;
  return `${Math.floor(m / 1440)} দিন আগে`;
}
