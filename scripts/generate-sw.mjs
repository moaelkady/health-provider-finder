/**
 * Post-build Workbox injectManifest for TanStack Start.
 * Vite/Nitro emit assets to `.output/public`; SW generation must run after that.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "vite";
import { injectManifest } from "workbox-build";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicOut = path.join(root, ".output", "public");

function revisionFor(filePath) {
  const buf = readFileSync(filePath);
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

async function main() {
  if (!existsSync(publicOut)) {
    throw new Error(`Missing build output at ${publicOut}. Run vite build first.`);
  }

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

  // Large JSON is excluded from globPatterns; add with content-hash revisions.
  const dataFiles = [
    "data/generated/locations.json",
    "data/generated/meta.json",
    "data/generated/organizations.json",
  ];

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
    globPatterns: [
      "**/*.{js,css,woff2,png,ico,svg,webmanifest,html}",
      "icons/**/*",
      "fonts/**/*",
    ],
    globIgnores: ["**/sw.js", "**/workbox-*.js"],
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
    additionalManifestEntries,
  });

  for (const warning of warnings) {
    console.warn("[generate-sw]", warning);
  }
  console.log(
    `[generate-sw] Precached ${count} files (glob ${(size / 1024 / 1024).toFixed(2)} MB + data JSON)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
