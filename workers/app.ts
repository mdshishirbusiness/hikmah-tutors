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
} satisfies ExportedHandler<Env>;
