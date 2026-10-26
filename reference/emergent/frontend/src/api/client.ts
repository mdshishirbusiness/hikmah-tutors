import type { ClassOption, LeadInput, PublicSettings, Tuition, TuitionFilters } from "../types";
import { getTutorId } from "../lib/tutorSession";

const BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const tid = getTutorId();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(tid ? { "X-Tutor-Id": tid } : {}), ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = "error";
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* no body */
    }
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

const send = <T,>(method: string, path: string, body?: unknown) => request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export function listTuitions(filters: TuitionFilters): Promise<{ items: Tuition[]; total: number }> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  });
  const qs = params.toString();
  return request(`/tuitions${qs ? `?${qs}` : ""}`);
}

export const getTuition = (code: string): Promise<Tuition> => request(`/tuitions/${encodeURIComponent(code)}`);
export const getSimilarTuitions = (code: string): Promise<{ items: Tuition[] }> => request(`/tuitions/${encodeURIComponent(code)}/similar`);
export const getPublicSettings = (): Promise<PublicSettings> => request("/settings/public");
export const getOptions = (): Promise<{ class_levels: ClassOption[]; all_class_levels: ClassOption[] }> => request("/options");
export const createLead = (body: LeadInput): Promise<{ ok: boolean }> => send("POST", "/leads", body);
export const shareUrl = (codeLabel: string): string => `${BASE}/share/${codeLabel}`;

type Any = Record<string, any>;

export const adminApi = {
  overview: () => request<Any>("/admin/overview"),
  leads: (status?: string) => request<{ items: Any[] }>(`/admin/leads${status ? `?status=${status}` : ""}`),
  quickLead: (body: Any) => send<Any>("POST", "/admin/leads", body),
  patchLead: (id: string, body: Any) => send<Any>("PATCH", `/admin/leads/${id}`, body),
  convertLead: (id: string) => send<{ code: number }>("POST", `/admin/leads/${id}/convert`),
  tuitions: (status?: string, q?: string) => request<{ items: Any[] }>(`/admin/tuitions?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) })}`),
  tuition: (code: number) => request<{ tuition: Any; private: Any; applications: Any[] }>(`/admin/tuitions/${code}`),
  createTuition: (body: Any) => send<{ code: number }>("POST", "/admin/tuitions", body),
  updateTuition: (code: number, body: Any) => send<{ tuition: Any; private: Any; applications: Any[] }>("PUT", `/admin/tuitions/${code}`, body),
  applications: (status?: string, code?: number) => request<{ items: Any[] }>(`/admin/applications?${new URLSearchParams({ ...(status ? { status } : {}), ...(code ? { code: String(code) } : {}) })}`),
  setAppStatus: (id: string, body: Any) => send<Any>("POST", `/admin/applications/${id}/status`, body),
  tutors: (q?: string) => request<{ items: Any[] }>(`/admin/tutors${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  revealPhone: (id: string) => send<{ phone: string }>("POST", `/admin/tutors/${id}/reveal`),
  settings: () => request<Any>("/admin/settings"),
  saveSettings: (body: Any) => send<Any>("PUT", "/admin/settings", body),
  posts: (body: Any) => send<{ facebook: string; whatsapp: string; contact_line: string; sheet_row: string }>("POST", "/admin/posts", body),
};

export const tutorApi = {
  demoList: () => request<{ items: Any[] }>("/tutor/demo-list"),
  me: () => request<{ profile: Any; checklist: Record<string, boolean>; saved_codes: number[] }>("/me"),
  updateMe: (body: Any) => send<Any>("PUT", "/me", body),
  toggleSaved: (code: number) => send<{ saved: boolean }>("POST", `/me/saved/${code}`),
  saved: () => request<{ items: Tuition[] }>("/me/saved"),
  suggested: () => request<{ items: Tuition[] }>("/me/suggested"),
  apply: (body: Any) => send<Any>("POST", "/me/applications", body),
  applications: () => request<{ items: Any[] }>("/me/applications"),
  withdraw: (id: string) => send<Any>("POST", `/me/applications/${id}/withdraw`),
};
