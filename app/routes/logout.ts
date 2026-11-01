// POST only, so a link on another site can't sign someone out.
import type { Route } from "./+types/logout";
import { signOut } from "~/lib/auth.server";

export async function action({ request }: Route.ActionArgs) {
  return signOut(request);
}
