/** Fixed geographic label: فلسطين (Google Maps cannot rename country labels). */

const PALESTINE_ANCHOR = { lat: 31.95, lng: 35.23 };

/** Scale country-style label with zoom: small when far out, larger when closer. */
function fontSizeForZoom(zoom: number): number {
  // z5 ≈ Egypt-wide → ~10px; z8 → ~14px; z11 → ~20px; capped
  const size = 4 + zoom * 1.35;
  return Math.round(Math.min(22, Math.max(9, size)));
}

/**
 * Attaches a non-interactive overlay labeled فلسطين.
 * Call only after the Maps JS library has loaded.
 * Returns a dispose function.
 */
export function attachPalestineLabel(map: google.maps.Map): () => void {
  class PalestineLabelOverlay extends google.maps.OverlayView {
    private position: google.maps.LatLngLiteral;
    private div: HTMLDivElement | null = null;
    private zoomListener: google.maps.MapsEventListener | null = null;

    constructor(position: google.maps.LatLngLiteral) {
      super();
      this.position = position;
    }

    onAdd() {
      const div = document.createElement("div");
      div.textContent = "فلسطين";
      div.setAttribute("dir", "rtl");
      div.style.cssText = [
        "position:absolute",
        "transform:translate(-50%,-50%)",
        "pointer-events:none",
        "user-select:none",
        "font-family:Cairo,sans-serif",
        "font-weight:700",
        "letter-spacing:0.02em",
        "color:#f2f7f8",
        "text-shadow:0 1px 2px rgba(0,0,0,0.85),0 0 8px rgba(0,0,0,0.45)",
        "white-space:nowrap",
        "z-index:10000",
        "transition:font-size 80ms linear,opacity 80ms linear",
      ].join(";");
      this.div = div;
      this.getPanes()?.overlayLayer.appendChild(div);

      const mapInstance = this.getMap();
      if (mapInstance instanceof google.maps.Map) {
        this.zoomListener = mapInstance.addListener("zoom_changed", () => {
          this.draw();
        });
      }
    }

    draw() {
      const div = this.div;
      const projection = this.getProjection();
      if (!div || !projection) return;

      const mapInstance = this.getMap();
      const zoom =
        mapInstance instanceof google.maps.Map ? (mapInstance.getZoom() ?? 6) : 6;

      // Hide at city-level zoom where country labels normally disappear
      if (zoom >= 12) {
        div.style.opacity = "0";
        return;
      }
      div.style.opacity = "1";
      div.style.fontSize = `${fontSizeForZoom(zoom)}px`;

      const point = projection.fromLatLngToDivPixel(
        new google.maps.LatLng(this.position.lat, this.position.lng),
      );
      if (!point) return;
      div.style.left = `${point.x}px`;
      div.style.top = `${point.y}px`;
    }

    onRemove() {
      if (this.zoomListener) {
        google.maps.event.removeListener(this.zoomListener);
        this.zoomListener = null;
      }
      this.div?.remove();
      this.div = null;
    }
  }

  const overlay = new PalestineLabelOverlay(PALESTINE_ANCHOR);
  overlay.setMap(map);
  return () => overlay.setMap(null);
}
