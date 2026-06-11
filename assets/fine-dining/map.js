(() => {
  "use strict";

  const VENUES_URL = "/assets/fine-dining/venues.json";
  const TAIPEI_AREA_BOUNDS = {
    minLat: 24.93,
    maxLat: 25.22,
    minLng: 121.35,
    maxLng: 121.72,
  };
  // Google My Maps KML exports icon styles as icon-<id>-<color>. When syncing
  // from .kml, map those icon IDs to this site's pinIcon values:
  // 1502 -> star, 1577 -> fork-knife, 1898 -> x, 1899 -> none.
  const PIN_ICON_TYPES = new Set(["fork-knife", "star", "x", "none"]);
  const PIN_COLOR_TYPES = new Set(["blue", "red", "yellow", "purple", "violet", "lemon"]);
  const DEFAULT_PIN_ICON = "none";
  const DEFAULT_PIN_COLOR = "blue";
  const BOOTSTRAP_ICONS_SPRITE = "/assets/third-party/bootstrap-icons/bootstrap-icons.svg";
  const PIN_SHELL_PATH =
    "M17 1.6C9 1.6 2.7 7.9 2.7 15.8 2.7 26.4 17 40.4 17 40.4s14.3-14 14.3-24.6C31.3 7.9 25 1.6 17 1.6z";
  // Inner glyphs reference the local Bootstrap Icons v1.13.1 SVG sprite.
  const PIN_SYMBOLS = {
    "fork-knife": {
      label: "餐廳",
      iconId: "fork-knife",
    },
    star: {
      label: "星級",
      iconId: "star-fill",
    },
    x: {
      label: "排除",
      iconId: "x-lg",
    },
    none: {
      label: "一般地點",
      dot: true,
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    initFineDiningMap().catch((error) => {
      console.error("Failed to initialize fine dining map:", error);
      renderMapFailure(error);
    });
  });

  async function initFineDiningMap() {
    const mapElement = document.getElementById("fine-dining-map");
    if (!mapElement) return;

    if (!window.L) {
      throw new Error("Leaflet is not loaded.");
    }

    const map = L.map(mapElement, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const venues = await fetchJson(VENUES_URL);
    const markers = L.featureGroup();
    const allBounds = L.latLngBounds([]);
    const taipeiBounds = L.latLngBounds([]);

    for (const venue of venues) {
      if (!isValidVenue(venue)) {
        console.warn("Invalid venue skipped:", venue);
        continue;
      }

      const latLng = L.latLng(venue.lat, venue.lng);
      const pinStyle = getVenuePinStyle(venue);
      const marker = L.marker(latLng, {
        icon: createPinIcon(pinStyle),
        title: venue.title,
        zIndexOffset: pinStyle.iconType === "none" ? 400 : 0,
      });

      marker.bindPopup(renderVenuePopup(venue));
      marker.addTo(markers);
      allBounds.extend(latLng);
      if (isTaipeiAreaVenue(venue)) {
        taipeiBounds.extend(latLng);
      }
    }

    markers.addTo(map);

    if (taipeiBounds.isValid()) {
      map.fitBounds(taipeiBounds.pad(0.18));
    } else if (allBounds.isValid()) {
      map.fitBounds(allBounds.pad(0.18));
    } else {
      map.setView([25.0478, 121.5319], 11);
    }

    addBoundsControl(map, taipeiBounds, allBounds);
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  function isValidVenue(venue) {
    return (
      venue &&
      typeof venue.venueId === "string" &&
      typeof venue.title === "string" &&
      Number.isFinite(venue.lat) &&
      Number.isFinite(venue.lng) &&
      Array.isArray(venue.visits)
    );
  }

  function isTaipeiAreaVenue(venue) {
    return (
      venue.lat >= TAIPEI_AREA_BOUNDS.minLat &&
      venue.lat <= TAIPEI_AREA_BOUNDS.maxLat &&
      venue.lng >= TAIPEI_AREA_BOUNDS.minLng &&
      venue.lng <= TAIPEI_AREA_BOUNDS.maxLng
    );
  }

  function getVenuePinStyle(venue) {
    return {
      iconType: normalizePinIcon(venue.pinIcon),
      colorType: normalizePinColor(venue.pinColor),
    };
  }

  function normalizePinIcon(iconType) {
    return PIN_ICON_TYPES.has(iconType) ? iconType : DEFAULT_PIN_ICON;
  }

  function normalizePinColor(colorType) {
    return PIN_COLOR_TYPES.has(colorType) ? colorType : DEFAULT_PIN_COLOR;
  }

  function createPinIcon(pinStyle) {
    return L.divIcon({
      className: [
        "fine-dining-pin-icon",
        `fine-dining-pin-icon-${pinStyle.iconType}`,
        `fine-dining-pin-color-${pinStyle.colorType}`,
      ].join(" "),
      html: renderPinHtml(pinStyle.iconType),
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -34],
    });
  }

  function renderPinHtml(iconType) {
    const symbol = PIN_SYMBOLS[iconType] || PIN_SYMBOLS[DEFAULT_PIN_ICON];
    const iconHref = symbol.iconId
      ? `${BOOTSTRAP_ICONS_SPRITE}#${symbol.iconId}`
      : "";
    const glyph = iconHref
      ? `
        <svg class="fine-dining-pin-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <use href="${escapeAttribute(iconHref)}" xlink:href="${escapeAttribute(iconHref)}"></use>
        </svg>
      `
      : "";
    const shellSymbol = symbol.dot
      ? '<circle class="fine-dining-pin-dot" cx="17" cy="16.6" r="5.2"></circle>'
      : "";

    return `
      <span class="fine-dining-pin-shell" role="img" aria-label="${escapeAttribute(symbol.label)} pin">
        <svg class="fine-dining-pin-svg" viewBox="0 0 34 42" aria-hidden="true">
          <path class="fine-dining-pin-shape" d="${PIN_SHELL_PATH}"></path>
          ${shellSymbol}
        </svg>
        ${glyph}
      </span>
    `;
  }

  function renderVenuePopup(venue) {
    const googleMapsUrl = buildGoogleMapsUrl(venue);
    const visitsHtml = venue.visits.length > 0
      ? `<ul>${venue.visits.map(renderVisitLink).join("")}</ul>`
      : "";

    return `
      <div class="fine-dining-popup">
        <div class="fine-dining-popup-title">${escapeHtml(venue.title)}</div>
        ${visitsHtml}
        <p class="fine-dining-google-link">
          <a href="${escapeAttribute(googleMapsUrl)}" target="_blank" rel="noopener">
            在 Google 地圖中檢視
          </a>
        </p>
      </div>
    `;
  }

  function renderVisitLink(visit) {
    const date = escapeHtml(visit.date || "");
    const title = escapeHtml(visit.title || visit.url || "食記");
    const url = escapeAttribute(visit.url || "#");
    const separator = date ? "｜" : "";

    return `
      <li>
        <a href="${url}">${date}${separator}${title}</a>
      </li>
    `;
  }

  function buildGoogleMapsUrl(venue) {
    const query = encodeURIComponent(venue.googleMapsQuery || venue.title);
    const placeIdPart = venue.googlePlaceId
      ? `&query_place_id=${encodeURIComponent(venue.googlePlaceId)}`
      : "";

    return `https://www.google.com/maps/search/?api=1&query=${query}${placeIdPart}`;
  }

  function addBoundsControl(map, taipeiBounds, allBounds) {
    const BoundsControl = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const container = L.DomUtil.create("div", "fine-dining-map-control");
        const taipeiButton = createBoundsButton("台北", () => {
          if (taipeiBounds.isValid()) map.fitBounds(taipeiBounds.pad(0.18));
        });
        const allButton = createBoundsButton("全部", () => {
          if (allBounds.isValid()) map.fitBounds(allBounds.pad(0.18));
        });

        container.appendChild(taipeiButton);
        container.appendChild(allButton);
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        return container;
      },
    });

    map.addControl(new BoundsControl());
  }

  function createBoundsButton(label, onClick) {
    const button = L.DomUtil.create("button", "");
    button.type = "button";
    button.textContent = label;
    L.DomEvent.on(button, "click", (event) => {
      L.DomEvent.stop(event);
      onClick();
    });
    return button;
  }

  function renderMapFailure(error) {
    const mapElement = document.getElementById("fine-dining-map");
    if (!mapElement) return;

    mapElement.classList.add("fine-dining-map-error");
    mapElement.textContent = `餐廳地圖載入失敗：${error.message}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
