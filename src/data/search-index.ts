import { normalize } from "@/lib/normalize-text";
import type { Provider } from "@/types/provider";

/** Build searchable haystack once per provider (used at prepare time). */
export function buildSearchBlob(provider: Provider): string {
  return normalize(
    [
      provider.name,
      provider.type,
      provider.organization?.name ?? "",
      provider.location.address,
      provider.location.area,
      provider.location.governorate,
      ...provider.specialties.map((s) => s.name),
      ...provider.services.map((s) => s.name),
    ].join(" "),
  );
}

/** Attach searchBlob + nameNorm if missing (idempotent). */
export function attachSearchIndex(provider: Provider): Provider {
  if (provider.searchBlob && provider.nameNorm) return provider;
  return {
    ...provider,
    nameNorm: provider.nameNorm ?? normalize(provider.name),
    searchBlob: provider.searchBlob ?? buildSearchBlob(provider),
  };
}

export function indexProviders(providers: Provider[]): Provider[] {
  return providers.map(attachSearchIndex);
}
