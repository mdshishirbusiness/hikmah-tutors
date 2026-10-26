// Browser-only: saves a lead now, or keeps it on the phone (localStorage) when there is no internet and sends it later.
// Every lead carries a client_id, so sending the same one twice never creates a duplicate on the server.
import { useSyncExternalStore } from "react";
import type { LeadErrors, LeadInput } from "./lead";

const KEY = "hikmah.pendingLeads.v1";
const EVENT = "hikmah:pending";
const TIMEOUT_MS = 10_000; // a weak connection during a call should not leave the button spinning

export type SendResult =
  | { kind: "ok" }
  | { kind: "queued" } // no internet: kept on the phone
  | { kind: "auth" } // not logged in: kept on the phone, sent after login
  | { kind: "invalid"; errors: LeadErrors };

function read(): LeadInput[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(list: LeadInput[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage full or blocked: nothing more we can do here
  }
  window.dispatchEvent(new Event(EVENT));
}

async function send(lead: LeadInput): Promise<Exclude<SendResult, { kind: "queued" }> | { kind: "retry" }> {
  try {
    const r = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (r.ok) return { kind: "ok" };
    if (r.status === 401 || r.status === 403) return { kind: "auth" };
    if (r.status === 400) {
      const j = (await r.json().catch(() => ({}))) as { errors?: LeadErrors };
      return { kind: "invalid", errors: j.errors ?? { form: "তথ্য ঠিক নেই" } };
    }
    return { kind: "retry" }; // 5xx and the like: the server will be back
  } catch {
    return { kind: "retry" }; // offline or timed out
  }
}

/** Saves one lead. When it cannot reach the server it keeps the lead on the phone instead of losing it. */
export async function saveLead(lead: LeadInput): Promise<SendResult> {
  const r = await send(lead);
  if (r.kind === "retry" || r.kind === "auth") {
    write([...read().filter((l) => l.client_id !== lead.client_id), lead]);
    return r.kind === "auth" ? r : { kind: "queued" };
  }
  return r;
}

let flushing = false;

/** Sends the leads waiting on the phone, oldest first. Stops at the first one that still cannot go. */
export async function flushPending(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (const lead of read()) {
      const r = await send(lead);
      if (r.kind === "retry" || r.kind === "auth") break;
      // sent, or rejected as invalid (cannot happen for leads checked before queueing): either way it leaves the queue
      write(read().filter((l) => l.client_id !== lead.client_id));
    }
  } finally {
    flushing = false;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange); // another tab
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Number of leads still waiting on this phone (0 during server rendering). */
export function usePendingCount(): number {
  return useSyncExternalStore(subscribe, () => read().length, () => 0);
}
