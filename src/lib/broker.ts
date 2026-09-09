/**
 * Fixed insurance broker contact (أمان ليك / amanleek).
 */

export const BROKER = {
  nameAr: "امان ليك",
  nameEn: "amanleek",
  phoneDisplay: "011 0090 7169",
  phoneDigits: "01100907169",
  whatsappDigits: "201100907169",
} as const;

export function brokerTelHref(): string {
  return `tel:${BROKER.phoneDigits}`;
}

export function brokerWhatsAppUrl(
  message = "مرحباً، أحتاج مساعدة من أمان ليك",
): string {
  const base = `https://wa.me/${BROKER.whatsappDigits}`;
  if (!message.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}
