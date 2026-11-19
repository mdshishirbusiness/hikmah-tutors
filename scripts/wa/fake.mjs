// Sends a synthetic YCloud webhook to the local site, signed with the dev test secret, to try the WhatsApp Inbox
// without a real number (owner, 2026-11-18). Only for `npm run dev:synthetic`; a production build refuses the dev secret.
//
//   node scripts/wa/fake.mjs --text "আসসালামু আলাইকুম, ক্লাস ৮-এর জন্য টিউটর লাগবে"
//   node scripts/wa/fake.mjs --from 8801700000002 --name "Test Guardian 2" --type audio
//   node scripts/wa/fake.mjs --echo --text "আমি কল দিচ্ছি"          (as if the owner replied from the phone app)
//
// All numbers and names are invented (017000000xx).
import { createHmac, randomUUID } from "node:crypto";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith("--") ? [...a, [x.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? "1" : all[i + 1]]] : a), []));
const url = args.url ?? "http://localhost:5174";
const customer = `+${(args.from ?? "8801700000001").replace(/\D/g, "")}`;
const business = "+8801700000099";
const type = args.type ?? "text";
const id = `msg_${randomUUID()}`;

const message = {
  id, wamid: `wamid.${randomUUID()}`, wabaId: "WABA_TEST", type,
  ...(type === "text" ? { text: { body: args.text ?? "আসসালামু আলাইকুম" } } : {}),
  ...(type === "audio" ? { audio: { id: "media_test", mime_type: "audio/ogg" } } : {}),
  ...(type === "image" ? { image: { id: "media_test", mime_type: "image/jpeg", caption: args.text } } : {}),
  sendTime: new Date().toISOString(),
};
const event = args.echo
  ? { id: `evt_${randomUUID()}`, type: "whatsapp.smb.message.echoes", apiVersion: "v2", createTime: new Date().toISOString(), whatsappMessage: { ...message, from: business, to: customer, status: "sent" } }
  : { id: `evt_${randomUUID()}`, type: "whatsapp.inbound_message.received", apiVersion: "v2", createTime: new Date().toISOString(),
      whatsappInboundMessage: { ...message, from: customer, to: business, customerProfile: { name: args.name ?? "Test Guardian" } } };

const body = JSON.stringify(event);
const t = Math.floor(Date.now() / 1000);
const s = createHmac("sha256", "dev-webhook-secret").update(`${t}.${body}`).digest("hex");
const res = await fetch(`${url}/api/wa/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "YCloud-Signature": `t=${t},s=${s}` }, body });
console.log(res.status, await res.text());
