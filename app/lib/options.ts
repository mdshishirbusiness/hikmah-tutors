// Choices shown as tap-chips on the Quick Pad. The database stores the `key`, so a label can be reworded at any time.
// Keep keys short, lowercase and never change one that is already in use.

export type Option = { key: string; label: string; alt?: string }; // alt: English spelling, used by search

export const CLASS_LEVELS: Option[] = [
  { key: "c1-5", label: "১ম–৫ম" },
  { key: "c6-8", label: "৬ষ্ঠ–৮ম" },
  { key: "ssc", label: "৯ম–১০ম (SSC)" },
  { key: "hsc", label: "একাদশ–দ্বাদশ (HSC)" },
  { key: "admission", label: "ভর্তি প্রস্তুতি" },
  { key: "olevel", label: "O Level" },
  { key: "alevel", label: "A Level" },
  { key: "other", label: "অন্যান্য" },
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
