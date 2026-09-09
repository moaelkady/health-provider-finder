/** Normalize Arabic/Latin text for tolerant search matching. */
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ً|ٌ|ٍ|َ|ُ|ِ|ّ|ْ|ٰ/g, "")
    .trim();
}
