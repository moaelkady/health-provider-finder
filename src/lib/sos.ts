/**
 * SOS helpers: Egypt ambulance dial, phone normalize, WhatsApp deep link.
 */

export const EGYPT_AMBULANCE = "123";
export const SOS_COUNTDOWN_MS = 5000;
export const SOS_MAX_CONTACTS = 5;

export type SosCoords = { lat: number; lng: number };

/** Digits only for wa.me (E.164 without +). Egypt mobiles starting 01… → 20… */
export function normalizeWhatsAppPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    digits = `20${digits.slice(1)}`;
  }

  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

export function buildSosMessage(coords: SosCoords | null): string {
  const lines = [
    "🚨 طلب مساعدة طارئة (SOS)",
    "أحتاج مساعدة فورية الآن. يرجى التواصل معي أو طلب الإسعاف إن أمكن.",
  ];

  if (coords) {
    lines.push("", "موقعي التقريبي:", `https://maps.google.com/?q=${coords.lat},${coords.lng}`);
  } else {
    lines.push("", "تعذر تحديد الموقع تلقائياً — يرجى الاتصال بي.");
  }

  return lines.join("\n");
}

export function buildWhatsAppUrl(phoneDigits: string, message: string): string {
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export function dialAmbulance(): void {
  if (typeof window === "undefined") return;
  window.location.href = `tel:${EGYPT_AMBULANCE}`;
}

export function openWhatsAppSos(phoneDigits: string, coords: SosCoords | null): void {
  if (typeof window === "undefined") return;
  const url = buildWhatsAppUrl(phoneDigits, buildSosMessage(coords));
  window.open(url, "_blank", "noopener,noreferrer");
}
