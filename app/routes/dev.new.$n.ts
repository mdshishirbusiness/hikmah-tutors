// `npm run dev` only: /dev/new/1 signs in as a new Google account with no tutor record. Answers 404 in a production build.
import type { Route } from "./+types/dev.new.$n";
import { devSignInAsNewUser } from "~/lib/auth.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  return devSignInAsNewUser(request, Number(params.n));
}
