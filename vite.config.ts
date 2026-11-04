import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// `npm run dev:synthetic` (mode "synthetic") runs on the invented data of scripts/synthetic/seed.mjs, kept apart from
// the local copy of the real data in .wrangler/state.
export default defineConfig(({ mode }) => ({
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" }, persistState: mode === "synthetic" ? { path: ".wrangler/synthetic" } : true }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
}));
