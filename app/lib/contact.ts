// HTR's public contact number, shown on every page (docs/DECISIONS.md 2026-10-29: admin WhatsApp).
// A business number, not a tutor's or guardian's; change it here only.
export const CONTACT = {
  whatsapp: "01522136687",
  call: "01522136687",
  // Premium payments (docs/DECISIONS.md 2026-10-29, 2026-11-05): a personal number, so Send Money or Cash In, not Payment.
  pay: "01845359242",
};

/** Where Premium money can be sent from, all to CONTACT.pay (owner, 2026-11-05: Rocket too). */
export const PAY_METHODS: Record<string, string> = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket" };

const intl = (phone: string) => {
  const n = phone.replace(/\D/g, "");
  return n.startsWith("880") ? n : `88${n}`;
};

export const waLink = (phone: string, text: string) => `https://wa.me/${intl(phone)}?text=${encodeURIComponent(text)}`;
export const telLink = (phone: string) => `tel:+${intl(phone)}`;
