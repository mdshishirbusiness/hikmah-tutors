import { redirect } from "react-router";
import type { Route } from "./+types/auth.google.callback";
import { finishGoogleSignIn, googleConfigured } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  if (!googleConfigured()) return redirect("/login?error=2");
  return finishGoogleSignIn(request);
}
