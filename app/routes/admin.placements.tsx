import type { Route } from "./+types/admin.placements";
import { requireAdmin } from "~/lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  await requireAdmin(request);
  return null;
}

export default function Page() {
  return null;
}
