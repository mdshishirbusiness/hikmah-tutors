// The owner's voice on the site (owner, 2026-11-11): a short clip per page, played from a floating button. A page
// whose clip is marked auto starts by itself once per visitor; anyone can turn that off. Slots are fixed here; the
// database (site_voice) only says which slots have a clip. Never change a key in use.
export const VOICE_SLOTS = [
  { key: "premium", label: "Premium", path: "/me/premium", hint: "Premium কী, কীভাবে নিতে হয়", auto: true },
  { key: "home", label: "Tuition board", path: "/", hint: "নতুন কেউ সাইটে এলে স্বাগত", auto: false },
  { key: "join", label: "Registration", path: "/me/join", hint: "রেজিস্ট্রেশন ফর্ম কীভাবে পূরণ করবে", auto: false },
  { key: "tutor-home", label: "Tutor home", path: "/me", hint: "টিউটরের নিজের Home", auto: false },
  { key: "profile", label: "Tutor profile", path: "/me/profile", hint: "Profile কেন পূর্ণ করা দরকার", auto: false },
  { key: "wallet", label: "Wallet and referral", path: "/me/wallet", hint: "বন্ধুকে আনলে কী পাবে", auto: false },
  { key: "how", label: "How it works", path: "/how-it-works", hint: "HTR কীভাবে কাজ করে", auto: false },
  { key: "fees", label: "Fees", path: "/fees", hint: "মিডিয়া ফি-র নিয়ম", auto: false },
  { key: "request", label: "Find a tutor (guardians)", path: "/request-tutor", hint: "গার্ডিয়ানদের জন্য", auto: false },
  { key: "batch", label: "Batch teachers", path: "/batch/apply", hint: "Admission batch-এ পড়ানোর আবেদন", auto: false },
] as const;

export type VoiceSlot = (typeof VOICE_SLOTS)[number]["key"];
/** What a page needs to play a clip: `v` changes when the owner replaces it, so "heard" resets and caches miss. */
export type VoiceClip = { slot: VoiceSlot; v: number; auto: boolean };

export const VOICE_MAX_BYTES = 3 * 1024 * 1024;
/** Formats every phone browser plays. AMR and 3GP (some call recorders) do not play in a browser. */
export const VOICE_TYPES: Record<string, string> = { mp3: "audio/mpeg", m4a: "audio/mp4", mp4: "audio/mp4", aac: "audio/aac", ogg: "audio/ogg", wav: "audio/wav" };

export const voiceSlotFor = (pathname: string) => VOICE_SLOTS.find((s) => s.path === (pathname.replace(/\/+$/, "") || "/"));
export const voiceUrl = (c: VoiceClip) => `/voice/${c.slot}?v=${c.v}`;
