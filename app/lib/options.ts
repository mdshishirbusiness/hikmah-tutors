// Choices shown as tap-chips on the Quick Pad. The database stores the `key`, so a label can be reworded at any time.
// Keep keys short, lowercase and never change one that is already in use.
// Labels are English (owner, 2026-11-04); `alt` keeps the Bangla and other spellings so search still finds them.

// alt: other spellings, used by search. legacy: an old key that still names stored rows but is no longer offered.
export type Option = { key: string; label: string; alt?: string; legacy?: boolean };

// One class or one exam batch, never a range (owner, 2026-11-02). Add the next SSC/HSC batch each year; keep old ones
// while tuitions use them.
// Play, Nursery and KG are separate, and admission comes in three kinds, as guardians asked in the sheet (owner,
// 2026-11-04, review step 3). Shown as a dropdown in this order.
export const CLASS_LEVELS: Option[] = [
  { key: "play", label: "Play", alt: "প্লে" },
  { key: "nursery", label: "Nursery", alt: "নার্সারি" },
  { key: "kg", label: "KG", alt: "কেজি" },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ key: `class-${n}`, label: `Class ${n}` })),
  { key: "ssc-27", label: "SSC 27" },
  { key: "ssc-28", label: "SSC 28" },
  { key: "class-11", label: "Class 11", alt: "HSC 1st year" },
  { key: "class-12", label: "Class 12", alt: "HSC 2nd year" },
  { key: "hsc-27", label: "HSC 27" },
  { key: "hsc-28", label: "HSC 28" },
  { key: "admission", label: "University admission", alt: "admission ভর্তি" },
  { key: "admission-medical", label: "Medical admission", alt: "মেডিকেল ভর্তি" },
  { key: "admission-engineering", label: "Engineering admission", alt: "ইঞ্জিনিয়ারিং ভর্তি" },
  { key: "olevel", label: "O Level" },
  { key: "alevel", label: "A Level" },
  { key: "other", label: "Other" },
  { key: "pre", label: "Play–KG", alt: "play nursery kg", legacy: true },
  { key: "c1-5", label: "Class 1–5", legacy: true },
  { key: "c6-8", label: "Class 6–8", legacy: true },
  { key: "ssc", label: "Class 9–10 (SSC)", legacy: true },
  { key: "hsc", label: "Class 11–12 (HSC)", legacy: true },
];
/** The classes offered when choosing; legacy range keys only show on old rows. */
export const CLASS_CHOICES = CLASS_LEVELS.filter((c) => !c.legacy);

/** Session length in minutes, as the admin picks it. */
/** Session length in minutes, in 15-minute steps (owner, 2026-11-04: guardians ask "about 1 hr 15" or "1 hr 45", not
 * only whole and half hours). */
export const SESSION_MINUTES = [45, 60, 75, 90, 105, 120, 135, 150, 165, 180] as const;

export const TIMES_OF_DAY: Option[] = [
  { key: "morning", label: "Morning" },
  { key: "noon", label: "Noon" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
  { key: "night", label: "Night" },
  { key: "flexible", label: "Flexible time" },
];

export const MEDIUMS: Option[] = [
  { key: "bangla", label: "Bangla medium" },
  { key: "ev", label: "English version" },
  { key: "em", label: "English medium" },
  { key: "madrasa", label: "Madrasa" },
];

export const TUTOR_GENDERS: Option[] = [
  { key: "any", label: "Any" },
  { key: "male", label: "Male" },
  { key: "female", label: "Female" },
];

export const SUBJECTS: Option[] = [
  { key: "all", label: "All subjects" },
  { key: "math", label: "Math", alt: "গণিত" },
  { key: "science", label: "Science", alt: "বিজ্ঞান" },
  { key: "english", label: "English", alt: "ইংরেজি" },
  { key: "bangla", label: "Bangla", alt: "বাংলা" },
  { key: "physics", label: "Physics", alt: "পদার্থ" },
  { key: "chemistry", label: "Chemistry", alt: "রসায়ন" },
  { key: "biology", label: "Biology", alt: "জীববিজ্ঞান" },
  { key: "hmath", label: "Higher Math", alt: "উচ্চতর গণিত" },
  { key: "ict", label: "ICT", alt: "আইসিটি" },
  { key: "accounting", label: "Accounting", alt: "হিসাববিজ্ঞান" },
  { key: "quran", label: "Quran / Arabic", alt: "কুরআন আরবি" },
  { key: "all-arts", label: "All subjects (Arts)" },
  { key: "all-commerce", label: "All subjects (Commerce)" },
  { key: "bgs", label: "BGS" },
  { key: "islam", label: "Islamic Studies", alt: "ইসলাম শিক্ষা" },
  { key: "economics", label: "Economics", alt: "অর্থনীতি" },
  { key: "finance", label: "Finance", alt: "ফিন্যান্স" },
  // Typed in a box beside it (class_other / subject_other); tutors never pick it.
  { key: "other", label: "Other" },
];

// How a tutor gets to a home tuition (tutors.transport).
export const TRANSPORTS: Option[] = [
  { key: "none", label: "None" },
  { key: "bicycle", label: "Bicycle" },
  { key: "motorbike", label: "Motorbike" },
  { key: "other", label: "Other" },
];

// The teaching bands a tutor lists subjects for (tutor_subjects.band).
export const BANDS: Option[] = [
  { key: "junior", label: "Class 1–8" },
  { key: "ssc", label: "Class 9–10 / SSC" },
  { key: "hsc", label: "HSC / Admission" },
];

// Where the guardian wants the tutor from (owner, 2026-11-04). None picked means any university. RC and VU were asked
// for in about 60 of the sheet's tuitions (review step 3).
export const TUTOR_FROM: Option[] = [
  { key: "ru", label: "RU", alt: "Rajshahi University রাবি" },
  { key: "ruet", label: "RUET", alt: "রুয়েট" },
  { key: "medical", label: "Medical", alt: "মেডিকেল RMC" },
  { key: "rc", label: "Rajshahi College", alt: "RC রাজশাহী কলেজ" },
  { key: "vu", label: "Varendra University", alt: "VU বরেন্দ্র" },
];

export const MODES: Option[] = [
  { key: "home", label: "Home visit" },
  { key: "online", label: "Online" },
];

export const STUDENT_GENDERS: Option[] = [
  { key: "boy", label: "Male student" },
  { key: "girl", label: "Female student" },
];

export const LEAD_SOURCES: Option[] = [
  { key: "call", label: "Phone call" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "facebook", label: "Facebook" },
  { key: "referral", label: "Referral" },
  { key: "old", label: "Old guardian" },
  { key: "website", label: "Website" },
  { key: "other", label: "Other" },
];

// Rajshahi areas, most-requested first (taken from the "Admin Pannel 1" and "Tuition Admin Panel" sheets).
// The Quick Pad shows the first AREAS_TOP as chips; the rest are found by search.
export const AREAS_TOP = 12;
export const AREAS: Option[] = [
  { key: "uposhohor", label: "Uposhohor", alt: "উপশহর Upashahar" },
  { key: "terokhadiya", label: "Terokhadiya", alt: "তেরখাদিয়া" },
  { key: "court-station", label: "Court Station", alt: "কোর্ট স্টেশন" },
  { key: "vodra", label: "Vodra", alt: "ভদ্রা Bhadra" },
  { key: "padma-abashik", label: "Padma Abashik", alt: "পদ্মা আবাসিক Padma Residential Podda" },
  { key: "sopura", label: "Sopura", alt: "সপুরা" },
  { key: "hetem-kha", label: "Hetem Kha", alt: "হেতেম খাঁ" },
  { key: "laxmipur", label: "Laxmipur", alt: "লক্ষ্মীপুর" },
  { key: "binodpur", label: "Binodpur", alt: "বিনোদপুর" },
  { key: "kazla", label: "Kazla", alt: "কাজলা Kajla" },
  { key: "sagarpara", label: "Sagarpara", alt: "সাগরপাড়া Sagorpara" },
  { key: "nowdapara", label: "Nowdapara", alt: "নওদাপাড়া Nawdapara" },
  { key: "shah-makhdum", label: "Shah Makhdum", alt: "শাহ মখদুম Mokhdum" },
  { key: "saheb-bazar", label: "Saheb Bazar", alt: "সাহেব বাজার" },
  { key: "talaimari", label: "Talaimari", alt: "তালাইমারী Talaimary" },
  { key: "bornali", label: "Bornali Mor", alt: "বর্ণালী মোড়" },
  { key: "shalbagan", label: "Shalbagan", alt: "শালবাগান" },
  { key: "kazihata", label: "Kazihata", alt: "কাজীহাটা" },
  { key: "choto-bongram", label: "Choto Bongram", alt: "ছোট বনগ্রাম" },
  { key: "baharampur", label: "Baharampur", alt: "বহরমপুর Bohorompur" },
  { key: "rajpara", label: "Rajpara", alt: "রাজপাড়া Raj Para" },
  { key: "jadughar", label: "Jadughar", alt: "জাদুঘর Museum" },
  { key: "tikapara", label: "Tikapara", alt: "টিকাপাড়া" },
  { key: "rani-bazar", label: "Rani Bazar", alt: "রাণীবাজার" },
  { key: "sadhur-mor", label: "Sadhur Mor", alt: "সাধুর মোড়" },
  { key: "dabtola", label: "Dabtola", alt: "ডাবতলা" },
  { key: "seroil", label: "Shiroil", alt: "শিরোইল Seroil" },
  { key: "veripara", label: "Veripara", alt: "ভেড়িপাড়া Police Line" },
  { key: "kumarpara", label: "Kumarpara", alt: "কুমারপাড়া" },
  { key: "dorikhorbona", label: "Dorikhorbona (Nagar Bhaban)", alt: "দড়িখরবনা নগর ভবন Nagarvaban" },
  { key: "amchattar", label: "Amchottor", alt: "আমচত্বর Aam Chattar" },
  { key: "dashpukur", label: "Dashpukur", alt: "দাশপুকুর" },
  { key: "alupotti", label: "Alupotti", alt: "আলুপট্টি" },
  { key: "kadirganj", label: "Kadirganj", alt: "কাদিরগঞ্জ" },
  { key: "chondrima", label: "Chondrima", alt: "চন্দ্রিমা Chandrima" },
  { key: "pathanpara", label: "Pathanpara", alt: "পাঠানপাড়া" },
  { key: "raipara", label: "Raipara", alt: "রায়পাড়া" },
  { key: "dinggadoba", label: "Dinggadoba", alt: "ডিংগাডোবা Dinga Doba" },
  { key: "ghoshpara", label: "Ghoshpara", alt: "ঘোষপাড়া" },
  { key: "vatapara", label: "Vatapara", alt: "ভাটাপাড়া Bhatapara" },
  { key: "new-market", label: "New Market", alt: "নিউ মার্কেট" },
  { key: "basar-road", label: "Basar Road", alt: "বাশার রোড" },
  { key: "cantonment", label: "Cantonment", alt: "ক্যান্টনমেন্ট" },
  { key: "mohisbathan", label: "Mohisbathan", alt: "মহিষবাথান" },
  { key: "banalata", label: "Banalata Abashik", alt: "বনলতা আবাসিক Bonolota" },
  { key: "horogram", label: "Horogram", alt: "হড়গ্রাম" },
  { key: "hadir-mor", label: "Hadir Mor", alt: "হাদির মোড়" },
  { key: "fire-service", label: "Fire Service Mor", alt: "ফায়ার সার্ভিস মোড় More" },
  { key: "city-college", label: "City College", alt: "সিটি কলেজ" },
  { key: "bgb-camp", label: "BGB Camp", alt: "বিজিবি ক্যাম্প School" },
  { key: "malopara", label: "Malopara", alt: "মালোপাড়া" },
  { key: "meherchondi", label: "Meherchondi", alt: "মেহেরচণ্ডী" },
  { key: "baneshwar", label: "Baneshwar", alt: "বানেশ্বর" },
  { key: "durgapur", label: "Durgapur", alt: "দুর্গাপুর" },
  { key: "sonadighi", label: "Sonadighi", alt: "সোনাদিঘী Sonadighir" },
  { key: "alokar", label: "Alokar Mor", alt: "অলকার মোড়" },
  { key: "ruet", label: "RUET", alt: "রুয়েট" },
  { key: "ru-campus", label: "Rajshahi University", alt: "রাজশাহী বিশ্ববিদ্যালয় RU" },
  { key: "bilsimla", label: "Bilsimla", alt: "বিলসিমলা" },
  { key: "debisingpara", label: "Debisingpara", alt: "দেবীসিংপাড়া" },
  { key: "baliapukur", label: "Baliapukur", alt: "বালিয়াপুকুর" },
  { key: "dorgapara", label: "Dorgapara", alt: "দরগাপাড়া" },
  { key: "shipaipara", label: "Shipaipara", alt: "সিপাইপাড়া" },
  { key: "malda-colony", label: "Malda Colony", alt: "মালদা কলোনি" },
  { key: "chiriakhana", label: "Chiriakhana", alt: "চিড়িয়াখানা" },
  { key: "kedur-mor", label: "Kedur Mor", alt: "কেদুর মোড়" },
  { key: "soshtitola", label: "Soshtitola", alt: "ষষ্ঠীতলা" },
  { key: "mirerchok", label: "Mirerchok", alt: "মিরেরচক" },
  { key: "chowddopai", label: "Chowddopai", alt: "চৌদ্দপাই" },
  { key: "bulonpur", label: "Bulonpur", alt: "বুলনপুর" },
  { key: "bosua", label: "Bosua", alt: "বসুয়া" },
  { key: "ghoramara", label: "Ghoramara", alt: "ঘোড়ামারা" },
];

export const DAYS_PER_WEEK = [2, 3, 4, 5, 6] as const;

export const SALARY_PRESETS = [3000, 4000, 5000, 6000, 8000, 10000] as const;

// A lead's steps (owner, 2026-11-04): New → Called → Posted / Not now. The tuition's own status takes over after posting.
export const STATUSES: Option[] = [
  { key: "new", label: "New" },
  { key: "called", label: "Called" },
  { key: "posted", label: "Posted" },
  { key: "not_now", label: "Not now" },
];

export const labelOf = (list: Option[], key: string | null | undefined) =>
  list.find((o) => o.key === key)?.label ?? key ?? "";
