(() => {
  "use strict";

  const VENUES_URL = "/assets/data/fine-dining-venues.json";
  const BOUNDARY_URL = "/assets/maps/taipei.geojson";
  const TAIWAN_BOUNDS = {
    minLat: 21.8,
    maxLat: 25.4,
    minLng: 119.8,
    maxLng: 122.2,
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
      attributionControl: false,
      scrollWheelZoom: false,
    });

    const [venues, boundary] = await Promise.all([
      fetchJson(VENUES_URL),
      fetchJson(BOUNDARY_URL),
    ]);

    L.geoJSON(boundary, {
      interactive: false,
      style: {
        color: "#155b6b",
        weight: 1.4,
        opacity: 0.7,
        fillColor: "#159957",
        fillOpacity: 0.08,
      },
    }).addTo(map);

    const markers = L.featureGroup();
    const allBounds = L.latLngBounds([]);
    const taiwanBounds = L.latLngBounds([]);
    let validVenueCount = 0;

    for (const venue of venues) {
      if (!isValidVenue(venue)) {
        console.warn("Invalid venue skipped:", venue);
        continue;
      }

      const latLng = L.latLng(venue.lat, venue.lng);
      const marker = L.circleMarker(latLng, {
        radius: venue.visits.length > 0 ? 7 : 5,
        color: "#0e3d4a",
        weight: 2,
        fillColor: venue.visits.length > 0 ? "#159957" : "#9bb8bf",
        fillOpacity: venue.visits.length > 0 ? 0.88 : 0.72,
      });

      marker.bindPopup(renderVenuePopup(venue));
      marker.addTo(markers);
      allBounds.extend(latLng);
      if (isTaiwanVenue(venue)) {
        taiwanBounds.extend(latLng);
      }
      validVenueCount += 1;
    }

    markers.addTo(map);

    if (validVenueCount > 0) {
      const defaultBounds = taiwanBounds.isValid() ? taiwanBounds : allBounds;
      map.fitBounds(defaultBounds.pad(0.18));
      if (taiwanBounds.isValid() && allBounds.isValid() && !boundsAreClose(taiwanBounds, allBounds)) {
        addBoundsControl(map, taiwanBounds, allBounds);
      }
    } else {
      map.setView([25.0478, 121.5319], 11);
    }

    addMapNote(map, `${validVenueCount} 個靜態地點，無 Google Maps API`);
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

  function isTaiwanVenue(venue) {
    return (
      venue.lat >= TAIWAN_BOUNDS.minLat &&
      venue.lat <= TAIWAN_BOUNDS.maxLat &&
      venue.lng >= TAIWAN_BOUNDS.minLng &&
      venue.lng <= TAIWAN_BOUNDS.maxLng
    );
  }

  function renderVenuePopup(venue) {
    const googleMapsUrl = buildGoogleMapsUrl(venue);
    const visitsHtml = venue.visits.length > 0
      ? `<ul>${venue.visits.map(renderVisitLink).join("")}</ul>`
      : `<p class="fine-dining-popup-muted">尚無站內食記</p>`;

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

  function addBoundsControl(map, taiwanBounds, allBounds) {
    const BoundsControl = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const container = L.DomUtil.create("div", "fine-dining-map-control");
        const taiwanButton = createBoundsButton("台灣", () => map.fitBounds(taiwanBounds.pad(0.18)));
        const allButton = createBoundsButton("全部", () => map.fitBounds(allBounds.pad(0.18)));

        container.appendChild(taiwanButton);
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

  function addMapNote(map, label) {
    const NoteControl = L.Control.extend({
      options: { position: "bottomleft" },
      onAdd() {
        const container = L.DomUtil.create("div", "fine-dining-map-note");
        container.textContent = label;
        L.DomEvent.disableClickPropagation(container);
        return container;
      },
    });

    map.addControl(new NoteControl());
  }

  function boundsAreClose(firstBounds, secondBounds) {
    const firstSouthWest = firstBounds.getSouthWest();
    const firstNorthEast = firstBounds.getNorthEast();
    const secondSouthWest = secondBounds.getSouthWest();
    const secondNorthEast = secondBounds.getNorthEast();

    return (
      Math.abs(firstSouthWest.lat - secondSouthWest.lat) < 0.01 &&
      Math.abs(firstSouthWest.lng - secondSouthWest.lng) < 0.01 &&
      Math.abs(firstNorthEast.lat - secondNorthEast.lat) < 0.01 &&
      Math.abs(firstNorthEast.lng - secondNorthEast.lng) < 0.01
    );
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
