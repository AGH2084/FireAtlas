const canvas = document.getElementById("map");
const caption = document.getElementById("map-caption");
const detail = document.getElementById("map-point");
const zoomIn = document.getElementById("map-in");
const zoomOut = document.getElementById("map-out");
let directory;
let country;
const countries = {
  pilot: { name: "Bulgaria", bounds: [22.3, 41.2, 28.7, 44.3] },
  canada: { name: "Canada", bounds: [-141.1, 41.6, -52.5, 83.2] },
  "south-africa": { name: "South Africa", bounds: [16.3, -35, 33, -22] },
};
const mercator = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) * 180 / Math.PI;
const latitude = y => (2 * Math.atan(Math.exp(y * Math.PI / 180)) - Math.PI / 2) * 180 / Math.PI;
function fitCenter() {
  const [w, s, e, n] = countries[country].bounds;
  return [(w + e) / 2, latitude((mercator(s) + mercator(n)) / 2)];
}
function viewScale() {
  const [w, s, e, n] = countries[country].bounds;
  return Math.min((canvas.clientWidth - 64) / (e - w), (canvas.clientHeight - 64) / (mercator(n) - mercator(s))) * zoom;
}
const context = canvas.getContext("2d");
const number = new Intl.NumberFormat("en");
const cache = new Map();
let sources;
let selection;
let drag;
let marks = [];
let revision = 0;
let zoom = 1;
let center = [25.5, 42.75];

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Map data unavailable");
  return response.json();
}

function pointFile(month, x, y) {
  const name = month + "-" + Math.floor(x / 10) + "-" + Math.floor(y / 10) + ".json";
  if (!cache.has(name)) {
    const request = readJson(directory + name);
    cache.set(name, request);
    request.catch(() => {
      if (cache.get(name) === request) cache.delete(name);
    });
    if (cache.size > 96) cache.delete(cache.keys().next().value);
  }
  return cache.get(name).then(bundle => bundle[x + ":" + y] || []);
}

async function draw() {
  const version = ++revision;
  const current = selection;
  if (!current || !canvas.hasAttribute("data-interactive")) return;
  const { month, count, coverage } = current;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  if (!sources) {
    sources = Promise.all([readJson(directory + "overview.json"), readJson("./" + country + "-outline.json")]);
    sources.catch(() => { sources = null; });
  }
  marks = [];
  try {
    const [overview, outline] = await sources;
    if (version !== revision || !canvas.hasAttribute("data-interactive")) return;

    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    context.scale(pixelRatio, pixelRatio);
    const scale = viewScale();
    const project = (lon, lat) => [width / 2 + (lon - center[0]) * scale, height / 2 - (mercator(lat) - mercator(center[1])) * scale];
    const polygons = outline.type === "Polygon" ? [outline.coordinates] : outline.coordinates;
    context.beginPath();
    for (const polygon of polygons) {
      for (const ring of polygon) {
        context.moveTo(...project(...ring[0]));
        for (const point of ring.slice(1)) context.lineTo(...project(...point));
        context.closePath();
      }
    }
    context.fillStyle = "#fff";
    context.strokeStyle = "#747c88";
    context.fill("evenodd");
    context.stroke();

    const cells = (overview[month] || []).filter(([x, y]) => {
      const [left, bottom] = project(x / 2, y / 2);
      const [right, top] = project((x + 1) / 2, (y + 1) / 2);
      return left <= width && bottom >= 0 && right >= 0 && top <= height;
    });
    caption.textContent = (count === null ? "Hotspot records unavailable" : number.format(count) + " recorded vegetation hotspots")
      + " · " + coverage;
    // Keep the country-fit view clustered; reveal raw points only after a real zoom-in.
    const showPoints = zoom > 1 && scale >= 120 && !drag;
    if (!showPoints) {
      const clusters = [];
      for (const [x, y, total, lon, lat] of cells) {
        const [px, py] = project(lon, lat);
        const previous = clusters.find(group => Math.hypot(group[3] - px, group[4] - py) < 32);
        if (previous) previous[2] += total;
        else clusters.push([lon, lat, total, px, py]);
      }
      detail.textContent = "Numbered circles group detections; zoom in for original hotspot locations.";
      for (const [lon, lat, total] of clusters) {
        const [cx, cy] = project(lon, lat);
        const radius = 14;
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.fillStyle = "#a13426";
        context.fill();
        context.fillStyle = "#fff";
        context.font = "600 11px system-ui";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(total >= 1000 ? (total / 1000).toFixed(1) + "k" : String(total), cx, cy, radius * 1.8);
        marks.push({ x: cx, y: cy, radius, location: [lon, lat] });
      }
      return;
    }

    if (!cells.length) {
      detail.textContent = count ? "No recorded hotspots in this view." : "";
      return;
    }
    detail.textContent = "Loading visible hotspots…";
    const groups = await Promise.all(cells.map(([x, y]) => pointFile(month, x, y)));
    if (version !== revision || !canvas.hasAttribute("data-interactive")) return;
    context.fillStyle = "#a13426";
    for (const group of groups) {
      for (const point of group) {
        const [x, y] = project(point[0], point[1]);
        if (x < 0 || y < 0 || x > width || y > height) continue;
        context.fillRect(x - 1.5, y - 1.5, 3, 3);
        marks.push({ x, y, radius: 7, point });
      }
    }
    detail.textContent = marks.length ? "Select a hotspot to inspect it." : "No recorded hotspots in this view.";
  } catch {
    if (version === revision && canvas.hasAttribute("data-interactive")) {
      detail.textContent = "Could not load map data. Use Fit country to retry.";
    }
  }
}

function setView(level, location = center) {
  zoom = Math.min(256, Math.max(1, level));
  center = location;
  zoomIn.disabled = zoom >= 256;
  zoomOut.disabled = zoom <= 1;
  detail.textContent = "";
  void draw();
}

export function updateHotspotMap(key, month, platform, count, coverage) {
  if (country !== key) {
    country = key;
    directory = "./data/" + key + "-hotspots-v2/";
    sources = null;
    cache.clear();
    selection = null;
    zoom = 1;
    center = fitCenter();
    zoomOut.disabled = true;
    zoomIn.disabled = false;
  }
  if (selection?.month !== month) {
    selection = { month, platform, count, coverage };
    detail.textContent = "";
    caption.textContent = "Loading hotspot map…";
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.setAttribute("aria-label", countries[country].name + " " + platform + " hotspot map for " + month);
  void draw();
}

zoomIn.addEventListener("click", () => setView(zoom * 2));
zoomOut.addEventListener("click", () => setView(zoom / 2));
zoomOut.disabled = true;
document.getElementById("map-fit").addEventListener("click", () => setView(1, fitCenter()));

canvas.addEventListener("pointerdown", (event) => {
  if (!canvas.hasAttribute("data-interactive") || event.button !== 0 || drag) return;
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: center, moved: false };
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.moved && Math.hypot(dx, dy) < 4) return;
  drag.moved = true;
  const scale = viewScale();
  setView(zoom, [drag.origin[0] - dx / scale, latitude(mercator(drag.origin[1]) + dy / scale)]);
});

canvas.addEventListener("pointerup", (event) => {
  if (drag?.id !== event.pointerId) return;
  const { moved } = drag;
  drag = null;
  if (moved) {
    void draw();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  let nearest;
  let distance = Infinity;
  for (const mark of marks) {
    const delta = Math.hypot(mark.x - x, mark.y - y);
    if (delta <= mark.radius && delta < distance) {
      nearest = mark;
      distance = delta;
    }
  }
  if (nearest?.location) {
    setView(zoom * 2, nearest.location);
  } else if (nearest?.point) {
    const [lon, lat, date, hhmm, confidence] = nearest.point;
    const time = hhmm.padStart(4, "0");
    const acquired = hhmm ? date + " " + time.slice(0, 2) + ":" + time.slice(2) + " UTC" : date;
    detail.textContent = selection.platform + " · " + acquired + " · " + lat + "°, " + lon + "°"
      + (confidence ? " · Confidence " + confidence : "");
  }
});

canvas.addEventListener("lostpointercapture", () => {
  if (!drag) return;
  drag = null;
  void draw();
});

canvas.addEventListener("keydown", (event) => {
  const offset = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
  if (!offset || !canvas.hasAttribute("data-interactive")) return;
  event.preventDefault();
  setView(zoom, [center[0] + offset[0] / zoom, center[1] + offset[1] / zoom]);
});
