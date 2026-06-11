// @ts-check

(() => {
  "use strict";

  /**
   * @typedef {"fork-knife" | "star" | "x" | "none"} PinIconType
   * @typedef {"blue" | "red" | "yellow" | "purple" | "violet" | "lemon"} PinColorType
   * @typedef {{ iconId?: string, dot?: true }} PinSymbol
   * @typedef {{ date?: string, title?: string, url?: string }} VenueVisit
   * @typedef {{
   *   venueId: string,
   *   title: string,
   *   lat: number,
   *   lng: number,
   *   googleMapsQuery?: string,
   *   googlePlaceId?: string,
   *   pinIcon?: string,
   *   pinColor?: string,
   *   visits: VenueVisit[],
   * }} Venue
   * @typedef {{ iconType: PinIconType, colorType: PinColorType }} VenuePinStyle
   * @typedef {{ venuesUrl: string, iconsSpriteUrl: string }} MapAssetConfig
   * @typedef {any} LeafletApi
   */

  const CURRENT_SCRIPT_URL = getCurrentScriptUrl();
  const DEFAULT_VENUES_URL = resolveScriptRelativeUrl("venues.json");
  const DEFAULT_ICONS_SPRITE_URL = resolveScriptRelativeUrl(
    "../third-party/bootstrap-icons/bootstrap-icons.svg",
  );
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
  /** @type {PinIconType} */
  const DEFAULT_PIN_ICON = "none";
  /** @type {PinColorType} */
  const DEFAULT_PIN_COLOR = "blue";
  /** @type {Record<PinColorType, number>} */
  const PIN_COLOR_Z_INDEX_OFFSET = {
    violet: 50_000,
    lemon: 50_000,
    purple: 40_000,
    yellow: 30_000,
    red: 20_000,
    blue: 10_000,
  };
  /** @type {Record<PinIconType, number>} */
  const PIN_ICON_Z_INDEX_OFFSET = {
    star: 400,
    "fork-knife": 300,
    x: 200,
    none: 0,
  };
  const PIN_SHELL_PATH =
    "M17 1.6C9 1.6 2.7 7.9 2.7 15.8 2.7 26.4 17 40.4 17 40.4s14.3-14 14.3-24.6C31.3 7.9 25 1.6 17 1.6z";
  // Inner glyphs reference the local Bootstrap Icons v1.13.1 SVG sprite.
  /** @type {Record<PinIconType, PinSymbol>} */
  const PIN_SYMBOLS = {
    "fork-knife": {
      iconId: "fork-knife",
    },
    star: {
      iconId: "star-fill",
    },
    x: {
      iconId: "x-lg",
    },
    none: {
      dot: true,
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    initFineDiningMap().catch((error) => {
      console.error("Failed to initialize fine dining map:", error);
      renderMapFailure(error);
    });
  });

  /** @returns {Promise<void>} */
  async function initFineDiningMap() {
    const mapElement = document.getElementById("fine-dining-map");
    if (!mapElement) return;

    const assets = getMapAssetConfig(mapElement);
    const leaflet = getLeaflet();
    const map = leaflet.map(mapElement, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    leaflet.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const venues = await fetchJson(assets.venuesUrl);
    if (!Array.isArray(venues)) {
      throw new Error(`Expected ${assets.venuesUrl} to contain an array of venues.`);
    }

    const markers = leaflet.featureGroup();
    const allBounds = leaflet.latLngBounds([]);
    const taipeiBounds = leaflet.latLngBounds([]);

    for (const venue of venues) {
      if (!isValidVenue(venue)) {
        console.warn("Invalid venue skipped:", venue);
        continue;
      }

      const latLng = leaflet.latLng(venue.lat, venue.lng);
      const pinStyle = getVenuePinStyle(venue);
      const marker = leaflet.marker(latLng, {
        icon: createPinIcon(leaflet, pinStyle, assets.iconsSpriteUrl),
        title: venue.title,
        zIndexOffset: getPinZIndexOffset(pinStyle),
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

    addBoundsControl(leaflet, map, taipeiBounds, allBounds);
  }

  /** @returns {LeafletApi} */
  function getLeaflet() {
    const leaflet = /** @type {Window & { L?: LeafletApi }} */ (window).L;
    if (!leaflet) {
      throw new Error("Leaflet is not loaded.");
    }

    return leaflet;
  }

  /** @returns {string} */
  function getCurrentScriptUrl() {
    const script = document.currentScript;
    return script instanceof HTMLScriptElement ? script.src : "";
  }

  /**
   * @param {string} relativePath
   * @returns {string}
   */
  function resolveScriptRelativeUrl(relativePath) {
    return CURRENT_SCRIPT_URL
      ? new URL(relativePath, CURRENT_SCRIPT_URL).toString()
      : relativePath;
  }

  /**
   * @param {HTMLElement} mapElement
   * @returns {MapAssetConfig}
   */
  function getMapAssetConfig(mapElement) {
    return {
      venuesUrl: mapElement.dataset.venuesUrl || DEFAULT_VENUES_URL,
      iconsSpriteUrl: mapElement.dataset.iconsSpriteUrl || DEFAULT_ICONS_SPRITE_URL,
    };
  }

  /**
   * @param {string} url
   * @returns {Promise<unknown>}
   */
  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * @param {unknown} value
   * @returns {value is Venue}
   */
  function isValidVenue(value) {
    if (!isRecord(value)) {
      return false;
    }

    const visits = value.visits;
    return (
      typeof value.venueId === "string" &&
      typeof value.title === "string" &&
      typeof value.lat === "number" &&
      Number.isFinite(value.lat) &&
      typeof value.lng === "number" &&
      Number.isFinite(value.lng) &&
      isOptionalString(value.googleMapsQuery) &&
      isOptionalString(value.googlePlaceId) &&
      isOptionalString(value.pinIcon) &&
      isOptionalString(value.pinColor) &&
      Array.isArray(visits) &&
      visits.every(isVenueVisit)
    );
  }

  /**
   * @param {unknown} value
   * @returns {value is VenueVisit}
   */
  function isVenueVisit(value) {
    return (
      isRecord(value) &&
      isOptionalString(value.date) &&
      isOptionalString(value.title) &&
      isOptionalString(value.url)
    );
  }

  /**
   * @param {unknown} value
   * @returns {value is Record<string, unknown>}
   */
  function isRecord(value) {
    return typeof value === "object" && value !== null;
  }

  /**
   * @param {unknown} value
   * @returns {value is string | undefined}
   */
  function isOptionalString(value) {
    return value === undefined || typeof value === "string";
  }

  /**
   * @param {Venue} venue
   * @returns {boolean}
   */
  function isTaipeiAreaVenue(venue) {
    return (
      venue.lat >= TAIPEI_AREA_BOUNDS.minLat &&
      venue.lat <= TAIPEI_AREA_BOUNDS.maxLat &&
      venue.lng >= TAIPEI_AREA_BOUNDS.minLng &&
      venue.lng <= TAIPEI_AREA_BOUNDS.maxLng
    );
  }

  /**
   * @param {Venue} venue
   * @returns {VenuePinStyle}
   */
  function getVenuePinStyle(venue) {
    return {
      iconType: normalizePinIcon(venue.pinIcon),
      colorType: normalizePinColor(venue.pinColor),
    };
  }

  /**
   * @param {VenuePinStyle} pinStyle
   * @returns {number}
   */
  function getPinZIndexOffset(pinStyle) {
    return (
      PIN_COLOR_Z_INDEX_OFFSET[pinStyle.colorType] +
      PIN_ICON_Z_INDEX_OFFSET[pinStyle.iconType]
    );
  }

  /**
   * @param {unknown} iconType
   * @returns {PinIconType}
   */
  function normalizePinIcon(iconType) {
    return typeof iconType === "string" && PIN_ICON_TYPES.has(iconType)
      ? /** @type {PinIconType} */ (iconType)
      : DEFAULT_PIN_ICON;
  }

  /**
   * @param {unknown} colorType
   * @returns {PinColorType}
   */
  function normalizePinColor(colorType) {
    return typeof colorType === "string" && PIN_COLOR_TYPES.has(colorType)
      ? /** @type {PinColorType} */ (colorType)
      : DEFAULT_PIN_COLOR;
  }

  /**
   * @param {LeafletApi} leaflet
   * @param {VenuePinStyle} pinStyle
   * @param {string} iconsSpriteUrl
   * @returns {unknown}
   */
  function createPinIcon(leaflet, pinStyle, iconsSpriteUrl) {
    return leaflet.divIcon({
      className: [
        "fine-dining-pin-icon",
        `fine-dining-pin-icon-${pinStyle.iconType}`,
        `fine-dining-pin-color-${pinStyle.colorType}`,
      ].join(" "),
      html: renderPinHtml(pinStyle.iconType, iconsSpriteUrl),
      iconSize: [34, 42],
      iconAnchor: [17, 40],
      popupAnchor: [0, -34],
    });
  }

  /**
   * @param {PinIconType} iconType
   * @param {string} iconsSpriteUrl
   * @returns {string}
   */
  function renderPinHtml(iconType, iconsSpriteUrl) {
    const symbol = PIN_SYMBOLS[iconType] || PIN_SYMBOLS[DEFAULT_PIN_ICON];
    const iconHref = symbol.iconId
      ? `${iconsSpriteUrl}#${symbol.iconId}`
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
      <span class="fine-dining-pin-shell">
        <svg class="fine-dining-pin-svg" viewBox="0 0 34 42" aria-hidden="true">
          <path class="fine-dining-pin-shape" d="${PIN_SHELL_PATH}"></path>
          ${shellSymbol}
        </svg>
        ${glyph}
      </span>
    `;
  }

  /**
   * @param {Venue} venue
   * @returns {string}
   */
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

  /**
   * @param {VenueVisit} visit
   * @returns {string}
   */
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

  /**
   * @param {Venue} venue
   * @returns {string}
   */
  function buildGoogleMapsUrl(venue) {
    const query = encodeURIComponent(venue.googleMapsQuery || venue.title);
    const placeIdPart = venue.googlePlaceId
      ? `&query_place_id=${encodeURIComponent(venue.googlePlaceId)}`
      : "";

    return `https://www.google.com/maps/search/?api=1&query=${query}${placeIdPart}`;
  }

  /**
   * @param {LeafletApi} leaflet
   * @param {any} map
   * @param {any} taipeiBounds
   * @param {any} allBounds
   * @returns {void}
   */
  function addBoundsControl(leaflet, map, taipeiBounds, allBounds) {
    const BoundsControl = leaflet.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const container = leaflet.DomUtil.create("div", "fine-dining-map-control");
        const taipeiButton = createBoundsButton(leaflet, "台北", () => {
          if (taipeiBounds.isValid()) map.fitBounds(taipeiBounds.pad(0.18));
        });
        const allButton = createBoundsButton(leaflet, "全部", () => {
          if (allBounds.isValid()) map.fitBounds(allBounds.pad(0.18));
        });

        container.appendChild(taipeiButton);
        container.appendChild(allButton);
        leaflet.DomEvent.disableClickPropagation(container);
        leaflet.DomEvent.disableScrollPropagation(container);
        return container;
      },
    });

    map.addControl(new BoundsControl());
  }

  /**
   * @param {LeafletApi} leaflet
   * @param {string} label
   * @param {() => void} onClick
   * @returns {HTMLButtonElement}
   */
  function createBoundsButton(leaflet, label, onClick) {
    const button = leaflet.DomUtil.create("button", "");
    button.type = "button";
    button.textContent = label;
    /** @param {Event} event */
    const handleClick = (event) => {
      leaflet.DomEvent.stop(event);
      onClick();
    };
    leaflet.DomEvent.on(button, "click", handleClick);
    return button;
  }

  /**
   * @param {unknown} error
   * @returns {void}
   */
  function renderMapFailure(error) {
    const mapElement = document.getElementById("fine-dining-map");
    if (!mapElement) return;

    mapElement.classList.add("fine-dining-map-error");
    mapElement.textContent = `餐廳地圖載入失敗：${getErrorMessage(error)}`;
  }

  /**
   * @param {unknown} error
   * @returns {string}
   */
  function getErrorMessage(error) {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /**
   * @param {string} value
   * @returns {string}
   */
  function escapeAttribute(value) {
    return escapeHtml(value);
  }
})();
