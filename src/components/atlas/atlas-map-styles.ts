/** Named atlas basemap themes — JSON styles + mapTypeId. */

export type AtlasThemeId =
  | "night"
  | "day"
  | "streets"
  | "buildings"
  | "hybrid"
  | "terrain";

export interface AtlasThemeMeta {
  id: AtlasThemeId;
  label: string;
}

export const ATLAS_THEMES: AtlasThemeMeta[] = [
  { id: "night", label: "ليل" },
  { id: "day", label: "نهار" },
  { id: "streets", label: "شوارع" },
  { id: "buildings", label: "مبانٍ" },
  { id: "hybrid", label: "قمر صناعي" },
  { id: "terrain", label: "تضاريس" },
];

const NIGHT_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a2428" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a9a9e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a2428" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#2d3d42" }],
  },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#243238" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a2428" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#2f454c" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1a2428" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0e181c" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4a6068" }],
  },
];

const DAY_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f0ebe3" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5a554c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f0ebe3" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c8c0b4" }],
  },
  { featureType: "poi", stylers: [{ visibility: "simplified" }] },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#d4e0c8" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d8d0c4" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#f2d9a8" }],
  },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#b8d4dc" }],
  },
];

/** Roads emphasized; POI muted. */
const STREETS_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1c2228" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#b0bcc4" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1c2228" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#3a4a52" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#d0dce0" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#4a6570" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#c4a46a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1c2228" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#2e3a42" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#0f181c" }],
  },
];

/** Buildings / man-made + POI more visible. */
const BUILDINGS_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#222830" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a8b4bc" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#222830" }] },
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#2c343e" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#343c48" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c8b090" }],
  },
  {
    featureType: "poi.business",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a323a" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3e4a54" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#2a323a" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#121820" }],
  },
];

const HIDE_COUNTRY_LABELS: google.maps.MapTypeStyle = {
  featureType: "administrative.country",
  elementType: "labels",
  stylers: [{ visibility: "off" }],
};

function withHiddenCountryLabels(
  styles: google.maps.MapTypeStyle[],
): google.maps.MapTypeStyle[] {
  return [...styles, HIDE_COUNTRY_LABELS];
}

const STYLE_BY_THEME: Record<
  Exclude<AtlasThemeId, "hybrid" | "terrain">,
  google.maps.MapTypeStyle[]
> = {
  night: withHiddenCountryLabels(NIGHT_STYLES),
  day: withHiddenCountryLabels(DAY_STYLES),
  streets: withHiddenCountryLabels(STREETS_STYLES),
  buildings: withHiddenCountryLabels(BUILDINGS_STYLES),
};

/** @deprecated Prefer applyAtlasTheme — kept for any leftover imports. */
export const ATLAS_MAP_STYLES = STYLE_BY_THEME.night;

export function isAtlasThemeId(value: string): value is AtlasThemeId {
  return ATLAS_THEMES.some((t) => t.id === value);
}

export function applyAtlasTheme(map: google.maps.Map, id: AtlasThemeId): void {
  if (id === "hybrid") {
    map.setOptions({
      mapTypeId: "hybrid",
      styles: [HIDE_COUNTRY_LABELS],
      backgroundColor: "#0c1214",
    });
    return;
  }
  if (id === "terrain") {
    map.setOptions({
      mapTypeId: "terrain",
      styles: [HIDE_COUNTRY_LABELS],
      backgroundColor: "#e8e4dc",
    });
    return;
  }

  const styles = STYLE_BY_THEME[id];
  map.setOptions({
    mapTypeId: "roadmap",
    styles,
    backgroundColor: id === "day" ? "#f0ebe3" : "#0c1214",
  });
}
