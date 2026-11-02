// Builds the two Google Forms of the Premium pilot (rules: docs/DECISIONS.md, 2026-10-28 and 2026-10-29).
// Paste into the "Hikmah Premium Form" project at script.google.com and run buildPremiumForm or buildPaymentForm.
// Each run replaces the form's questions, so it is safe to run again after a change.
//
// 1. Application (buildPremiumForm): no money yet. HTR reviews within 24 hours and tells selected tutors on WhatsApp.
// 2. Payment confirmation (buildPaymentForm): only for selected tutors, after they send the deposit.
//
// Theme and header image are set by hand in each form (header: design/forms/premium-header.png). The application's
// voice note (audio, 1 file, 10 MB) and teaching material (PDF/image/Document, 5 files, 10 MB) questions are file
// uploads, which Apps Script cannot create: they were added by hand, both optional. Runs keep them, move them under
// the experience question and set their titles and help texts from UPLOADS.

const FORM_ID = "1Cb6TTZEd6iEldCsAyE8YzhQnoN3gt5dl8nzBoPkRiKY";
const PAYMENT_FORM_ID = "1FTbeAjNSgwfhV68Eh2-0oGA3dveuhzQ64ClFg14mKhc"; // empty = next run creates a new one
const PAY_NUMBER = "01845359242"; // personal bKash/Nagad/Rocket number: Send Money or Cash In
const HELP_NUMBER = "01522136687"; // admin WhatsApp
const HELP_LINK = "https://wa.me/88" + HELP_NUMBER;
const HELP_LINE = "সাহায্য লাগলে WhatsApp করুন: " + HELP_NUMBER;
const VIDEO_URL = ""; // YouTube link for the intro video, added at the top once it exists
const TERMS_VERSION = "v1, ২৯ অক্টোবর ২০২৬";
const PHONE = "^01[3-9][0-9]{8}$";

// Choices mirror app/lib/options.ts
const SUBJECTS = [
  "গণিত", "বিজ্ঞান", "ইংরেজি", "বাংলা", "পদার্থ", "রসায়ন", "জীববিজ্ঞান", "উচ্চতর গণিত", "আইসিটি", "হিসাববিজ্ঞান",
  "কুরআন / আরবি",
];
const CLASS_LEVELS = ["১ম–৫ম", "৬ষ্ঠ–৮ম", "৯ম–১০ম (SSC)", "একাদশ–দ্বাদশ (HSC)", "ভর্তি প্রস্তুতি", "O Level", "A Level"];
const MEDIUMS = ["বাংলা মাধ্যম", "ইংলিশ ভার্সন", "ইংলিশ মিডিয়াম", "মাদ্রাসা"];
const EXPERIENCE = ["এখনো শুরু করিনি", "১ বছরের কম", "১–২ বছর", "৩–৪ বছর", "৫ বছর বা বেশি"];

// The hand-made upload questions, in form order
const UPLOADS = [
  {
    title: "Voice note: আপনি কীভাবে পড়ান",
    help:
      "ঐচ্ছিক, তবে দিলে আপনাকে আরও উপযুক্ত টিউশনে মেলানো সহজ হবে। ৩–৫ মিনিটে বলুন: কীভাবে পড়ান, কোন বিষয়ে কেন দক্ষ, " +
      "আর একটি কঠিন বিষয় কীভাবে বোঝান। ফোনের Voice Recorder দিয়ে রেকর্ড করে এখানে দিন। শুধু Hikmah টিম শুনবে।",
  },
  {
    title: "আপনার তৈরি শিট, নোট বা প্রশ্নপত্র",
    help:
      "ঐচ্ছিক। নিজের তৈরি শিট, ক্লাস নোট বা ছাত্রছাত্রীদের জন্য বানানো প্রশ্নপত্র দিন (PDF, ছবি বা Document, সর্বোচ্চ ৫টি)। " +
      "খাতায় ছাত্রছাত্রীর নাম বা ফোন নম্বর থাকলে ঢেকে দিন। শুধু Hikmah টিম দেখবে।",
  },
];

// Bold cannot be set from Apps Script, and every run wipes it. After a run, make these bold by hand in the form
// editor (select, Ctrl+B).
const BOLD = {
  intro: ["Premium-এ যা পাবেন", "অগ্রাধিকার", "কম মিডিয়া ফি", "বাড়তি খরচ নেই", "টাকা নিরাপদ", "সবসময় পাশে",
    "জমার পরিমাণ", "কীভাবে শুরু করবেন", "এখন কোনো টাকা লাগবে না।", "পুরো টাকা ফেরত (first)", HELP_NUMBER + " (first)"],
  weDo: ["পুরো টাকা ফেরত"],
  ifProblem: ["প্রথমে আপনার সঙ্গে কথা বলব"],
  money: ["৯০ দিন পূর্ণ হওয়ার আগে টাকা ফেরতের অনুরোধ করা যাবে না।"],
  skills: ["সর্বোচ্চ ৩টি (both)"],
  paymentForm: ["কীভাবে টাকা পাঠাবেন", PAY_NUMBER, "Send Money বা Cash In", HELP_NUMBER + " (first)"],
};

const INTRO = [
  "রাজশাহীর টিউটরদের জন্য Hikmah Tutors-এর Premium সেবা। আপনার দক্ষতা অনুযায়ী টিউশন খুঁজে দেওয়ার দায়িত্ব আমাদের। " +
    "৯০ দিনে না পারলে পুরো টাকা ফেরত।",
  "",
  "Premium-এ যা পাবেন",
  "✅ অগ্রাধিকার: আপনার এলাকা ও বিষয়ের টিউশন এলে, সমান যোগ্যদের মধ্যে আপনার প্রোফাইল আগে অভিভাবকের কাছে যাবে।",
  "✅ কম মিডিয়া ফি: সাধারণ নিয়মে প্রথম মাসের বেতনের ৬০%, Premium-এ ৫০%।",
  "✅ বাড়তি খরচ নেই: জমা দেওয়া টাকা আপনার মিডিয়া ফি থেকেই কাটা হবে।",
  "✅ টাকা নিরাপদ: ৯০ দিনে টিউশন দিতে না পারলে পুরো টাকা ফেরত।",
  "✅ সবসময় পাশে: অভিভাবকের সঙ্গে কোনো সমস্যা, বেতন বা নিরাপত্তা, যেকোনো বিষয়ে আমাদের টিম আপনার পাশে থাকবে।",
  "",
  "জমার পরিমাণ",
  "আপনার ন্যূনতম প্রত্যাশিত মাসিক বেতনের অর্ধেক। যেমন: ৳৩,০০০ হলে ৳১,৫০০, ৳৪,০০০ হলে ৳২,০০০, ৳৫,০০০ হলে ৳২,৫০০।",
  "",
  "কীভাবে শুরু করবেন",
  "১. এই আবেদনটি পূরণ করুন। এখন কোনো টাকা লাগবে না।",
  "২. ২৪ ঘণ্টার মধ্যে আমরা আবেদন দেখে WhatsApp-এ জানাব।",
  "৩. নির্বাচিত হলে টাকা পাঠিয়ে পেমেন্ট নিশ্চিত করবেন। টাকা যাচাইয়ের দিন থেকে ৯০ দিন শুরু।",
  "",
  "📞 ফর্ম পূরণের যেকোনো ধাপে প্রশ্ন থাকলে WhatsApp করুন: " + HELP_NUMBER,
  HELP_LINK,
].join("\n");

const WE_DO = [
  "• আপনার এলাকা, শ্রেণি, বিষয় ও বেতনের সঙ্গে মেলে এমন টিউশন খুঁজব, আর আপনাকে অগ্রাধিকার দেব।",
  "• ডেমো ক্লাস থেকে প্রথম বেতন পর্যন্ত প্রতিটি ধাপে আপনার সঙ্গে যোগাযোগ রাখব। অভিভাবকের সঙ্গে কোনো সমস্যা হলে " +
    "আমরা আপনার হয়ে কথা বলব।",
  "• ৯০ দিনে টিউশন না হলে আমরাই যোগাযোগ করব। আপনি বেছে নেবেন: পুরো টাকা ফেরত, অথবা আরও ৯০ দিন।",
  "• টাকা ফেরত দেব ৭ দিনের মধ্যে, যে নম্বর থেকে পাঠিয়েছেন সেখানে। পাঠানোর খরচ আমাদের।",
  "• আপনার তথ্য, voice note ও কাগজপত্র শুধু Hikmah টিম দেখবে।",
].join("\n");

const YOU_DO = [
  "• ফোন বা WhatsApp-এ ১২ ঘণ্টার মধ্যে সাড়া দেবেন (সকাল ৯টা থেকে রাত ১০টা)।",
  "• আপনার দেওয়া এলাকা, শ্রেণি, বিষয় ও ন্যূনতম বেতনের সঙ্গে মেলে এমন টিউশন গ্রহণ করবেন। " +
    "এর চেয়ে কম বেতনের টিউশন নেওয়া পুরোপুরি আপনার ইচ্ছা।",
  "• ডেমো ক্লাসে সময়মতো যাবেন। যেতে না পারলে অন্তত ৬ ঘণ্টা আগে জানাবেন।",
  "• অন্য কোথাও টিউশন পেলে আমাদের জানাবেন।",
].join("\n");

const IF_PROBLEM = [
  "• কোনো দায়িত্ব পালনে সমস্যা হলে আমরা প্রথমে আপনার সঙ্গে কথা বলব এবং লিখিতভাবে WhatsApp-এ জানাব।",
  "• একই ধরনের সমস্যা তিনবার হলে Premium শেষ হবে, তখন জমার অর্ধেক ফেরত দেওয়া হবে। না জানিয়ে ডেমো ক্লাসে না যাওয়া " +
    "বা ৩০ মিনিটের বেশি দেরি দুবার হিসেবে গোনা হবে।",
  "• অভিভাবক বা ছাত্রছাত্রীর সঙ্গে অসদাচরণ, বা যোগ্যতা নিয়ে ভুল তথ্য দিলে Premium সঙ্গে সঙ্গে বাতিল হবে এবং টাকা " +
    "ফেরত দেওয়া হবে না।",
  "• অভিভাবক অন্য কাউকে বেছে নিলে সেটা আপনার ব্যর্থতা নয়। আমাদের চেষ্টা চলতে থাকবে।",
].join("\n");

const MONEY = [
  "• Premium সফল ধরা হবে, যখন আমাদের দেওয়া টিউশন থেকে আপনি প্রথম মাসের বেতন পাবেন।",
  "• মিডিয়া ফি প্রথম মাসের বেতনের ৫০%। জমা টাকা বাদ দিয়ে বাকিটা প্রথম বেতন পাওয়ার ৭ দিনের মধ্যে দেবেন। " +
    "উদাহরণ: জমা ৳১,৫০০, বেতন ৳৪,০০০, ফি ৳২,০০০, বাকি ৳৫০০।",
  "• ন্যূনতমের চেয়ে কম বেতনের টিউশন নিলে বাড়তি জমা টাকা প্রথম বেতনের পর ফেরত দেওয়া হবে।",
  "• ৯০ দিন পূর্ণ হওয়ার আগে টাকা ফেরতের অনুরোধ করা যাবে না। তবে আমরা নিজেরা Premium বন্ধ করলে পুরো টাকা সঙ্গে সঙ্গে ফেরত।",
  "• টিউশনে যোগ দেওয়ার পর প্রথম বেতনের আগে নিজে ছেড়ে দিলে Premium পূরণ হয়েছে ধরা হবে, যদি না কারণ অভিভাবকের " +
    "অসদাচরণ বা নিরাপত্তা হয়। অভিভাবক প্রথম বেতন না দিয়ে টিউশন বন্ধ করলে আমাদের চেষ্টা চলবে।",
  "• Premium অন্য কাউকে হস্তান্তর করা যাবে না।",
].join("\n");

function buildPremiumForm() {
  const form = FormApp.openById(FORM_ID);
  const uploads = form.getItems(FormApp.ItemType.FILE_UPLOAD);
  form.getItems()
    .filter((item) => item.getType() !== FormApp.ItemType.FILE_UPLOAD)
    .forEach((item) => form.deleteItem(item));

  form.setTitle("Hikmah Tutors Premium: আবেদন");
  form.setDescription(INTRO);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    "আপনার আবেদন আমরা পেয়েছি, ধন্যবাদ। ২৪ ঘণ্টার মধ্যে WhatsApp-এ জানাব। কোনো প্রশ্ন থাকলে WhatsApp করুন: " + HELP_NUMBER
  );

  // Page 1: why Premium, then the terms as promises on both sides
  if (VIDEO_URL) form.addVideoItem().setTitle("২ মিনিটে Premium").setVideoUrl(VIDEO_URL);
  form.addSectionHeaderItem().setTitle("আমাদের প্রতিশ্রুতি").setHelpText(WE_DO);
  form.addSectionHeaderItem().setTitle("আপনার কাছে আমাদের প্রত্যাশা").setHelpText(YOU_DO);
  form.addSectionHeaderItem().setTitle("কোনো সমস্যা হলে").setHelpText(IF_PROBLEM);
  form.addSectionHeaderItem().setTitle("টাকার হিসাব").setHelpText(MONEY);
  form.addCheckboxItem()
    .setTitle("শর্তাবলি (" + TERMS_VERSION + ")")
    .setChoiceValues(["আমি ওপরের সব শর্ত পড়েছি এবং মেনে নিচ্ছি"])
    .setRequired(true);

  // Page 2: who the tutor is; the rest of the profile is already in the Registration sheet
  form.addPageBreakItem()
    .setTitle("আপনার পরিচয়")
    .setHelpText("Hikmah-এ registration করা টিউটররাই Premium-এর জন্য আবেদন করতে পারবেন। " + HELP_LINE);
  form.addTextItem()
    .setTitle("Registration Code")
    .setHelpText("Registration-এর পর যে কোড পেয়েছিলেন")
    .setRequired(true);
  form.addTextItem()
    .setTitle("Registration-এর মোবাইল নম্বর")
    .setHelpText("কোড মিলিয়ে দেখার জন্য। ইংরেজি অঙ্কে ১১ সংখ্যা, যেমন 01712345678")
    .setValidation(phoneValidation())
    .setRequired(true);
  form.addTextItem()
    .setTitle("ন্যূনতম প্রত্যাশিত মাসিক বেতন (৳)")
    .setHelpText("নির্বাচিত হলে এর অর্ধেক জমা দেবেন। এর চেয়ে কম বেতনের টিউশন নেওয়া আপনার ইচ্ছা।")
    .setValidation(minimumNumber(1000, "3000"))
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle("এলাকা, শ্রেণি বা বিষয়ে কিছু বদলাতে চান?")
    .setHelpText("ফাঁকা রাখলে registration-এর তথ্যই ধরা হবে।");

  // Page 3: what the tutor is best at right now (Registration lists everything they can teach)
  form.addPageBreakItem()
    .setTitle("আপনার দক্ষতা")
    .setHelpText("যেগুলোতে আপনি এই মুহূর্তে সবচেয়ে দক্ষ, শুধু সেগুলো বাছুন। " + HELP_LINE);
  form.addCheckboxItem()
    .setTitle("কোন বিষয়ে আপনি সবচেয়ে দক্ষ?")
    .setHelpText("সর্বোচ্চ ৩টি")
    .setChoiceValues(SUBJECTS)
    .showOtherOption(true)
    .setValidation(atMostThree())
    .setRequired(true);
  form.addCheckboxItem()
    .setTitle("কোন শ্রেণিতে সবচেয়ে ভালো পড়ান?")
    .setHelpText("সর্বোচ্চ ৩টি")
    .setChoiceValues(CLASS_LEVELS)
    .setValidation(atMostThree())
    .setRequired(true);
  form.addCheckboxItem().setTitle("কোন মাধ্যমে পড়ান?").setChoiceValues(MEDIUMS).setRequired(true);
  const experience = form.addMultipleChoiceItem()
    .setTitle("কত দিন ধরে টিউশন করাচ্ছেন?")
    .setChoiceValues(EXPERIENCE)
    .setRequired(true);
  form.addParagraphTextItem()
    .setTitle("আপনার পড়ানোর ধরন")
    .setHelpText("ঐচ্ছিক। voice note না দিলে ২–৩ লাইনে লিখুন: কীভাবে পড়ান, ছাত্রছাত্রীর উন্নতি কীভাবে দেখেন।");
  uploads.forEach((item, i) => {
    if (UPLOADS[i]) item.setTitle(UPLOADS[i].title).setHelpText(UPLOADS[i].help);
  });
  // Last upload first, so each lands right under the experience question and their order is kept
  uploads.reverse().forEach((item) => form.moveItem(item, experience.getIndex()));
}

function buildPaymentForm() {
  let form;
  if (PAYMENT_FORM_ID) {
    form = FormApp.openById(PAYMENT_FORM_ID);
    form.getItems().forEach((item) => form.deleteItem(item));
  } else {
    form = FormApp.create("Hikmah Tutors Premium: পেমেন্ট নিশ্চিতকরণ");
    form.setAcceptingResponses(false); // a new form is live at once; the owner opens it after checking it
    Logger.log("Payment form ID: " + form.getId() + "  edit: " + form.getEditUrl());
  }

  form.setTitle("Hikmah Tutors Premium: পেমেন্ট নিশ্চিতকরণ");
  form.setDescription([
    "Premium-এ নির্বাচিত হওয়ার বার্তা পেলে এই ফর্মটি পূরণ করুন।",
    "",
    "কীভাবে টাকা পাঠাবেন",
    "bKash, Nagad বা Rocket-এর Personal নম্বর " + PAY_NUMBER + "-এ Send Money বা Cash In করুন।",
    "পরিমাণ: আপনার ন্যূনতম প্রত্যাশিত মাসিক বেতনের অর্ধেক, যা আমরা WhatsApp-এ জানিয়েছি।",
    "",
    "টাকা যাচাই হলে WhatsApp-এ জানাব। সেদিন থেকে আপনার ৯০ দিন শুরু।",
    "",
    "📞 কোনো প্রশ্ন থাকলে WhatsApp করুন: " + HELP_NUMBER,
    HELP_LINK,
  ].join("\n"));
  form.setConfirmationMessage(
    "ধন্যবাদ। টাকা যাচাই করে WhatsApp-এ জানাব। কোনো প্রশ্ন থাকলে WhatsApp করুন: " + HELP_NUMBER
  );

  form.addTextItem().setTitle("Registration Code").setRequired(true);
  form.addTextItem()
    .setTitle("Registration-এর মোবাইল নম্বর")
    .setHelpText("ইংরেজি অঙ্কে ১১ সংখ্যা, যেমন 01712345678")
    .setValidation(phoneValidation())
    .setRequired(true);
  form.addTextItem()
    .setTitle("কত টাকা পাঠিয়েছেন (৳)")
    .setValidation(minimumNumber(500, "1500"))
    .setRequired(true);
  form.addMultipleChoiceItem().setTitle("কোন মাধ্যমে?").setChoiceValues(["bKash", "Nagad", "Rocket"]).setRequired(true);
  form.addMultipleChoiceItem().setTitle("কীভাবে পাঠিয়েছেন?").setChoiceValues(["Send Money", "Cash In"]).setRequired(true);
  form.addTextItem()
    .setTitle("যে নম্বর থেকে পাঠিয়েছেন")
    .setHelpText("টাকা ফেরত দিতে হলে এই নম্বরেই যাবে। Cash In করলে আপনার নিজের নম্বর দিন।")
    .setValidation(phoneValidation())
    .setRequired(true);
  form.addTextItem().setTitle("Transaction ID").setRequired(true);
  form.addDateTimeItem().setTitle("কখন পাঠিয়েছেন?").setRequired(true);
}

function atMostThree() {
  return FormApp.createCheckboxValidation()
    .requireSelectAtMost(3)
    .setHelpText("সর্বোচ্চ ৩টি বাছুন")
    .build();
}

function minimumNumber(min, example) {
  return FormApp.createTextValidation()
    .requireNumberGreaterThanOrEqualTo(min)
    .setHelpText("ইংরেজি অঙ্কে শুধু সংখ্যা লিখুন, যেমন " + example)
    .build();
}

function phoneValidation() {
  return FormApp.createTextValidation()
    .requireTextMatchesPattern(PHONE)
    .setHelpText("ইংরেজি অঙ্কে ১১ সংখ্যার নম্বর দিন, যেমন 01712345678")
    .build();
}
