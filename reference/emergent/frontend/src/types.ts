export type Lang = "bn" | "en";

export interface Option {
  key: string;
  label: string;
  label_en: string;
  alt?: string[];
}

export interface ClassOption extends Option {
  group: string;
  hidden?: boolean;
  legacy?: boolean;
}

export interface Fees {
  basis: number;
  standard_total: number;
  first: number;
  second: number;
  early_total: number;
  saving: number;
  is_example: boolean;
}

export interface Tuition {
  code: number;
  code_label: string;
  status: string;
  accepting_applications: boolean;
  tuition_type: string;
  class_level: string;
  medium: string;
  subjects: string[];
  area: string;
  mode: "home" | "online";
  salary_kind: "fixed" | "negotiable" | "unspecified";
  salary_amount: number | null;
  salary_period: "per_month" | "per_course";
  days_per_week: number;
  students_count: number | null;
  student_gender: "boy" | "girl" | null;
  tutor_gender_pref: "any" | "male" | "female";
  requirements_public: string;
  start_note: string;
  posted_at: string | null;
  closed_at: string | null;
  is_available: boolean;
  not_available: boolean;
  fees: Fees;
}

export interface PublicSettings {
  contact_whatsapp: string | null;
  contact_call: string | null;
  facebook_page_url: string | null;
}

export interface TuitionFilters {
  area?: string;
  class_level?: string;
  subject?: string;
  medium?: string;
  tutor_gender?: string;
  mode?: string;
  salary_min?: number;
  days?: number;
  q?: string;
  sort?: "newest" | "salary_desc";
}

export interface LeadInput {
  name: string;
  phone: string;
  area: string;
  class_level: string;
  tutor_gender: string;
  subjects: string[];
  note: string;
  consent: boolean;
  website: string;
  client_id: string;
}
