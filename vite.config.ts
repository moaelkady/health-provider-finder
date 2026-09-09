import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type UserConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const phoneDev = process.env["VITE_PHONE_DEV"] === "1";

// Same phone HTTPS shape as capture-verify (`https: true` + basicSsl).
// Cast: Vite 8 types expect HttpsServerOptions, not boolean `true`.
const phoneServer = {
  https: true,
  host: true,
  allowedHosts: true,
  headers: {
    "Permissions-Policy": "geolocation=(self)",
  },
} as unknown as NonNullable<UserConfig["server"]>;

export default defineConfig({
  ...(phoneDev ? { server: phoneServer } : {}),
  plugins: [
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts.
      server: { entry: "server" },
    }),
    viteReact(),
    tailwindcss(),
    nitro(),
    // Manifest is static at public/manifest.webmanifest.
    // SW is built post-vite via scripts/generate-sw.ts because TanStack Start's
    // SSR build is incompatible with vite-plugin-pwa's SW closeBundle hook.
    ...(phoneDev ? [basicSsl()] : []),
  ],
});
