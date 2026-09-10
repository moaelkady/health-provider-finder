/**
 * Phone / WhatsApp / Maps contact helpers for provider CTAs.
 */

import type { Provider } from "@/types/provider";

export function phoneDigits(display: string): string {
  return display.replace(/\D/g, "");
}

/** Digits for wa.me (E.164 without +), or null if not an Egyptian mobile. */
export function whatsappDigits(display: string): string | null {
  let digits = phoneDigits(display);
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("01") && digits.length === 11) {
    return `20${digits.slice(1)}`;
  }
  if (digits.startsWith("201") && digits.length === 12) {
    return digits;
  }
  return null;
}

export function isEgyptianMobile(displayOrDigits: string): boolean {
  return whatsappDigits(displayOrDigits) != null;
}

export function telHref(display: string): string {
  return `tel:${phoneDigits(display)}`;
}

export function whatsappUrl(display: string, message?: string): string | null {
  const digits = whatsappDigits(display);
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function providerPhones(provider: Provider): string[] {
  return provider.contact.phones ?? [];
}

export function providerMobilePhones(provider: Provider): string[] {
  return providerPhones(provider).filter(isEgyptianMobile);
}

export function providerWhatsAppMessage(provider: Provider): string {
  const area = provider.location.area;
  const place = area && area !== "—" ? ` في ${area}` : "";
  return `مرحباً، تواصلت بشأن ${provider.name}${place}`;
}

/** Drop org/legal suffixes in parentheses that hurt Maps search. */
function mapsSearchName(name: string): string {
  return name
    .replace(/\s*[(\uFF08][^)\uFF09]*[)\uFF09]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapsPlacePart(value: string | undefined): string {
  if (!value || value === "—") return "";
  return value.trim();
}

/**
 * Maps text search using Arabic-first display fields:
 * «الاسم، المنطقة، المحافظة» (skip empty / —).
 */
export function mapsSearchUrl(provider: Provider): string {
  const { location } = provider;
  const parts = [
    mapsSearchName(provider.name),
    mapsPlacePart(location.area),
    mapsPlacePart(location.governorate),
  ].filter(Boolean);

  const query = parts.join("، ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Open Maps at stored coordinates, or null if missing. */
export function mapsCoordsUrl(provider: Provider): string | null {
  const coords = provider.location.coordinates;
  if (!coords) return null;
  const query = `${coords.lat},${coords.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function mapsActionLabel(): string {
  return "خرائط جوجل";
}
