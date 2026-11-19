import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request) {
    // One address: sign-in cookies and the Google callback live on the bare domain only.
    const url = new URL(request.url);
    if (url.hostname === "www.hikmahtutor.com") {
      url.hostname = "hikmahtutor.com";
      return Response.redirect(url.toString(), 301);
    }
    return requestHandler(request);
  },

  // WhatsApp Inbox (owner, 2026-11-18): every 5 minutes, chats with no reply for 30 minutes alert the owner; at 22:00
  // Dhaka (16:00 UTC) the day's summary email and the retention clean-up. Crons are in wrangler.jsonc.
  async scheduled(controller, _env, ctx) {
    const alerts = await import("../app/lib/alerts.server");
    ctx.waitUntil(controller.cron === "0 16 * * *" ? alerts.nightly() : alerts.checkUnanswered());
  },
} satisfies ExportedHandler<Env>;
