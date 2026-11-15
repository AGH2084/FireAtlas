import * as maplibregl from "./vendor/maplibre-gl/maplibre-gl.js";

const container = document.getElementById("map");
const caption = document.getElementById("map-caption");
const detail = document.getElementById("map-point");
const coordinateStatus = document.getElementById("map-coordinate-status");
const latitudeInput = document.getElementById("map-latitude");
const longitudeInput = document.getElementById("map-longitude");
const exampleButton = document.getElementById("map-example");
const exportButton = document.getElementById("map-export");
const exportStatus = document.getElementById("map-export-status");
const number = new Intl.NumberFormat("en");
const countries = {
  pilot: { name: "Bulgaria", bounds: [22.3, 41.2, 28.7, 44.3] },
  canada: { name: "Canada", bounds: [-141.1, 41.6, -52.5, 83.2] },
  "south-africa": { name: "South Africa", bounds: [16.3, -35, 33, -22] },
};
const empty = () => ({ type: "FeatureCollection", features: [] });
const source = () => ({ type: "geojson", data: empty() });

// The local outline and background remain visible when terrain tiles fail.
const style = {
  version: 8,
  sources: {
    elevation: {
      type: "raster-dem",
      tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
      tileSize: 256, maxzoom: 12, encoding: "terrarium",
      attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Terrain data credits</a>',
    },
    outline: source(), roads: source(), rivers: source(), clusters: source(), points: source(),
  },
  layers: [
    { id: "base", type: "background", paint: { "background-color": "#e8eef1" } },
    { id: "terrain-color", type: "color-relief", source: "elevation", paint: {
      "color-relief-color": ["interpolate", ["linear"], ["elevation"],
        -100, "#d9e9ee", 0, "#dfe9cf", 200, "#cadbb0", 700, "#d8ccaa",
        1400, "#c8bda9", 2500, "#aeb3b0", 4000, "#edf0ec"],
      "color-relief-opacity": 0.72,
    } },
    { id: "hillshade", type: "hillshade", source: "elevation", paint: { "hillshade-exaggeration": 0.35 } },
    { id: "country-fill", type: "fill", source: "outline", paint: { "fill-color": "#fbfcfa", "fill-opacity": 0.1 } },
    { id: "country-line", type: "line", source: "outline", paint: { "line-color": "#677381", "line-width": 1.3 } },
    { id: "rivers", type: "line", source: "rivers", minzoom: 4, paint: { "line-color": "#78a9bd", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 0.7, 10, 1.5], "line-opacity": 0.8 } },
    { id: "roads", type: "line", source: "roads", minzoom: 5, paint: { "line-color": "#bdad98", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.65, 10, 1.6], "line-opacity": 0.75 } },
    { id: "cluster-circles", type: "circle", source: "clusters", paint: { "circle-radius": 16, "circle-color": "#a13426", "circle-stroke-width": 1, "circle-stroke-color": "#fff" } },
    { id: "hotspot-points", type: "circle", source: "points", paint: { "circle-radius": 2.2, "circle-color": "#a13426", "circle-opacity": 0.85 } },
  ],
};

maplibregl.setWorkerUrl(new URL("./vendor/maplibre-gl/maplibre-gl-worker.js", import.meta.url).href);
const map = new maplibregl.Map({ container, style, center: [25.5, 42.75], zoom: 5, minZoom: 1, maxZoom: 16, attributionControl: false });
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
map.addControl(new maplibregl.AttributionControl({ compact: false }), "bottom-right");

let ready = false;
let country;
let selection;
let overview;
let revision = 0;
let fitZoom = 0;
let loadedOutlineKey;
let context;
let markers = [];
let placeMarkers = [];
let visiblePointRecords = [];
let pointLoadState = "not_loaded";
const bundleCache = new Map();
const sourcesByCountry = new Map();

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Map data unavailable: " + response.status);
  return response.json();
}

function getCountrySources(key) {
  if (!sourcesByCountry.has(key)) {
    const request = Promise.all([
      readJson("./data/" + key + "-hotspots-v2/overview.json"),
      readJson("./" + key + "-outline.json"),
      readJson("./map-context/" + key + ".json"),
    ]);
    sourcesByCountry.set(key, request);
    request.catch(() => { if (sourcesByCountry.get(key) === request) sourcesByCountry.delete(key); });
  }
  return sourcesByCountry.get(key);
}

function clearMarkers() {
  for (const marker of markers) marker.remove();
  markers = [];
}

function showPlaces() {
  for (const marker of placeMarkers) marker.remove();
  placeMarkers = [];
  if (!context) return;
  const rankLimit = map.getZoom() < 4 ? 2 : map.getZoom() < 6 ? 3 : 4;
  const used = [];
  for (const place of [...context.places].sort((a, b) => a.rank - b.rank)) {
    if (place.rank > rankLimit || !map.getBounds().contains(place.coordinates)) continue;
    const pixel = map.project(place.coordinates);
    if (used.some(other => Math.hypot(other.x - pixel.x, other.y - pixel.y) < 85)) continue;
    used.push(pixel);
    const label = document.createElement("span");
    label.className = "map-place-label";
    label.textContent = place.name;
    placeMarkers.push(new maplibregl.Marker({ element: label, anchor: "center" }).setLngLat(place.coordinates).addTo(map));
    if (placeMarkers.length >= 30) break;
  }
}

function fitCountry() {
  if (!country) return;
  const [west, south, east, north] = countries[country].bounds;
  map.fitBounds([[west, south], [east, north]], { padding: 32, duration: 0 });
  fitZoom = map.getZoom();
  coordinateStatus.textContent = "Coordinate target: country view. Data is limited to the selected country's catalog.";
}

function updateExportState(state, message) {
  pointLoadState = state;
  exportButton.disabled = state !== "ready" || !visiblePointRecords.length;
  exportStatus.textContent = message;
}

function resetDetailedRecords(message = "Zoom in to load detailed points before exporting.") {
  visiblePointRecords = [];
  updateExportState("not_loaded", message);
}

function updateExample(cells = []) {
  // Overview anchors are original observations from the selected month/platform.
  const cell = cells.reduce((best, candidate) => !best || candidate[2] > best[2] ? candidate : best, null);
  latitudeInput.placeholder = cell ? String(cell[4]) : "";
  longitudeInput.placeholder = cell ? String(cell[3]) : "";
  exampleButton.hidden = !cell;
}

function bundleFile(month, x, y) {
  return month + "-" + Math.floor(x / 10) + "-" + Math.floor(y / 10) + ".json";
}

function getBundle(name) {
  if (!bundleCache.has(name)) {
    const request = readJson("./data/" + country + "-hotspots-v2/" + name);
    bundleCache.set(name, request);
    request.catch(() => { if (bundleCache.get(name) === request) bundleCache.delete(name); });
    while (bundleCache.size > 4) bundleCache.delete(bundleCache.keys().next().value);
  }
  return bundleCache.get(name);
}

function visibleCells(month) {
  const bounds = map.getBounds();
  return (overview?.[month] || []).filter(([x, y]) =>
    (x + 1) / 2 >= bounds.getWest() && x / 2 <= bounds.getEast()
    && (y + 1) / 2 >= bounds.getSouth() && y / 2 <= bounds.getNorth());
}

function showOverview(cells) {
  map.getSource("points").setData(empty());
  clearMarkers();
  resetDetailedRecords(selection.count === null
    ? "Export unavailable: this month’s catalog period is unavailable."
    : selection.count === 0 ? "No hotspots were recorded this month."
      : "Zoom in or go to an example hotspot to load records for CSV export.");
  const groups = [];
  for (const [, , total, lon, lat] of cells) {
    const pixel = map.project([lon, lat]);
    const group = groups.find(item => Math.hypot(item.pixel.x - pixel.x, item.pixel.y - pixel.y) < 32);
    if (group) group.total += total;
    else groups.push({ lon, lat, total, pixel });
  }
  map.getSource("clusters").setData({ type: "FeatureCollection", features: groups.map(group => ({
    type: "Feature", geometry: { type: "Point", coordinates: [group.lon, group.lat] }, properties: { total: group.total },
  })) });
  for (const group of groups) {
    const label = document.createElement("span");
    label.className = "map-cluster-label";
    label.textContent = group.total >= 1000 ? (group.total / 1000).toFixed(1) + "k" : String(group.total);
    markers.push(new maplibregl.Marker({ element: label, anchor: "center" }).setLngLat([group.lon, group.lat]).addTo(map));
  }
  detail.textContent = groups.length
    ? "Numbered circles group detections; zoom in for original hotspot locations."
    : selection.count === null ? "No coordinates shown; this month's coverage is unavailable."
      : "No recorded hotspots this month.";
}

async function showPoints(cells, version) {
  clearMarkers();
  map.getSource("clusters").setData(empty());
  if (!cells.length) {
    map.getSource("points").setData(empty());
    detail.textContent = selection.count ? "No recorded hotspots in this view." : "";
    visiblePointRecords = [];
    updateExportState("empty", selection.count === null
      ? "Export unavailable: this month’s catalog period is unavailable."
      : "No detailed records are in the current map view; there is no CSV to export.");
    return;
  }
  detail.textContent = "Loading visible hotspots…";
  visiblePointRecords = [];
  updateExportState("loading", "Loading detailed point records for the current map view…");
  const names = [...new Set(cells.map(([x, y]) => bundleFile(selection.month, x, y)))];
  const bundles = new Map(await Promise.all(names.map(async name => [name, await getBundle(name)])));
  if (version !== revision) return;
  const bounds = map.getBounds();
  const features = [];
  const records = [];
  for (const [x, y] of cells) {
    for (const [lon, lat, date, time, confidence] of bundles.get(bundleFile(selection.month, x, y))[x + ":" + y] || []) {
      if (!bounds.contains([lon, lat])) continue;
      features.push({ type: "Feature", geometry: { type: "Point", coordinates: [lon, lat] }, properties: { date, time, confidence } });
      records.push({ lon, lat, date, time, confidence });
    }
  }
  map.getSource("points").setData({ type: "FeatureCollection", features });
  visiblePointRecords = records;
  detail.textContent = features.length ? number.format(features.length) + " recorded hotspots in the current map view. Select a hotspot to inspect it." : "No recorded hotspots in this view.";
  updateExportState(features.length ? "ready" : "empty", features.length
    ? number.format(features.length) + " detailed point records ready for current-map-view CSV export."
    : "No detailed records are in the current map view; there is no CSV to export.");
}

async function refresh() {
  const version = ++revision;
  if (!ready || !selection || !overview || map.isMoving()) return;
  try {
    const cells = visibleCells(selection.month);
    const pixelsPerDegree = map.project([1, 0]).x - map.project([0, 0]).x;
    if (map.getZoom() <= fitZoom + 0.5 || pixelsPerDegree < 180) showOverview(cells);
    else await showPoints(cells, version);
  } catch (error) {
    if (version !== revision) return;
    detail.textContent = "Could not load map data. Pan or zoom to retry.";
    visiblePointRecords = [];
    updateExportState("failed", "Export unavailable because detailed map records could not load. Pan or zoom to retry.");
    console.error(error);
  }
}

export async function updateHotspotMap(key, month, platform, count, coverage) {
  const changedCountry = country !== key;
  const changedMonth = selection?.month !== month;
  country = key;
  selection = { month, platform, count, coverage };
  if (changedCountry || changedMonth) updateExample();
  container.setAttribute("aria-label", countries[key].name + " " + platform + " hotspot map for " + month);
  caption.textContent = (count === null ? "Monthly hotspot count unavailable" : number.format(count) + " recorded vegetation hotspots") + " · " + coverage;
  resetDetailedRecords(count === null
    ? "Export unavailable: this month’s catalog period is unavailable."
    : "Zoom in to load detailed points before exporting the current map view.");
  if (changedCountry) {
    revision++;
    overview = null;
    context = null;
    bundleCache.clear();
    clearMarkers();
    for (const marker of placeMarkers) marker.remove();
    placeMarkers = [];
    if (ready) {
      map.getSource("outline").setData(empty());
      map.getSource("roads").setData(empty());
      map.getSource("rivers").setData(empty());
      map.getSource("clusters").setData(empty());
      map.getSource("points").setData(empty());
    }
    loadedOutlineKey = undefined;
    detail.textContent = "Loading hotspot map…";
  } else if (changedMonth) {
    revision++;
    bundleCache.clear();
    detail.textContent = "Loading hotspot map…";
  }
  try {
    const [months, outline, baseContext] = await getCountrySources(key);
    if (country !== key || selection.month !== month) return;
    overview = months;
    updateExample(months[month]);
    context = baseContext;
    if (!ready) return;
    if (loadedOutlineKey !== key) {
      map.getSource("outline").setData({ type: "Feature", geometry: outline, properties: {} });
      for (const kind of ["roads", "rivers"]) {
        map.getSource(kind).setData({ type: "FeatureCollection", features: baseContext[kind] });
      }
      loadedOutlineKey = key;
    }
    // Apply the fit after the selected country's map assets are ready. This
    // avoids ever leaving the constructor's fallback camera as the default.
    if (changedCountry) fitCountry();
    showPlaces();
    void refresh();
  } catch (error) {
    if (country === key) detail.textContent = "Could not load map data. Select another country and retry.";
    console.error(error);
  }
}

map.on("style.load", () => {
  ready = true;
  if (country) {
    fitCountry();
    void updateHotspotMap(country, selection.month, selection.platform, selection.count, selection.coverage);
  }
});
map.on("movestart", () => {
  revision++;
  resetDetailedRecords("Waiting for the map to settle before loading records for export…");
});
map.on("moveend", () => { showPlaces(); void refresh(); });
map.on("click", "cluster-circles", event => {
  const point = event.features?.[0]?.geometry.coordinates;
  if (point) map.easeTo({ center: point, zoom: Math.min(16, map.getZoom() + 1), duration: 250 });
});
map.on("click", "hotspot-points", event => {
  const feature = event.features?.[0];
  if (!feature) return;
  const [lon, lat] = feature.geometry.coordinates;
  const { date, time, confidence } = feature.properties;
  const hhmm = time ? String(time).padStart(4, "0") : "";
  const acquired = hhmm ? date + " " + hhmm.slice(0, 2) + ":" + hhmm.slice(2) + " UTC" : date;
  detail.textContent = selection.platform + " · " + acquired + " · " + lat + "°, " + lon + "°" + (confidence ? " · Confidence " + confidence : "");
});
for (const layer of ["cluster-circles", "hotspot-points"]) {
  map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
  map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
}
map.on("error", event => {
  if (event.sourceId === "elevation" || /elevation-tiles-prod/.test(String(event.error?.message))) {
    detail.textContent = "Terrain tiles unavailable; hotspot data remains usable.";
  }
});
document.getElementById("map-fit").addEventListener("click", fitCountry);
const coordinateForm = document.getElementById("map-coordinate-form");
exampleButton.addEventListener("click", () => {
  latitudeInput.value = latitudeInput.placeholder;
  longitudeInput.value = longitudeInput.placeholder;
  coordinateForm.requestSubmit();
});
coordinateForm.addEventListener("submit", event => {
  event.preventDefault();
  if (!country || !selection) return;
  const latitudeText = latitudeInput.value.trim();
  const longitudeText = longitudeInput.value.trim();
  const latitude = Number(latitudeText);
  const longitude = Number(longitudeText);
  const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (!latitudeText || !longitudeText || !decimal.test(latitudeText) || !decimal.test(longitudeText)
    || !Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    coordinateStatus.textContent = "Enter signed decimal degrees: latitude −90 to 90 and longitude −180 to 180.";
    return;
  }
  const [west, south, east, north] = countries[country].bounds;
  const outside = longitude < west || longitude > east || latitude < south || latitude > north;
  coordinateStatus.textContent = "Coordinate target: " + latitude.toFixed(5) + "°, " + longitude.toFixed(5) + "° · "
    + countries[country].name + " · " + selection.month + " · " + selection.platform
    + (outside ? ". Outside the selected country; its existing catalog may have no data here." : ".");
  map.easeTo({ center: [longitude, latitude], zoom: Math.min(12, map.getMaxZoom()), duration: 300 });
});

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}

exportButton.addEventListener("click", () => {
  if (pointLoadState !== "ready" || !visiblePointRecords.length || !selection || !country) return;
  const countryInfo = countries[country];
  const header = ["country_key", "country_name", "selected_month", "platform", "longitude", "latitude", "acquisition_date", "acquisition_time_utc", "confidence", "data_scope", "filter_note", "source", "product_version"];
  const rows = visiblePointRecords.map(record => [country, countryInfo.name, selection.month, selection.platform,
    record.lon, record.lat, record.date, record.time === undefined || record.time === null || record.time === "" ? "" : String(record.time).padStart(4, "0"),
    record.confidence || "", "current_map_view", "Presumed vegetation detections (FIRMS type=0); recorded coordinates are unadjusted.", "NASA FIRMS active-fire catalog", ""]);
  const content = "\uFEFF" + [header, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const filename = "fireatlas-" + country + "-" + selection.month + "-" + selection.platform.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-current-map-view.csv";
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
  exportStatus.textContent = number.format(rows.length) + " detailed point records exported from the current map view.";
});
new ResizeObserver(() => map.resize()).observe(container);
