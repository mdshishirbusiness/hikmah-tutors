// The old apply page's address (owner, 2026-11-09: one apply window). Links in old WhatsApp messages and saved pages
// land on the tuition's window, which has the fit, the note and Apply.
import { redirect } from "react-router";
import type { Route } from "./+types/tuitions.$code.apply";

export function loader({ params }: Route.LoaderArgs) {
  throw redirect(`/tuitions/${params.code}`);
}

export { action } from "./tuitions.$code";
