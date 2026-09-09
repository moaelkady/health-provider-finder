/**
 * Split messy Excel-style phone fields into distinct Egyptian numbers.
 *
 * Source rows often look like: "17121-Whatsapp 01111738511" with a broken
 * normalized value that concatenates everything into one digit string.
 */

const LABEL_RE = /whats\s*app|واتس\s*آ?ب|واتساب|emergency|طوارئ|hotline|هوت\s*لاين|fax|فاكس/gi;

type Match = { start: number; end: number; digits: string };

function collectMatches(text: string, re: RegExp, map?: (m: string) => string | null): Match[] {
  const out: Match[] = [];
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const global = new RegExp(re.source, flags);
  for (const m of text.matchAll(global)) {
    if (m.index == null) continue;
    const captured = m[1] ?? m[0];
    const raw = m[0];
    const digits = map ? map(captured) : captured.replace(/\D/g, "");
    if (!digits) continue;
    const offset = m[1] != null ? raw.indexOf(m[1]) : 0;
    const start = m.index + Math.max(0, offset);
    out.push({ start, end: start + captured.length, digits });
  }
  return out;
}

function overlaps(a: Match, b: Match): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Extract ordered unique phone digit strings from a raw (or normalized) field.
 */
export function extractPhoneDigits(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];

  const text = raw
    .replace(LABEL_RE, " ")
    .replace(/['"`]/g, " ")
    .replace(/[–—_/|,;]+/g, " ")
    .replace(/-/g, " ");

  const candidates: Match[] = [
    // Mobile 01[0125]xxxxxxxx
    ...collectMatches(text, /01[0125]\d{8}/g),
    // Mobile missing leading 0: 1[0125]xxxxxxxx (not already 01…)
    ...collectMatches(text, /(?:^|[^0-9])(1[0125]\d{8})(?!\d)/g, (m) => {
      const d = m.replace(/\D/g, "");
      return d.length === 10 ? `0${d}` : d.length === 11 ? d : null;
    }),
    // Landline with area code: 0[2-9] + 8 digits
    ...collectMatches(text, /0[2-9]\d{8}/g),
    // Short codes / hotlines: 19xxx, 17xxx, 16xxx, 15xxx (4–5 digits starting with 1)
    ...collectMatches(text, /\b1\d{3,4}\b/g),
    // Local landline without area (7–8 digits), only if not part of a longer kept number
    ...collectMatches(text, /\b\d{7,8}\b/g),
  ];

  candidates.sort((a, b) => a.start - b.start || b.digits.length - a.digits.length);

  const accepted: Match[] = [];
  for (const c of candidates) {
    if (accepted.some((a) => overlaps(a, c))) continue;
    // Drop tiny leftovers like "02" / "093" / "0554" that aren't hotlines
    if (c.digits.length <= 3) continue;
    if (c.digits.length <= 6 && !/^1\d{3,4}$/.test(c.digits)) continue;
    accepted.push(c);
  }

  accepted.sort((a, b) => a.start - b.start);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const a of accepted) {
    if (seen.has(a.digits)) continue;
    seen.add(a.digits);
    result.push(a.digits);
  }
  return result;
}

/** Format digits for display in the UI. */
export function formatPhoneDigits(digits: string): string {
  if (digits.length === 11 && digits.startsWith("01")) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith("0")) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 5 || digits.length === 4) {
    return digits; // hotline
  }
  if (digits.length === 8 || digits.length === 7) {
    return digits.replace(/(\d{3,4})(\d{4})/, "$1 $2");
  }
  return digits;
}

/**
 * Expand one source phone row into zero or more display numbers.
 * Always prefers parsing `raw`; falls back to `normalized` only if raw yields nothing.
 */
export function expandSourcePhones(
  entries: Array<{ normalized: string | null; raw: string }>,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of entries) {
    let digitsList = extractPhoneDigits(entry.raw);
    if (!digitsList.length) {
      digitsList = extractPhoneDigits(entry.normalized);
    }
    // Last resort: treat normalized as a single number if it's a plausible length
    if (!digitsList.length && entry.normalized) {
      const d = entry.normalized.replace(/\D/g, "");
      if (d.length >= 4 && d.length <= 12) digitsList = [d];
    }

    for (const digits of digitsList) {
      if (seen.has(digits)) continue;
      seen.add(digits);
      out.push(formatPhoneDigits(digits));
    }
  }

  return out;
}
