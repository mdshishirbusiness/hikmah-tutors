import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("admin/quick", "routes/admin.quick.tsx"),
  route("admin/leads", "routes/admin.leads.tsx"),
  route("api/leads", "routes/api.leads.ts"),
] satisfies RouteConfig;
