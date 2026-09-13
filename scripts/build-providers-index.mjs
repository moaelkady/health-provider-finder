/**
 * Build slim Arabic runtime export from locations.json.
 * Emits Provider-shaped rows + searchBlob/nameNorm for fast client load.
 *
 * Usage: node scripts/build-providers-index.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpDir = path.join(root, "scripts", ".tmp-prepare");
const locationsPath = path.join(root, "public/data/generated/locations.json");
const outPath = path.join(root, "public/data/generated/providers.min.json");

async function main() {
  if (!existsSync(locationsPath)) {
    throw new Error(`Missing ${locationsPath}`);
  }

  mkdirSync(tmpDir, { recursive: true });

  await build({
    configFile: false,
    root,
    logLevel: "warn",
    build: {
      emptyOutDir: true,
      outDir: tmpDir,
      ssr: true,
      lib: {
        entry: path.join(root, "src/data/prepare-providers.ts"),
        formats: ["es"],
        fileName: () => "prepare-providers.js",
      },
      rollupOptions: {
        output: {
          entryFileNames: "prepare-providers.js",
          codeSplitting: false,
        },
      },
      minify: false,
    },
    resolve: {
      alias: {
        "@": path.join(root, "src"),
      },
    },
  });

  const mod = await import(pathToFileURL(path.join(tmpDir, "prepare-providers.js")).href);
  const prepareProvidersFromJson = mod.prepareProvidersFromJson;
  if (typeof prepareProvidersFromJson !== "function") {
    throw new Error("prepareProvidersFromJson not exported from bundle");
  }

  const raw = readFileSync(locationsPath, "utf8");
  console.log(`[build-providers-index] Mapping ${(raw.length / 1024 / 1024).toFixed(1)} MB locations…`);
  const providers = prepareProvidersFromJson(raw, "locations");

  // Drop nothing required for UI; search fields already attached.
  writeFileSync(outPath, JSON.stringify(providers));
  const sizeMb = Buffer.byteLength(JSON.stringify(providers)) / 1024 / 1024;
  console.log(
    `[build-providers-index] Wrote ${providers.length} providers → ${outPath} (${sizeMb.toFixed(2)} MB)`,
  );

  // Slim atlas points: only geocoded rows, compact fields for the hidden map.
  const mapPointsPath = path.join(root, "public/data/generated/map-points.min.json");
  const mapPoints = [];
  for (const p of providers) {
    const c = p.location?.coordinates;
    if (!c || typeof c.lat !== "number" || typeof c.lng !== "number") continue;
    const area = typeof p.location?.area === "string" ? p.location.area.trim() : "";
    const governorate =
      typeof p.location?.governorate === "string" ? p.location.governorate.trim() : "";
    const phone =
      Array.isArray(p.contact?.phones) && typeof p.contact.phones[0] === "string"
        ? p.contact.phones[0].trim()
        : "";
    const point = {
      id: p.id,
      lat: c.lat,
      lng: c.lng,
      name: p.name,
      type: p.type,
    };
    if (area && area !== "—") point.area = area;
    if (governorate && governorate !== "—") point.governorate = governorate;
    if (p.network) point.network = p.network;
    if (p.status) point.status = p.status;
    if (phone) point.phone = phone;
    mapPoints.push(point);
  }
  writeFileSync(mapPointsPath, JSON.stringify(mapPoints));
  const pointsMb = Buffer.byteLength(JSON.stringify(mapPoints)) / 1024 / 1024;
  console.log(
    `[build-providers-index] Wrote ${mapPoints.length} map points → ${mapPointsPath} (${pointsMb.toFixed(2)} MB)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
