// `npm run dev` only: /dev/staff/1 signs in as a synthetic moderator with the default switches. 404 in production.
import type { Route } from "./+types/dev.staff.$n";
import { devSignInAsStaff } from "~/lib/auth.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  return devSignInAsStaff(request, Number(params.n));
}
