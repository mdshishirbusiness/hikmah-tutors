// Choices shown as tap-chips on the Quick Pad. The database stores the `key`, so a label can be reworded at any time.
// Keep keys short, lowercase and never change one that is already in use.

// alt: English spelling, used by search. legacy: an old key that still names stored rows but is no longer offered.
export type Option = { key: string; label: string; alt?: string; legacy?: boolean };

// One class or one exam batch, never a range (owner, 2026-11-02). Add the next SSC/HSC batch each year; keep old ones
// while tuitions use them.
export const CLASS_LEVELS: Option[] = [
  { key: "pre", label: "Play–KG", alt: "play nursery kg" },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ key: `class-${n}`, label: `Class ${n}` })),
  { key: "ssc-27", label: "SSC 27" },
  { key: "ssc-28", label: "SSC 28" },
  { key: "class-11", label: "Class 11", alt: "HSC 1st year" },
  { key: "class-12", label: "Class 12", alt: "HSC 2nd year" },
  { key: "hsc-27", label: "HSC 27" },
  { key: "hsc-28", label: "HSC 28" },
  { key: "admission", label: "Admission" },
  { key: "olevel", label: "O Level" },
  { key: "alevel", label: "A Level" },
  { key: "other", label: "Other" },
  { key: "c1-5", label: "১ম–৫ম", legacy: true },
  { key: "c6-8", label: "৬ষ্ঠ–৮ম", legacy: true },
  { key: "ssc", label: "৯ম–১০ম (SSC)", legacy: true },
  { key: "hsc", label: "একাদশ–দ্বাদশ (HSC)", legacy: true },
];
/** The classes offered when choosing; legacy range keys only show on old rows. */
export const CLASS_CHOICES = CLASS_LEVELS.filter((c) => !c.legacy);

/** Session length in minutes, as the admin picks it. */
export const SESSION_MINUTES = [60, 90, 120, 150, 180] as const;

export const TIMES_OF_DAY: Option[] = [
  { key: "morning", label: "সকালে" },
  { key: "noon", label: "দুপুরে" },
  { key: "afternoon", label: "বিকেলে" },
  { key: "evening", label: "সন্ধ্যায়" },
  { key: "night", label: "রাতে" },
  { key: "flexible", label: "সময় আলোচনা সাপেক্ষে" },
];

export const MEDIUMS: Option[] = [
  { key: "bangla", label: "বাংলা মাধ্যম" },
  { key: "ev", label: "ইংলিশ ভার্সন" },
  { key: "em", label: "ইংলিশ মিডিয়াম" },
  { key: "madrasa", label: "মাদ্রাসা" },
];

export const TUTOR_GENDERS: Option[] = [
  { key: "any", label: "যেকোনো" },
  { key: "male", label: "পুরুষ" },
  { key: "female", label: "মহিলা" },
];

export const SUBJECTS: Option[] = [
  { key: "all", label: "সব বিষয়" },
  { key: "math", label: "গণিত" },
  { key: "science", label: "বিজ্ঞান" },
  { key: "english", label: "ইংরেজি" },
  { key: "bangla", label: "বাংলা" },
  { key: "physics", label: "পদার্থ" },
  { key: "chemistry", label: "রসায়ন" },
  { key: "biology", label: "জীববিজ্ঞান" },
  { key: "hmath", label: "উচ্চতর গণিত" },
  { key: "ict", label: "আইসিটি" },
  { key: "accounting", label: "হিসাববিজ্ঞান" },
  { key: "quran", label: "কুরআন / আরবি" },
  { key: "all-arts", label: "সব বিষয় (মানবিক)" },
  { key: "all-commerce", label: "সব বিষয় (বাণিজ্য)" },
  { key: "bgs", label: "BGS" },
  { key: "islam", label: "ইসলাম শিক্ষা" },
  { key: "economics", label: "অর্থনীতি" },
  { key: "finance", label: "ফিন্যান্স" },
];

export const MODES: Option[] = [
  { key: "home", label: "বাসায় গিয়ে" },
  { key: "online", label: "অনলাইন" },
];

export const STUDENT_GENDERS: Option[] = [
  { key: "boy", label: "ছেলে" },
  { key: "girl", label: "মেয়ে" },
];

export const LEAD_SOURCES: Option[] = [
  { key: "call", label: "ফোন কল" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "facebook", label: "Facebook" },
  { key: "referral", label: "পরিচিত / রেফারেন্স" },
  { key: "old", label: "পুরোনো গার্ডিয়ান" },
  { key: "website", label: "ওয়েবসাইট" },
  { key: "other", label: "অন্যান্য" },
];

// Rajshahi areas, most-requested first (taken from the "Admin Pannel 1" and "Tuition Admin Panel" sheets).
// The Quick Pad shows the first AREAS_TOP as chips; the rest are found by search.
export const AREAS_TOP = 12;
export const AREAS: Option[] = [
  { key: "uposhohor", label: "উপশহর", alt: "Uposhohor Upashahar" },
  { key: "terokhadiya", label: "তেরখাদিয়া", alt: "Terokhadiya" },
  { key: "court-station", label: "কোর্ট স্টেশন", alt: "Court Station" },
  { key: "vodra", label: "ভদ্রা", alt: "Vodra Bhadra" },
  { key: "padma-abashik", label: "পদ্মা আবাসিক", alt: "Padma Residential Podda Abashik" },
  { key: "sopura", label: "সপুরা", alt: "Sopura" },
  { key: "hetem-kha", label: "হেতেম খাঁ", alt: "Hetem Kha" },
  { key: "laxmipur", label: "লক্ষ্মীপুর", alt: "Laxmipur" },
  { key: "binodpur", label: "বিনোদপুর", alt: "Binodpur" },
  { key: "kazla", label: "কাজলা", alt: "Kazla Kajla" },
  { key: "sagarpara", label: "সাগরপাড়া", alt: "Sagarpara Sagorpara" },
  { key: "nowdapara", label: "নওদাপাড়া", alt: "Nowdapara Nawdapara" },
  { key: "shah-makhdum", label: "শাহ মখদুম", alt: "Shah Makhdum Mokhdum" },
  { key: "saheb-bazar", label: "সাহেব বাজার", alt: "Saheb Bazar" },
  { key: "talaimari", label: "তালাইমারী", alt: "Talaimari Talaimary" },
  { key: "bornali", label: "বর্ণালী মোড়", alt: "Bornali Mor" },
  { key: "shalbagan", label: "শালবাগান", alt: "Shalbagan" },
  { key: "kazihata", label: "কাজীহাটা", alt: "Kazihata" },
  { key: "choto-bongram", label: "ছোট বনগ্রাম", alt: "Choto Bongram" },
  { key: "baharampur", label: "বহরমপুর", alt: "Baharampur Bohorompur" },
  { key: "rajpara", label: "রাজপাড়া", alt: "Raj Para Rajpara" },
  { key: "jadughar", label: "জাদুঘর", alt: "Jadughar Museum" },
  { key: "tikapara", label: "টিকাপাড়া", alt: "Tikapara" },
  { key: "rani-bazar", label: "রাণীবাজার", alt: "Rani Bazar" },
  { key: "sadhur-mor", label: "সাধুর মোড়", alt: "Sadhur Mor" },
  { key: "dabtola", label: "ডাবতলা", alt: "Dabtola" },
  { key: "seroil", label: "শিরোইল", alt: "Seroil Shiroil" },
  { key: "veripara", label: "ভেড়িপাড়া", alt: "Veripara Police Line" },
  { key: "kumarpara", label: "কুমারপাড়া", alt: "Kumarpara" },
  { key: "dorikhorbona", label: "দড়িখরবনা (নগর ভবন)", alt: "Dorikhorbona Nagar Bhaban Nagarvaban" },
  { key: "amchattar", label: "আমচত্বর", alt: "Aam Chattar Amchottor" },
  { key: "dashpukur", label: "দাশপুকুর", alt: "Dashpukur" },
  { key: "alupotti", label: "আলুপট্টি", alt: "Alupotti" },
  { key: "kadirganj", label: "কাদিরগঞ্জ", alt: "Kadirganj" },
  { key: "chondrima", label: "চন্দ্রিমা", alt: "Chondrima Chandrima" },
  { key: "pathanpara", label: "পাঠানপাড়া", alt: "Pathanpara" },
  { key: "raipara", label: "রায়পাড়া", alt: "Raipara" },
  { key: "dinggadoba", label: "ডিংগাডোবা", alt: "Dinggadoba Dinga Doba" },
  { key: "ghoshpara", label: "ঘোষপাড়া", alt: "Ghoshpara" },
  { key: "vatapara", label: "ভাটাপাড়া", alt: "Vata Para Bhatapara" },
  { key: "new-market", label: "নিউ মার্কেট", alt: "New Market" },
  { key: "basar-road", label: "বাশার রোড", alt: "Basar Road" },
  { key: "cantonment", label: "ক্যান্টনমেন্ট", alt: "Cantonment" },
  { key: "mohisbathan", label: "মহিষবাথান", alt: "Mohisbathan" },
  { key: "banalata", label: "বনলতা আবাসিক", alt: "Banalata Bonolota" },
  { key: "horogram", label: "হড়গ্রাম", alt: "Horogram" },
  { key: "hadir-mor", label: "হাদির মোড়", alt: "Hadir Mor" },
  { key: "fire-service", label: "ফায়ার সার্ভিস মোড়", alt: "Fire Service More" },
  { key: "city-college", label: "সিটি কলেজ", alt: "City College" },
  { key: "bgb-camp", label: "বিজিবি ক্যাম্প", alt: "BGB Camp School" },
  { key: "malopara", label: "মালোপাড়া", alt: "Malopara" },
  { key: "meherchondi", label: "মেহেরচণ্ডী", alt: "Meherchondi" },
  { key: "baneshwar", label: "বানেশ্বর", alt: "Baneshwar" },
  { key: "durgapur", label: "দুর্গাপুর", alt: "Durgapur" },
  { key: "sonadighi", label: "সোনাদিঘী", alt: "Sonadighi Sonadighir" },
  { key: "alokar", label: "অলকার মোড়", alt: "Alokar Mor" },
  { key: "ruet", label: "রুয়েট", alt: "RUET" },
  { key: "ru-campus", label: "রাজশাহী বিশ্ববিদ্যালয়", alt: "Rajshahi University" },
  { key: "bilsimla", label: "বিলসিমলা", alt: "Bilsimla" },
  { key: "debisingpara", label: "দেবীসিংপাড়া", alt: "Debisingpara" },
  { key: "baliapukur", label: "বালিয়াপুকুর", alt: "Baliapukur" },
  { key: "dorgapara", label: "দরগাপাড়া", alt: "Dorgapara" },
  { key: "shipaipara", label: "সিপাইপাড়া", alt: "Shipaipara" },
  { key: "malda-colony", label: "মালদা কলোনি", alt: "Malda Colony" },
  { key: "chiriakhana", label: "চিড়িয়াখানা", alt: "Chiriakhana" },
  { key: "kedur-mor", label: "কেদুর মোড়", alt: "Kedur Mor" },
  { key: "soshtitola", label: "ষষ্ঠীতলা", alt: "Soshtitola" },
  { key: "mirerchok", label: "মিরেরচক", alt: "Mirerchok" },
  { key: "chowddopai", label: "চৌদ্দপাই", alt: "Chowddopai" },
  { key: "bulonpur", label: "বুলনপুর", alt: "Bulonpur" },
  { key: "bosua", label: "বসুয়া", alt: "Bosua" },
  { key: "ghoramara", label: "ঘোড়ামারা", alt: "Ghoramara" },
];

export const DAYS_PER_WEEK = [2, 3, 4, 5, 6] as const;

export const SALARY_PRESETS = [3000, 4000, 5000, 6000, 8000, 10000] as const;

export const STATUSES: Option[] = [
  { key: "new", label: "নতুন" },
  { key: "searching", label: "টিউটর খোঁজা হচ্ছে" },
  { key: "demo", label: "ডেমো ক্লাস" },
  { key: "confirmed", label: "কনফার্ম" },
  { key: "paid", label: "পেমেন্ট পেয়েছি" },
  { key: "lost", label: "বাদ" },
];

export const labelOf = (list: Option[], key: string | null | undefined) =>
  list.find((o) => o.key === key)?.label ?? key ?? "";
