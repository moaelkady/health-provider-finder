/**
 * Post-build Workbox injectManifest for TanStack Start.
 * Local Nitro emits to `.output/public`; Vercel preset emits to `.vercel/output/static`.
 * SW generation must run after `vite build`.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import { injectManifest } from "workbox-build";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function resolvePublicOut() {
  const local = path.join(root, ".output", "public");
  const vercel = path.join(root, ".vercel", "output", "static");
  const onVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const candidates = onVercel ? [vercel, local] : [local, vercel];

  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }

  throw new Error(`Missing build output (tried ${candidates.join(", ")}). Run vite build first.`);
}

function revisionFor(filePath) {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

async function main() {
  const publicOut = resolvePublicOut();
  console.log(`[generate-sw] Using public output: ${path.relative(root, publicOut)}`);

  await build({
    configFile: false,
    root,
    build: {
      emptyOutDir: false,
      outDir: publicOut,
      lib: {
        entry: path.join(root, "src/sw.ts"),
        name: "sw",
        formats: ["es"],
        fileName: () => "sw.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "sw.js",
          codeSplitting: false,
        },
      },
      minify: true,
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  });

  // Do not precache provider JSON (multi‑MB) — runtime CacheFirst fills after first fetch.
  // meta.json is tiny and lets clients detect data revisions quickly when online.
  const dataFiles = ["data/generated/meta.json"];

  const additionalManifestEntries = dataFiles
    .map((rel) => {
      const abs = path.join(publicOut, rel);
      if (!existsSync(abs)) return null;
      return {
        url: `/${rel}`,
        revision: revisionFor(abs),
      };
    })
    .filter(Boolean);

  const { count, size, warnings } = await injectManifest({
    swSrc: path.join(publicOut, "sw.js"),
    swDest: path.join(publicOut, "sw.js"),
    globDirectory: publicOut,
    globPatterns: ["**/*.{js,css,woff2,png,ico,svg,webmanifest,html}", "icons/**/*", "fonts/**/*"],
    globIgnores: ["**/sw.js", "**/workbox-*.js", "**/data/generated/**"],
    maximumFileSizeToCacheInBytes: 2 * 1024 * 1024,
    additionalManifestEntries,
  });

  for (const warning of warnings) {
    console.warn("[generate-sw]", warning);
  }
  console.log(
    `[generate-sw] Precached ${count} files (glob ${(size / 1024 / 1024).toFixed(2)} MB; provider JSON via runtime CacheFirst)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
