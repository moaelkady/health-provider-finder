/**
 * Maps generated locations onto the app `Provider` model.
 *
 * Arabic fields are preferred; English is used only as fallback.
 */

import { expandSourcePhones } from "@/lib/parse-phones";
import type {
  LocationPrecision,
  NetworkTier,
  Provider,
  ProviderStatus,
} from "@/types/provider";

export type GeneratedLocation = {
  id: string;
  organizationId: string;
  organization: {
    id: string;
    providerKey: string | null;
    nameAr: string | null;
    nameEn: string | null;
  };
  externalRef: string | null;
  nameAr: string | null;
  nameEn: string | null;
  providerTypeAr: string | null;
  providerTypeEn: string | null;
  addressAr: string | null;
  addressEn: string | null;
  areaAr: string | null;
  areaEn: string | null;
  governorateAr: string | null;
  governorateEn: string | null;
  mainBranch: string;
  networkType: string | null;
  orientGn: boolean | null;
  pulseStatus: string | null;
  isActive: boolean;
  phones: Array<{ normalized: string | null; raw: string }>;
  emails: Array<{ normalized: string | null; raw: string }>;
  services: Array<{ slug: string; labelEn: string; labelAr: string | null }>;
  specialties: Array<{
    slug: string;
    labelEn: string | null;
    labelAr: string | null;
  }>;
  location: {
    latitude: number | null;
    longitude: number | null;
    geocodingStatus: string | null;
    formattedAddress: string | null;
    geocodingSource: string | null;
  };
};

function pickName(...candidates: Array<string | null | undefined>): string {
  for (const value of candidates) {
    if (value && value.trim()) return value.trim();
  }
  return "مقدم خدمة غير معروف";
}

/** Fallback Arabic labels when generated JSON has null labelAr. */
const SERVICE_AR: Record<string, string> = {
  outpatient: "عيادات خارجية",
  inpatient: "إقامة داخلية",
  er: "طوارئ",
  isolation: "عزل",
  "audiometry-devices": "أجهزة قياس السمع",
  multidisciplinary: "متعدد التخصصات",
};

const SPECIALTY_AR: Record<string, string> = {
  "spine-surgery": "جراحة العمود الفقري",
  catheters: "قسطرة",
  nose: "أنف",
  throat: "حنجرة",
  gastroenterology: "الجهاز الهضمي",
  psychiatry: "طب نفسي",
  gynecology: "نساء وتوليد",
  surgery: "جراحة",
  "renal-dialysis": "غسيل كلوي",
  endoscopy: "مناظير",
  "sleep-medicine": "طب النوم",
  "pain-management": "علاج الألم",
  "ent-in-patient-only": "أنف وأذن وحنجرة (داخلي فقط)",
  neonates: "حديثي الولادة",
  "kidney-diseases": "أمراض الكلى",
  gyna: "نساء",
  "plastic-surgery": "جراحة تجميل",
  endocrinology: "غدد صماء",
  diabetes: "سكر",
  "digestive-system-and-diabetes": "جهاز هضمي وسكر",
  orthopedics: "عظام",
  dentistry: "طب الأسنان",
  cardiology: "قلب",
  dermatology: "جلدية",
  pediatrics: "أطفال",
  ophthalmology: "عيون",
};

function mapNetwork(networkType: string | null): NetworkTier {
  switch ((networkType ?? "").toUpperCase()) {
    case "GN":
      return "الشبكة المفضلة";
    case "EN":
      return "خارج الشبكة";
    case "RN":
    default:
      return "ضمن الشبكة";
  }
}

function mapStatus(pulseStatus: string | null, isActive: boolean): ProviderStatus {
  if (!isActive) return "موقوف";
  const status = (pulseStatus ?? "").toUpperCase();
  if (status === "LIVE") return "نشط";
  return "قيد التفعيل";
}

function mapPrecision(
  geocodingStatus: string | null,
  hasCoords: boolean,
): LocationPrecision {
  if (!hasCoords) return "unresolved";
  if (geocodingStatus === "geocoded") return "exact";
  if (geocodingStatus === "approximate") return "approximate";
  return "unresolved";
}

export function mapGeneratedLocation(row: GeneratedLocation): Provider {
  const lat = row.location.latitude;
  const lng = row.location.longitude;
  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  const uniquePhones = expandSourcePhones(row.phones);

  const emails = row.emails
    .map((e) => e.normalized ?? e.raw)
    .filter((e): e is string => Boolean(e && e.trim()));

  const contact: Provider["contact"] = {
    phones: uniquePhones,
  };
  if (emails[0]) contact.email = emails[0];

  const location: Provider["location"] = {
    address: pickName(row.addressAr, row.addressEn, row.location.formattedAddress, "—"),
    area: pickName(row.areaAr, row.areaEn, "—"),
    governorate: pickName(row.governorateAr, row.governorateEn, "—"),
    precision: mapPrecision(row.location.geocodingStatus, hasCoords),
  };
  if (hasCoords) {
    location.coordinates = { lat: lat!, lng: lng! };
  }

  return {
    id: row.id,
    name: pickName(row.nameAr, row.nameEn, row.organization.nameAr, row.organization.nameEn),
    type: pickName(row.providerTypeAr, row.providerTypeEn, "أخرى"),
    organization: {
      id: row.organization.id,
      name: pickName(row.organization.nameAr, row.organization.nameEn, row.nameAr, row.nameEn),
    },
    specialties: row.specialties.map((s) => ({
      id: s.slug,
      name: pickName(s.labelAr, SPECIALTY_AR[s.slug], s.labelEn, s.slug),
    })),
    services: row.services.map((s) => ({
      id: s.slug,
      name: pickName(s.labelAr, SERVICE_AR[s.slug], s.labelEn, s.slug),
    })),
    location,
    contact,
    network: mapNetwork(row.networkType),
    status: mapStatus(row.pulseStatus, row.isActive),
  };
}
