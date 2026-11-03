// HTR's public contact number, shown on every page (docs/DECISIONS.md 2026-10-29: admin WhatsApp).
// A business number, not a tutor's or guardian's; change it here only.
export const CONTACT = {
  whatsapp: "01522136687",
  call: "01522136687",
};

const intl = (phone: string) => {
  const n = phone.replace(/\D/g, "");
  return n.startsWith("880") ? n : `88${n}`;
};

export const waLink = (phone: string, text: string) => `https://wa.me/${intl(phone)}?text=${encodeURIComponent(text)}`;
export const telLink = (phone: string) => `tel:+${intl(phone)}`;
