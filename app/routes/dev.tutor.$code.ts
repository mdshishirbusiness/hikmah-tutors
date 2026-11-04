// `npm run dev` only: /dev/tutor/99001 signs in as that synthetic test tutor. Answers 404 in a production build.
import type { Route } from "./+types/dev.tutor.$code";
import { devSignInAsTutor } from "~/lib/auth.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  return devSignInAsTutor(request, Number(params.code));
}
