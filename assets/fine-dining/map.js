// @ts-check

(() => {
  "use strict";

  /**
   * @typedef {"fork-knife" | "star" | "x" | "none"} PinIconType
   * @typedef {"blue" | "red" | "yellow" | "purple" | "royal-purple" | "gold"} PinColorType
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
   * @typedef {{ minLat: number, maxLat: number, minLng: number, maxLng: number }} VenueBounds
   * @typedef {any} MapLibreApi
   * @typedef {any} MapLibreMap
   */

  const CURRENT_SCRIPT_URL = getCurrentScriptUrl();
  const DEFAULT_VENUES_URL = resolveScriptRelativeUrl("venues.json");
  const DEFAULT_ICONS_SPRITE_URL = resolveScriptRelativeUrl(
    "../third-party/bootstrap-icons/bootstrap-icons.svg",
  );
  const MAPLIBRE_MODULE_URL =
    "https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs";
  const CARTO_BASEMAP_STYLE_URL =
    "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  const CARTO_BASEMAP_PROJECT_KEY = "cb1_298e_1_0479a06a70b06fe882cd210d";
  const DEFAULT_MAP_CENTER = [121.5319, 25.0478];
  const DEFAULT_MAP_ZOOM = 11;
  const MAP_MAX_ZOOM = 19;
  const FIT_BOUNDS_PADDING = 48;
  const MAP_LOAD_TIMEOUT_MS = 20_000;
  // The default Taipei view focuses on the central cluster. Southern New Taipei
  // outliers remain available through the "全部" control.
  const TAIPEI_AREA_BOUNDS = {
    minLat: 25.0,
    maxLat: 25.095,
    minLng: 121.48,
    maxLng: 121.595,
  };
  // Google My Maps KML exports icon styles as icon-<id>-<color>. When syncing
  // from .kml, map those icon IDs to this site's pinIcon values:
  // 1502 -> star, 1577 -> fork-knife, 1898 -> x, 1899 -> none.
  const PIN_ICON_TYPES = new Set(["fork-knife", "star", "x", "none"]);
  const PIN_COLOR_TYPES = new Set(["blue", "red", "yellow", "purple", "royal-purple", "gold"]);
  /** @type {PinIconType} */
  const DEFAULT_PIN_ICON = "none";
  /** @type {PinColorType} */
  const DEFAULT_PIN_COLOR = "blue";
  /** @type {Record<PinColorType, number>} */
  const PIN_COLOR_Z_INDEX_OFFSET = {
    "royal-purple": 50_000,
    gold: 50_000,
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
    const maplibre = await loadMapLibre();
    const map = new maplibre.Map({
      container: mapElement,
      style: CARTO_BASEMAP_STYLE_URL,
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: true,
      transformRequest: transformCartoRequest,
    });
    map.on("error", logMapResourceError);
    map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");

    const [venues] = await Promise.all([
      fetchJson(assets.venuesUrl),
      waitForInitialMapLoad(map),
    ]).catch((error) => {
      map.remove();
      throw error;
    });
    if (!Array.isArray(venues)) {
      throw new Error(`Expected ${assets.venuesUrl} to contain an array of venues.`);
    }

    const allBounds = createEmptyBounds();
    const taipeiBounds = createEmptyBounds();

    for (const venue of venues) {
      if (!isValidVenue(venue)) {
        console.warn("Invalid venue skipped:", venue);
        continue;
      }

      const pinStyle = getVenuePinStyle(venue);
      const pinElement = createPinElement(pinStyle, assets.iconsSpriteUrl);
      pinElement.title = venue.title;
      pinElement.setAttribute("aria-label", venue.title);
      pinElement.setAttribute("role", "button");
      pinElement.setAttribute("aria-haspopup", "dialog");
      pinElement.setAttribute("aria-expanded", "false");
      pinElement.tabIndex = 0;
      pinElement.style.zIndex = String(getPinZIndexOffset(pinStyle));

      const popup = new maplibre.Popup({
        maxWidth: "320px",
        offset: 34,
      }).setHTML(renderVenuePopup(venue));
      popup.on("open", () => pinElement.setAttribute("aria-expanded", "true"));
      popup.on("close", () => pinElement.setAttribute("aria-expanded", "false"));

      const marker = new maplibre.Marker({
        element: pinElement,
        anchor: "bottom",
      })
        .setLngLat([venue.lng, venue.lat])
        .setPopup(popup)
        .addTo(map);
      pinElement.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        event.stopPropagation();
        marker.togglePopup();
      });

      extendBounds(allBounds, venue.lat, venue.lng);
      if (isTaipeiAreaVenue(venue)) {
        extendBounds(taipeiBounds, venue.lat, venue.lng);
      }
    }

    if (isBoundsValid(taipeiBounds)) {
      fitMapToBounds(map, taipeiBounds, false);
    } else if (isBoundsValid(allBounds)) {
      fitMapToBounds(map, allBounds, false);
    } else {
      map.jumpTo({ center: DEFAULT_MAP_CENTER, zoom: DEFAULT_MAP_ZOOM });
    }

    addBoundsControl(map, taipeiBounds, allBounds);
    addLegendControl(map);
  }

  /** @returns {Promise<MapLibreApi>} */
  function loadMapLibre() {
    return import(MAPLIBRE_MODULE_URL);
  }

  /**
   * @param {MapLibreMap} map
   * @returns {Promise<void>}
   */
  function waitForInitialMapLoad(map) {
    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        window.clearTimeout(timeoutId);
        resolve();
      };
      const timeoutId = window.setTimeout(() => {
        map.off("load", handleLoad);
        reject(
          new Error(
            `CARTO vector map did not load within ${MAP_LOAD_TIMEOUT_MS / 1_000} seconds.`,
          ),
        );
      }, MAP_LOAD_TIMEOUT_MS);

      map.once("load", handleLoad);
    });
  }

  /**
   * @param {{ error?: unknown }} event
   * @returns {void}
   */
  function logMapResourceError(event) {
    console.error("MapLibre reported a map resource error:", event.error || event);
  }

  /**
   * CARTO's vector style references separate TileJSON, sprite, glyph, and tile
   * resources. Apply the project key to every CARTO basemap request so the
   * nested resources use the same browser-visible authorization as the style.
   *
   * @param {string} url
   * @returns {{ url: string }}
   */
  function transformCartoRequest(url) {
    try {
      const requestUrl = new URL(url);
      if (!isCartoBasemapHost(requestUrl.hostname)) {
        return { url };
      }

      requestUrl.searchParams.set("key", CARTO_BASEMAP_PROJECT_KEY);
      return { url: requestUrl.toString() };
    } catch {
      return { url };
    }
  }

  /**
   * @param {string} hostname
   * @returns {boolean}
   */
  function isCartoBasemapHost(hostname) {
    return (
      hostname === "basemaps.cartocdn.com" ||
      hostname.endsWith(".basemaps.cartocdn.com")
    );
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

  /** @returns {VenueBounds} */
  function createEmptyBounds() {
    return {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
    };
  }

  /**
   * @param {VenueBounds} bounds
   * @param {number} lat
   * @param {number} lng
   * @returns {void}
   */
  function extendBounds(bounds, lat, lng) {
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
    bounds.minLng = Math.min(bounds.minLng, lng);
    bounds.maxLng = Math.max(bounds.maxLng, lng);
  }

  /**
   * @param {VenueBounds} bounds
   * @returns {boolean}
   */
  function isBoundsValid(bounds) {
    return (
      Number.isFinite(bounds.minLat) &&
      Number.isFinite(bounds.maxLat) &&
      Number.isFinite(bounds.minLng) &&
      Number.isFinite(bounds.maxLng)
    );
  }

  /**
   * @param {MapLibreMap} map
   * @param {VenueBounds} bounds
   * @param {boolean} animate
   * @returns {void}
   */
  function fitMapToBounds(map, bounds, animate = true) {
    if (!isBoundsValid(bounds)) return;

    map.fitBounds(
      [
        [bounds.minLng, bounds.minLat],
        [bounds.maxLng, bounds.maxLat],
      ],
      {
        padding: FIT_BOUNDS_PADDING,
        maxZoom: MAP_MAX_ZOOM,
        duration: animate ? 500 : 0,
      },
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
    if (pinStyle.colorType === "red" && pinStyle.iconType === "x") {
      return 0;
    }

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
   * @param {VenuePinStyle} pinStyle
   * @param {string} iconsSpriteUrl
   * @returns {HTMLDivElement}
   */
  function createPinElement(pinStyle, iconsSpriteUrl) {
    const element = document.createElement("div");
    element.className = [
      "fine-dining-pin-icon",
      `fine-dining-pin-icon-${pinStyle.iconType}`,
      `fine-dining-pin-color-${pinStyle.colorType}`,
    ].join(" ");
    element.innerHTML = renderPinHtml(pinStyle.iconType, iconsSpriteUrl);
    return element;
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
   * @param {MapLibreMap} map
   * @param {VenueBounds} taipeiBounds
   * @param {VenueBounds} allBounds
   * @returns {void}
   */
  function addBoundsControl(map, taipeiBounds, allBounds) {
    let container;
    const boundsControl = {
      onAdd() {
        container = createMapControlContainer("fine-dining-map-control");
        const taipeiButton = createBoundsButton("台北", () => {
          fitMapToBounds(map, taipeiBounds);
        });
        const allButton = createBoundsButton("全部", () => {
          fitMapToBounds(map, allBounds);
        });

        container.appendChild(taipeiButton);
        container.appendChild(allButton);
        return container;
      },
      onRemove() {
        container?.remove();
      },
    };

    map.addControl(boundsControl, "top-right");
  }

  /**
   * @param {MapLibreMap} map
   * @returns {void}
   */
  function addLegendControl(map) {
    let container;
    const legendControl = {
      onAdd() {
        container = createMapControlContainer("fine-dining-map-legend");
        container.setAttribute("aria-label", "餐廳地圖名人堂標示");

        const item = document.createElement("div");
        item.className = "fine-dining-map-legend-item";

        const swatch = document.createElement("span");
        swatch.className =
          "fine-dining-map-legend-swatch fine-dining-map-legend-swatch-purple";
        swatch.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.className = "fine-dining-map-legend-label";
        label.textContent = "名人堂";

        item.appendChild(swatch);
        item.appendChild(label);
        container.appendChild(item);
        return container;
      },
      onRemove() {
        container?.remove();
      },
    };

    map.addControl(legendControl, "bottom-left");
  }

  /**
   * @param {string} className
   * @returns {HTMLDivElement}
   */
  function createMapControlContainer(className) {
    const container = document.createElement("div");
    container.className = `maplibregl-ctrl ${className}`;
    stopMapInteractionPropagation(container);
    return container;
  }

  /**
   * @param {HTMLElement} element
   * @returns {void}
   */
  function stopMapInteractionPropagation(element) {
    for (const eventName of [
      "click",
      "dblclick",
      "mousedown",
      "pointerdown",
      "touchstart",
      "wheel",
    ]) {
      element.addEventListener(eventName, (event) => event.stopPropagation(), {
        passive: true,
      });
    }
  }

  /**
   * @param {string} label
   * @param {() => void} onClick
   * @returns {HTMLButtonElement}
   */
  function createBoundsButton(label, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
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
