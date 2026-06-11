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
  // from 子揚餐廳地圖.kml, map those icon IDs to this site's pinIcon values:
  // 1502 -> star, 1577 -> fork-knife, 1898 -> x, 1899 -> none.
  const PIN_ICON_TYPES = new Set(["fork-knife", "star", "x", "none"]);
  const PIN_COLOR_TYPES = new Set(["blue", "red", "yellow", "purple", "violet", "lemon"]);
  const DEFAULT_PIN_ICON = "none";
  const DEFAULT_PIN_COLOR = "blue";
  const PIN_SHELL_PATH =
    "M17 1.6C9 1.6 2.7 7.9 2.7 15.8 2.7 26.4 17 40.4 17 40.4s14.3-14 14.3-24.6C31.3 7.9 25 1.6 17 1.6z";
  // Inner glyph paths are from Bootstrap Icons v1.13.1, MIT licensed.
  const PIN_SYMBOLS = {
    "fork-knife": {
      label: "餐廳",
      path: "M13 .5c0-.276-.226-.506-.498-.465-1.703.257-2.94 2.012-3 8.462a.5.5 0 0 0 .498.5c.56.01 1 .13 1 1.003v5.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5zM4.25 0a.25.25 0 0 1 .25.25v5.122a.128.128 0 0 0 .256.006l.233-5.14A.25.25 0 0 1 5.24 0h.522a.25.25 0 0 1 .25.238l.233 5.14a.128.128 0 0 0 .256-.006V.25A.25.25 0 0 1 6.75 0h.29a.5.5 0 0 1 .498.458l.423 5.07a1.69 1.69 0 0 1-1.059 1.711l-.053.022a.92.92 0 0 0-.58.884L6.47 15a.971.971 0 1 1-1.942 0l.202-6.855a.92.92 0 0 0-.58-.884l-.053-.022a1.69 1.69 0 0 1-1.059-1.712L3.462.458A.5.5 0 0 1 3.96 0z",
    },
    star: {
      label: "星級",
      path: "M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z",
    },
    x: {
      label: "排除",
      path: "M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z",
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
    const glyph = symbol.path
      ? `
        <svg class="fine-dining-pin-glyph" viewBox="0 0 16 16" aria-hidden="true">
          <path d="${escapeAttribute(symbol.path)}"></path>
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
