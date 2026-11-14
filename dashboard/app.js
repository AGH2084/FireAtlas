import { updateHotspotMap } from "./hotspot-map.js?v=8";
import { initStory } from "./story.js?v=2";

const $ = (id) => document.getElementById(id);
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const displayDate = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });
const number = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const labels = {
  before_record: "Before the satellite record",
  partial_start_year: "Partial start year",
  file_unavailable: "Country-year file unavailable",
  platform_absent_from_file: "Satellite absent from country-year file",
  known_outage: "Known satellite outage",
  unsupported_calibration: "Calibration unsupported",
  early_era_extrapolation: "Early-era extrapolation",
  catalog_available_coverage_unknown: "Observation coverage unknown",
};
const REFERENCE = "Aqua";
const ELIGIBLE = "catalog_available_coverage_unknown";
const validationLink = '<a href="#validation">See held-out results</a>';
const state = { history: null, selected: "", key: "", request: null };

const dateLabel = (month) => displayDate.format(new Date(month + "-01T00:00:00Z"));
const format = (value) => value === null ? "—" : number.format(value);
const metric = (value, label) => '<div class="metric"><strong>' + format(value) + "</strong><span>" + label + "</span></div>";
const detailNote = (html) => '<p class="detail-note">' + html + "</p>";
const yearOf = (row) => Number(row.month.slice(0, 4));

const isRawView = () => $("count-view").value === "raw";
const selectedReading = (row) => row.platforms[row.index.platform];
const rawStatus = (row) => row.index.status === "before_record" ? row.index.status : selectedReading(row).status;
const rawCount = (row) => rawStatus(row) === "before_record" ? null : selectedReading(row).vegetation_detections;
const adjustedCount = (row) => row.index.value;
const platformStarts = { "2003-01": "Aqua", "2019-01": "NOAA-20" };

function peakMonth(rows, count) {
  return rows.reduce((best, row) => (count(row) ?? -1) > (count(best) ?? -1) ? row : best);
}

function scale(value, peak) {
  return Math.min(4, Math.floor(Math.sqrt(value / (peak || 1)) * 5));
}

function renderCalendar() {
  const start = Number($("from").value);
  const end = Number($("to").value);
  const rows = state.history.months.filter((row) => yearOf(row) >= start && yearOf(row) <= end);
  const raw = isRawView();
  const count = raw ? rawCount : adjustedCount;
  const peak = peakMonth(rows, count);
  const maximum = count(peak) ?? 0;
  const adjustedPeak = raw ? peakMonth(rows, adjustedCount) : peak;
  const unit = raw ? "recorded vegetation detections" : "Aqua-equivalent detections";
  $("calendar-unit").textContent = raw ? "Recorded vegetation hotspot detections" : "Aqua-equivalent vegetation hotspot detections";
  $("comparison-guide").hidden = !raw;
  $("validation-guide").hidden = !raw;
  if (!rows.some((row) => row.month === state.selected)) state.selected = peak.month;
  const header = "<thead><tr><th scope='col'>Year</th>" + months.map((month) =>
    '<th scope="col"><span class="month-name">' + month + '</span><span class="month-initial" aria-hidden="true">' + month[0] + '</span></th>'
  ).join("") + "</tr></thead>";
  let body = "";
  for (let year = end; year >= start; year--) {
    body += '<tr><th scope="row">' + year + "</th>";
    for (const row of rows.filter((item) => yearOf(item) === year)) {
      const value = count(row);
      const status = raw ? rawStatus(row) : row.index.status;
      const transition = raw ? platformStarts[row.month] : undefined;
      let info = dateLabel(row.month) + ", " + (value === null ? labels[status] : format(value) + " " + unit);
      if (raw) {
        info += " · " + row.index.platform;
        if (value !== null && status !== "catalog_available_coverage_unknown") info += " · " + labels[status];
        if (transition) info += " · Calendar switches to " + transition;
      }
      body += '<td><button type="button" class="month ' + (value === null ? "gap" : "level-" + scale(value, maximum))
        + (transition ? " platform-start" : "")
        + '" data-month="' + row.month + '" aria-label="' + info + '" title="' + info
        + '" aria-pressed="' + (state.selected === row.month) + '"></button></td>';
    }
    body += "</tr>";
  }
  $("calendar").innerHTML = header + "<tbody>" + body + "</tbody>";
  const selected = $("calendar").querySelector('[aria-pressed="true"]');
  const scroller = $("calendar-scroll");
  scroller.scrollTop = 0;
  const overflow = selected.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom;
  if (overflow > 0) scroller.scrollTop = overflow + 4;
  $("scale-end").textContent = "0–" + format(maximum);
  if (raw) {
    const rawPeak = rawCount(peak) === null ? "No recorded counts in view."
      : "Raw peak: " + dateLabel(peak.month) + " (" + format(maximum) + ", " + peak.index.platform + ").";
    const harmonizedPeak = adjustedCount(adjustedPeak) === null ? "No harmonized estimates in view."
      : "Harmonized peak: " + dateLabel(adjustedPeak.month) + " (" + format(adjustedCount(adjustedPeak)) + " Aqua-equivalent).";
    $("calendar-context").textContent = rawPeak + " " + harmonizedPeak;
  } else {
    $("calendar-context").textContent = peak.index.value === null
      ? "No index values in the selected range."
      : dateLabel(peak.month) + " had the highest index in view (" + format(maximum) + ").";
  }
  renderMonth();
}

function comparisonMarkup(row) {
  const platform = row.index.platform;
  const aqua = row.platforms[REFERENCE];
  if (platform === REFERENCE) {
    if (aqua.status === ELIGIBLE) {
      return metric(aqua.vegetation_detections, "Aqua recorded vegetation detections")
        + detailNote("Aqua is the reference platform for this month; no cross-satellite adjustment is applied. " + validationLink + ".");
    }
    return metric(aqua.vegetation_detections, "Aqua recorded vegetation detections")
      + metric(row.index.value, "Aqua-equivalent detections")
      + detailNote("Aqua has no usable record for this month (" + labels[aqua.status] + "). " + validationLink + ".");
  }
  const source = row.platforms[platform];
  if (aqua.status !== ELIGIBLE) {
    return metric(source.vegetation_detections, platform + " recorded vegetation detections")
      + metric(row.index.value, "Aqua-equivalent detections")
      + detailNote("Same-month comparison unavailable — Aqua has no usable observation for this month (" + labels[aqua.status] + "). " + validationLink + ".");
  }
  if (source.status !== ELIGIBLE) {
    return metric(source.vegetation_detections, platform + " recorded vegetation detections")
      + metric(row.index.value, "Aqua-equivalent detections")
      + detailNote("Same-month comparison unavailable — " + platform + " has no usable observation for this month (" + labels[source.status] + "). " + validationLink + ".");
  }
  const estimateNote = row.index.value === null
    ? detailNote(labels[row.index.status] + ".")
    : row.index.status === "early_era_extrapolation" ? detailNote("Early-era extrapolation.") : "";
  return '<table class="sensors comparison" aria-label="Same-month satellite comparison">'
    + "<caption>Same-month satellite comparison</caption>"
    + '<thead><tr><th scope="col">What you’re looking at</th><th scope="col">Vegetation detections</th></tr></thead>'
    + "<tbody>"
    + '<tr><th scope="row">Aqua recorded</th><td>' + format(aqua.vegetation_detections) + "</td></tr>"
    + '<tr><th scope="row">' + platform + ' recorded</th><td>' + format(source.vegetation_detections) + "</td></tr>"
    + '<tr><th scope="row">' + platform + " estimated on Aqua’s scale</th><td>" + format(row.index.value) + "</td></tr>"
    + "</tbody></table>"
    + detailNote("Both series have unknown observation coverage; Aqua is the reference. " + validationLink + ".")
    + estimateNote;
}

function renderMonth() {
  const row = state.history.months.find((item) => item.month === state.selected);
  $("month-title").textContent = dateLabel(row.month);
  const note = row.index.value === null
    ? labels[row.index.status]
    : row.index.platform + (row.index.status === "early_era_extrapolation" ? " · Early-era extrapolation" : " · Observation coverage unknown");
  const raw = isRawView();
  const sensorRows = Object.entries(row.platforms).map(([name, data]) => {
    const outage = data.status === "known_outage" ? " · known outage" : "";
    const used = raw && name === row.index.platform;
    return (used ? '<tr class="selected-platform">' : "<tr>") + "<th scope='row'>" + name + outage + "</th><td>" + format(data.raw_detections)
      + "</td><td>" + format(data.vegetation_detections) + "</td></tr>";
  }).join("");
  const seasonal = state.history.months.filter((item) =>
    item.month.slice(5) === row.month.slice(5) && item.month < row.month
    && item.index.value !== null && item.index.status !== "early_era_extrapolation"
  ).map((item) => item.index.value).sort((a, b) => a - b);
  const middle = Math.floor(seasonal.length / 2);
  const median = seasonal.length % 2 ? seasonal[middle] : (seasonal[middle - 1] + seasonal[middle]) / 2;
  const seasonalNote = row.index.value !== null && seasonal.length >= 5
    ? '<p class="detail-note">Median for this month in ' + seasonal.length + ' earlier years · ' + format(median) + "</p>" : "";
  $("month-metrics").innerHTML = (raw
    ? comparisonMarkup(row)
    : metric(row.index.value, "Aqua-equivalent detections") + '<p class="detail-note">' + note + "</p>") + seasonalNote;
  $("month-satellites").innerHTML = '<table class="sensors" aria-label="Original satellite detections">'
    + '<thead><tr><th scope="col">Satellite</th><th scope="col">All</th><th scope="col">Vegetation</th></tr></thead><tbody>'
    + sensorRows + "</tbody></table>";
  renderMap(row);
}

function renderMap(row) {
  $("map-comparison").hidden = !isRawView();
  $("map-controls").hidden = false;
  $("map-credit").hidden = false;
  $("map").setAttribute("data-interactive", "");
  $("map").tabIndex = 0;
  const platform = row.index.platform;
  $("map-satellite").textContent = platform + " · " + dateLabel(row.month);
  updateHotspotMap(state.key, row.month, platform, rawCount(row), labels[rawStatus(row)]);
}

function renderValidation() {
  const rows = Object.entries(state.history.bridges).map(([platform, bridge]) => {
    const range = bridge.holdout_years.join("–");
    return "<tr><th scope='row'>" + platform + "</th><td>" + range + "</td><td>"
      + format(bridge.unadjusted.mae ?? null) + "</td><td>" + format(bridge.adjusted?.mae ?? null) + "</td></tr>";
  });
  $("validation").innerHTML = '<table class="validation"><thead><tr><th scope="col">Satellite</th>'
    + '<th scope="col">Held-out years</th><th scope="col">Raw error</th><th scope="col">Adjusted error</th>'
    + "</tr></thead><tbody>" + rows.join("") + "</tbody></table><p>Errors are average absolute differences from Aqua vegetation hotspot counts per month.</p>";
}

async function loadCountry(key) {
  state.request?.abort();
  const request = new AbortController();
  state.request = request;
  $("status").hidden = false;
  $("status").textContent = "Loading monthly detections…";
  $("workspace").hidden = true;
  for (const id of ["from", "to"]) $(id).disabled = true;
  try {
    const response = await fetch("./data/" + key + ".json", { signal: request.signal });
    if (!response.ok) throw new Error("Data file unavailable");
    const history = await response.json();
    if (request.signal.aborted) return;
    Object.assign(state, { history, key, selected: "" });
    $("workspace").hidden = false;
    renderCalendar();
    renderValidation();
    $("status").hidden = true;
    for (const id of ["from", "to"]) $(id).disabled = false;
    return true;
  } catch (error) {
    if (request.signal.aborted) return false;
    $("workspace").hidden = true;
    $("status").textContent = "Could not load this country's data. Reload the page or select another country.";
    console.error(error);
    return false;
  }
}

async function openExplorerExample() {
  $("country").value = "pilot";
  $("count-view").value = "raw";
  $("from").value = "2000";
  $("to").value = "2025";
  const ready = state.key === "pilot" && state.history ? true : await loadCountry("pilot");
  if (!ready) return false;
  state.selected = "2019-09";
  renderCalendar();
  $("explore").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  $("calendar-title").focus({ preventScroll: true });
  return true;
}

for (const id of ["from", "to"]) {
  for (let year = 2000; year <= 2025; year++) $(id).add(new Option(year, year));
}
$("from").value = "2014";
$("to").value = "2025";
$("filters").addEventListener("submit", (event) => event.preventDefault());
$("country").addEventListener("change", (event) => loadCountry(event.target.value));
$("from").addEventListener("change", () => {
  if (+$("from").value > +$("to").value) $("to").value = $("from").value;
  renderCalendar();
});
$("to").addEventListener("change", () => {
  if (+$("to").value < +$("from").value) $("from").value = $("to").value;
  renderCalendar();
});
$("count-view").addEventListener("change", renderCalendar);
$("all-years").addEventListener("click", () => {
  $("from").value = "2000";
  $("to").value = "2025";
  renderCalendar();
});
$("calendar").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-month]");
  if (!button) return;
  $("calendar").querySelector('[aria-pressed="true"]')?.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-pressed", "true");
  state.selected = button.dataset.month;
  renderMonth();
});
new ResizeObserver(() => {
  if (!$("workspace").hidden && state.selected) {
    renderMap(state.history.months.find((row) => row.month === state.selected));
  }
}).observe($("map"));
loadCountry($("country").value);
initStory({ onOpenExample: openExplorerExample });
