import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("tuitions/:code", "routes/tuitions.$code.tsx"),
  route("design", "routes/design.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.ts"),
  route("auth/google", "routes/auth.google.ts"),
  route("auth/google/callback", "routes/auth.google.callback.ts"),
  route("me", "routes/me.tsx"),
  route("admin/quick", "routes/admin.quick.tsx"),
  layout("routes/admin.layout.tsx", [
    route("admin", "routes/admin.home.tsx"),
    route("admin/tuitions", "routes/admin.tuitions.tsx"),
    route("admin/tuitions/:code", "routes/admin.tuitions.$code.tsx"),
    route("admin/tutors", "routes/admin.tutors.tsx"),
    route("admin/tutors/:code", "routes/admin.tutors.$code.tsx"),
    route("admin/guardians", "routes/admin.guardians.tsx"),
    route("admin/guardians/:id", "routes/admin.guardians.$id.tsx"),
    route("admin/applications", "routes/admin.applications.tsx"),
    route("admin/review", "routes/admin.review.tsx"),
    route("admin/leads", "routes/admin.leads.tsx"),
  ]),
  route("api/leads", "routes/api.leads.ts"),
] satisfies RouteConfig;
