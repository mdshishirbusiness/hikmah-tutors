import { useSyncExternalStore } from "react";

const KEY = "htr_demo_tutor";
const EVT = "htr-tutor-change";

export function getTutorId(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setTutorId(id: string | null) {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    /* private mode */
  }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useTutorId(): string | null {
  return useSyncExternalStore(subscribe, getTutorId, () => null);
}
