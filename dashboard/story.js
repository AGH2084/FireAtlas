const $ = (id) => document.getElementById(id);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const displayDate = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" });
const number = new Intl.NumberFormat("en", { maximumFractionDigits: 1 });
const estimate = new Intl.NumberFormat("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

const format = (value) => value === null ? "—" : number.format(value);
const formatEstimate = (value) => value === null ? "—" : estimate.format(value);
const formatInteger = (value) => integer.format(value);
const dateLabel = (month) => displayDate.format(new Date(month + "-01T00:00:00Z"));
const shortLabel = (month) => shortDate.format(new Date(month + "-01T00:00:00Z"));
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const stageStep = { inspect: 1, reveal: 2, adjusted: 2, compare: 3, handoff: 4 };

function buildModel(history) {
  const rows = history.months;
  const bridge = history.bridges?.["NOAA-20"];
  const example = rows.find((row) => row.month === "2019-09");
  if (!Array.isArray(rows) || !rows.length || !bridge || !example) throw new Error("Bulgaria story data is incomplete");

  const rawValue = (row) => row.index.value === null
    ? null
    : (row.platforms[row.index.platform]?.vegetation_detections ?? null);
  const eligible = rows.filter((row) => row.index.value !== null && rawValue(row) !== null);
  if (!eligible.length) throw new Error("Bulgaria story has no eligible months");

  const rawPeak = eligible.reduce((best, row) => rawValue(row) > rawValue(best) ? row : best);
  const adjustedPeak = eligible.reduce((best, row) => row.index.value > best.index.value ? row : best);
  const peak = Math.max(rawValue(rawPeak), adjustedPeak.index.value);
  const scaleMax = Math.ceil(peak / 1500) * 1500;
  const ticks = [0, scaleMax / 3, scaleMax * 2 / 3, scaleMax];
  const firstEligible = rows.findIndex((row) => row.index.value !== null && rawValue(row) !== null);

  return {
    history, rows, bridge, example, rawValue, eligible,
    rawPeak, adjustedPeak, scaleMax, ticks, firstEligible,
  };
}

function chartGeometry(width, height, withPlatforms, rows, scaleMax, ticks) {
  const left = 54;
  const right = 16;
  const top = withPlatforms ? 42 : 28;
  const bottom = 30;
  const plotW = Math.max(10, width - left - right);
  const plotH = height - top - bottom;
  const step = plotW / rows.length;
  return {
    width, height, left, right, top, bottom, plotW, plotH,
    step, barW: Math.max(1, step - 1), rows, scaleMax, ticks,
  };
}

function yearTicks(width) {
  if (width < 560) return [2003, 2010, 2017, 2024];
  if (width < 820) return [2001, 2006, 2011, 2016, 2021, 2025];
  return [2001, 2005, 2009, 2013, 2017, 2021, 2025];
}

function chartHeadMarkup(mode) {
  const name = mode === "adjusted" ? "Aqua-equivalent detections" : "Recorded detections";
  return '<div class="story-chart-head"><h3 id="story-chart-title">' + name
    + ' <span>· Bulgaria</span></h3><span>2000–2025</span></div>';
}

function platformKeyMarkup() {
  return '<p class="story-platform-key" aria-label="Satellite in use over time">'
    + '<span><i class="era-terra"></i>Terra 2001–02</span>'
    + '<span><i class="era-aqua"></i>Aqua 2003–18</span>'
    + '<span><i class="era-noaa"></i>NOAA-20 2019–25</span></p>';
}

function calloutsMarkup(mode, model) {
  if (mode === "adjusted") {
    const peak = model.adjustedPeak;
    const peakDetail = peak.index.status === "early_era_extrapolation"
      ? peak.index.platform + " estimate · extrapolated"
      : peak.index.platform + " estimate";
    return '<div class="story-callouts">'
      + '<div class="story-callout is-key"><span class="callout-eyebrow">Highest estimate · '
      + shortLabel(peak.month) + '</span><strong>' + formatEstimate(peak.index.value) + '</strong>'
      + '<span class="callout-detail">' + peakDetail + '</span></div>'
      + '<div class="story-callout"><span class="callout-eyebrow">' + shortLabel(model.example.month)
      + '</span><strong class="callout-small">' + formatEstimate(model.example.index.value) + '</strong>'
      + '<span class="callout-detail">' + model.example.index.platform + ' on Aqua’s scale</span></div>'
      + '</div>';
  }
  const peak = model.rawPeak;
  return '<div class="story-callouts">'
    + '<div class="story-callout is-key"><span class="callout-eyebrow">Recorded peak · '
    + shortLabel(peak.month) + '</span><strong>' + format(model.rawValue(peak)) + '</strong>'
    + '<span class="callout-detail">' + peak.index.platform + ' recorded detections</span></div>'
    + '<div class="story-callout"><span class="callout-eyebrow">January 2019</span>'
    + '<span class="callout-text">NOAA-20 takes over</span>'
    + '<span class="callout-detail">One satellite supplies each month</span></div>'
    + '</div>';
}

function tableMarkup(mode, model) {
  const header = '<thead><tr><th scope="col">Year</th>'
    + MONTHS.map((month) => '<th scope="col">' + month + '</th>').join("") + '</tr></thead>';
  const years = [...new Set(model.rows.map((row) => row.month.slice(0, 4)))];
  const body = years.map((year) => {
    const cells = MONTHS.map((_, index) => {
      const month = year + "-" + String(index + 1).padStart(2, "0");
      const row = model.rows.find((item) => item.month === month);
      const value = !row ? null : mode === "adjusted" ? row.index.value : model.rawValue(row);
      return '<td' + (value === null ? ' class="is-gap"' : '') + '>'
        + (mode === "adjusted" ? formatEstimate(value) : format(value)) + '</td>';
    }).join("");
    return '<tr><th scope="row">' + year + '</th>' + cells + '</tr>';
  }).join("");
  const title = mode === "adjusted"
    ? "Monthly Aqua-equivalent vegetation detections in Bulgaria"
    : "Monthly recorded vegetation detections in Bulgaria";
  return '<details class="story-data"><summary>Read the monthly values as a table</summary>'
    + '<div class="story-table-wrap"><table><caption class="sr-only">' + title
    + '</caption>' + header + '<tbody>' + body + '</tbody></table></div>'
    + '<p class="story-table-note">A dash means no harmonized estimate is available for that month, not zero.</p>'
    + '</details>';
}

function timelineSvg(geom, mode, model, withPlatforms) {
  const rows = model.rows;
  const peak = mode === "adjusted" ? model.adjustedPeak : model.rawPeak;
  const peakIndex = rows.indexOf(peak);
  const exampleIndex = rows.indexOf(model.example);
  let bars = "";
  for (let index = 0; index < rows.length; index++) {
    const value = mode === "adjusted" ? rows[index].index.value : model.rawValue(rows[index]);
    if (value === null) continue;
    const x = geom.left + index * geom.step + (geom.step - geom.barW) / 2;
    const height = Math.max(1, value / geom.scaleMax * geom.plotH);
    const y = geom.top + geom.plotH - height;
    const classes = ["story-bar"];
    if (withPlatforms && index === peakIndex) classes.push("is-peak");
    if (mode === "adjusted" && index === exampleIndex && index !== peakIndex) classes.push("is-example");
    bars += '<rect class="' + classes.join(" ") + '" x="' + x.toFixed(2) + '" y="' + y.toFixed(2)
      + '" width="' + geom.barW.toFixed(2) + '" height="' + height.toFixed(2)
      + '" data-index="' + index + '"></rect>';
  }

  const grid = geom.ticks.map((tick) => {
    const y = geom.top + geom.plotH - tick / geom.scaleMax * geom.plotH;
    if (tick === 0) return "";
    return '<line class="story-grid" x1="' + geom.left + '" x2="' + (geom.left + geom.plotW)
      + '" y1="' + y.toFixed(2) + '" y2="' + y.toFixed(2) + '"></line>';
  }).join("");
  const yLabels = geom.ticks.map((tick) => {
    const y = geom.top + geom.plotH - tick / geom.scaleMax * geom.plotH;
    return '<text class="story-axis-text" x="' + (geom.left - 8) + '" y="' + (y + 4).toFixed(2)
      + '" text-anchor="end">' + formatInteger(tick) + '</text>';
  }).join("");
  const xLabels = yearTicks(geom.width).map((year) => {
    const index = rows.findIndex((row) => row.month === year + "-01");
    if (index < 0) return "";
    const x = geom.left + index * geom.step + geom.step / 2;
    return '<text class="story-axis-text" x="' + x.toFixed(2) + '" y="' + (geom.top + geom.plotH + 18)
      + '" text-anchor="middle">' + year + '</text>';
  }).join("");

  let platforms = "";
  if (withPlatforms) {
    const eras = [
      { from: "2001-01", to: "2002-12", cls: "terra" },
      { from: "2003-01", to: "2018-12", cls: "aqua" },
      { from: "2019-01", to: "2025-12", cls: "noaa" },
    ];
    for (const era of eras) {
      const start = rows.findIndex((row) => row.month === era.from);
      const end = rows.findIndex((row) => row.month === era.to);
      if (start < 0 || end < 0) continue;
      const x = geom.left + start * geom.step;
      const width = Math.max(1, (end - start + 1) * geom.step - 1);
      platforms += '<rect class="story-era story-era-' + era.cls + '" x="' + x.toFixed(2)
        + '" y="2" width="' + width.toFixed(2) + '" height="6"></rect>';
    }
    const transition = rows.findIndex((row) => row.month === "2019-01");
    if (transition >= 0) {
      const x = geom.left + transition * geom.step;
      platforms += '<line class="story-seam" x1="' + x.toFixed(2) + '" x2="' + x.toFixed(2)
        + '" y1="8" y2="' + (geom.top + geom.plotH) + '"></line>';
    }
  }

  const axisTitle = mode === "adjusted" ? "Aqua-equivalent / month" : "detections / month";
  return '<svg viewBox="0 0 ' + geom.width + ' ' + geom.height + '" width="' + geom.width
    + '" height="' + geom.height + '" aria-hidden="true" focusable="false">'
    + grid
    + '<g shape-rendering="crispEdges">' + bars + '</g>'
    + platforms
    + '<line class="story-baseline" x1="' + geom.left + '" x2="' + (geom.left + geom.plotW)
    + '" y1="' + (geom.top + geom.plotH) + '" y2="' + (geom.top + geom.plotH) + '"></line>'
    + yLabels + xLabels
    + '<text class="story-axis-title" x="0" y="' + (withPlatforms ? 27 : 17) + '">' + axisTitle + '</text>'
    + '<g class="story-marker" visibility="hidden"><line></line><circle r="2.5"></circle></g>'
    + '</svg>';
}

function chartSummary(mode, model, revealed) {
  if (!revealed) {
    const plotted = model.rows.filter((row) => model.rawValue(row) !== null).length;
    return "Monthly recorded vegetation detections in Bulgaria from 2000 to 2025, with "
      + plotted + " of " + model.rows.length + " months plotted. Use the month slider or the monthly table to inspect values. "
      + "Months without a harmonized estimate are gaps.";
  }
  const peak = mode === "adjusted" ? model.adjustedPeak : model.rawPeak;
  const value = mode === "adjusted" ? peak.index.value : model.rawValue(peak);
  let text = "Monthly " + (mode === "adjusted" ? "Aqua-equivalent" : "recorded")
    + " vegetation detections in Bulgaria from 2000 to 2025. " + dateLabel(peak.month)
    + " is highest at " + (mode === "adjusted" ? formatEstimate(value) : format(value)) + ".";
  if (mode === "adjusted") {
    text += " " + dateLabel(model.example.month) + " is " + formatEstimate(model.example.index.value)
      + ". The peak is an extrapolated Terra estimate.";
  } else {
    text += " NOAA-20 takes over in January 2019.";
  }
  return text + " Months without a harmonized estimate are gaps.";
}

function chartNoteMarkup(mode, interactive) {
  if (mode === "adjusted") {
    return 'Source: NASA FIRMS. Country-specific conversion fitted on overlap months. '
      + 'Early Terra values are extrapolated; blank months have no estimate.';
  }
  return 'Source: NASA FIRMS. Vegetation detections, not fire incidents. Blank months have no harmonized estimate.'
    + (interactive ? ' Hover, tap or use the slider.' : '');
}

function readoutMarkup(model, activeIndex) {
  return '<div class="story-readout">'
    + '<div class="story-readout-main"><span id="story-readout-month"></span>'
    + '<strong id="story-readout-value"></strong></div>'
    + '<span id="story-readout-unit"></span></div>'
    + '<input class="story-range" id="story-range" type="range" min="0" max="' + (model.rows.length - 1)
    + '" step="1" value="' + activeIndex + '" aria-label="Inspect a month" aria-describedby="story-chart-note">';
}

export async function initStory({ onOpenExample } = {}) {
  const root = $("story");
  if (!root) return;

  let model;
  try {
    const response = await fetch("./data/pilot.json");
    if (!response.ok) throw new Error("Bulgaria story data unavailable");
    model = buildModel(await response.json());
  } catch (error) {
    console.error(error);
    root.hidden = false;
    root.innerHTML = '<div class="opening-top"><p class="opening-kicker">'
      + '<span class="flame opening-flame" aria-hidden="true"></span>Guided record <span aria-hidden="true">·</span> Bulgaria</p></div>'
      + '<div class="opening-error"><h2>Guided opening unavailable</h2>'
      + '<p>The Bulgaria record could not load here. The explorer below still has the monthly data.</p>'
      + '<a href="#explore">Continue to the explorer</a></div>';
    return;
  }

  const state = {
    stage: "inspect",
    activeIndex: model.firstEligible,
    pinnedIndex: null,
    hoverIndex: null,
    dragging: false,
    chartMode: "raw",
    chartInteractive: false,
    lastWidth: 0,
    bars: [],
    geom: null,
    marker: null,
    rendered: false,
  };

  root.hidden = false;
  root.dataset.stage = state.stage;
  root.innerHTML = '<div class="opening-top">'
    + '<p class="opening-kicker"><span class="flame opening-flame" aria-hidden="true"></span>'
    + 'Guided record <span aria-hidden="true">·</span> Bulgaria</p>'
    + '<div class="opening-meta"><div class="story-progress" id="story-progress"></div>'
    + '<a class="story-skip" href="#explore">Skip to explorer</a></div></div>'
    + '<div class="opening-content"><p class="story-step-label" id="story-step-label"></p>'
    + '<h2 class="story-title" id="story-step-title" tabindex="-1"></h2>'
    + '<p class="story-lede" id="story-lede"></p>'
    + '<div class="story-visual" id="story-visual"></div>'
    + '<div class="story-actions" id="story-actions"></div>'
    + '<div id="story-data-slot"></div>'
    + '<p class="story-action-note" id="story-action-note" role="alert" hidden></p>'
    + '<p class="sr-only" id="story-announce" role="status" aria-live="polite"></p></div>';

  const visual = $("story-visual");
  const announce = (text) => { $("story-announce").textContent = text; };
  const showActionNote = (text) => {
    const note = $("story-action-note");
    note.textContent = text;
    note.hidden = false;
  };

  function stageCopy(stage) {
    if (stage === "inspect") {
      return {
        label: "Inspect the record",
        title: "Which month had the most detections?",
        lede: "Every mark is one month of vegetation detections in Bulgaria, 2000–2025. "
          + "Inspect the record, then reveal what moved the peak.",
      };
    }
    if (stage === "reveal") {
      return {
        label: "Reveal the switch",
        title: "The record changes satellites.",
        lede: "One satellite supplies each month. Aqua recorded through 2018, then NOAA-20 took over in January 2019. "
          + "A different instrument can count the same fires differently. The highest recorded month is <strong>"
          + dateLabel(model.rawPeak.month) + "</strong>, at <strong>" + format(model.rawValue(model.rawPeak))
          + "</strong> " + model.rawPeak.index.platform + " detections.",
      };
    }
    if (stage === "adjusted") {
      return {
        label: "Reveal the switch",
        title: "On one scale, the peak moves.",
        lede: "Aqua-equivalent estimates put every month on Aqua’s scale. "
          + dateLabel(model.example.month) + " falls to <strong>" + formatEstimate(model.example.index.value) + "</strong>. "
          + "<strong>" + dateLabel(model.adjustedPeak.month) + "</strong> becomes the highest at <strong>"
          + formatEstimate(model.adjustedPeak.index.value) + "</strong>, an extrapolated Terra estimate.",
      };
    }
    if (stage === "compare") {
      return {
        label: "Compare the same month",
        title: "September 2019, three ways.",
        lede: "Aqua and NOAA-20 both covered Bulgaria that month. Their recorded counts differ by a factor of six. "
          + "The estimate shows what NOAA-20 would have counted on Aqua’s scale.",
      };
    }
    return {
      label: "Open the explorer",
      title: "Follow the record yourself.",
      lede: "The explorer opens on Bulgaria, September 2019, in Raw comparison, with the satellite table and detection map alongside.",
    };
  }

  function progressMarkup(step) {
    let segments = "";
    for (let index = 1; index <= 4; index++) {
      segments += '<i class="' + (index < step ? "done" : index === step ? "now" : "") + '"></i>';
    }
    return '<span class="story-progress-label">Step ' + step + ' of 4</span>'
      + '<span class="story-progress-track" aria-hidden="true">' + segments + '</span>';
  }

  function flashVisual() {
    if (reducedMotion()) return;
    visual.classList.remove("is-switching");
    void visual.offsetWidth;
    visual.classList.add("is-switching");
    visual.addEventListener("animationend", () => visual.classList.remove("is-switching"), { once: true });
  }

  function render({ focus = false, message = "", flash = false } = {}) {
    const copy = stageCopy(state.stage);
    const step = stageStep[state.stage];
    root.dataset.stage = state.stage;
    $("story-step-label").textContent = copy.label;
    $("story-step-title").textContent = copy.title;
    $("story-lede").innerHTML = copy.lede;
    $("story-progress").innerHTML = progressMarkup(step);
    $("story-progress").setAttribute("aria-label", "Step " + step + " of 4");
    $("story-action-note").hidden = true;
    renderVisual();
    renderActions();
    if (flash && state.rendered) flashVisual();
    state.rendered = true;
    if (message) announce(message);
    if (focus) {
      $("story-step-title").focus({ preventScroll: true });
      root.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    }
  }

  function go(stage, options = {}) {
    if (stage === "inspect") {
      state.pinnedIndex = null;
      state.activeIndex = model.firstEligible;
    }
    state.stage = stage;
    render(options);
  }

  function renderVisual() {
    $("story-data-slot").innerHTML = "";
    if (state.stage === "compare") return renderCompare();
    if (state.stage === "handoff") return renderHandoff();
    const mode = state.stage === "adjusted" ? "adjusted" : "raw";
    const interactive = state.stage === "inspect";
    renderTimeline(mode, { interactive, platforms: state.stage !== "inspect" });
  }

  function renderTimeline(mode, { interactive, platforms }) {
    state.chartMode = mode;
    state.chartInteractive = interactive;
    state.lastWidth = 0;
    visual.innerHTML = (mode === "raw" && state.stage === "reveal" ? calloutsMarkup(mode, model) : "")
      + (mode === "adjusted" ? calloutsMarkup(mode, model) : "")
      + '<figure class="story-figure">'
      + chartHeadMarkup(mode)
      + '<div class="story-chart' + (interactive ? ' is-interactive' : '') + '" id="story-chart" role="img" aria-label=""></div>'
      + (interactive ? readoutMarkup(model, state.activeIndex) : "")
      + '<p class="story-chart-note" id="story-chart-note">' + chartNoteMarkup(mode, interactive) + '</p>'
      + (platforms ? platformKeyMarkup() : "") + '</figure>';
    $("story-data-slot").innerHTML = tableMarkup(mode, model);
    drawChart();
    if (interactive) bindInspect();
  }

  function drawChart() {
    if (!["inspect", "reveal", "adjusted"].includes(state.stage)) return;
    const host = $("story-chart");
    if (!host) return;
    const width = Math.round(host.clientWidth);
    if (width < 220) return;
    const height = width < 560 ? 206 : width < 820 ? 224 : 236;
    const geom = chartGeometry(width, height, state.stage !== "inspect", model.rows, model.scaleMax, model.ticks);
    host.innerHTML = timelineSvg(geom, state.chartMode, model, state.stage !== "inspect");
    host.setAttribute("aria-label", chartSummary(state.chartMode, model, state.stage !== "inspect"));
    state.geom = geom;
    state.lastWidth = width;
    state.bars = [...host.querySelectorAll(".story-bar")];
    state.marker = host.querySelector(".story-marker");
    if (state.chartInteractive) updateInspect();
  }

  function updateInspect() {
    if (!state.chartInteractive || !state.geom) return;
    const row = model.rows[state.activeIndex];
    const value = state.chartMode === "adjusted" ? row.index.value : model.rawValue(row);
    const range = $("story-range");
    let unit;
    if (value === null) unit = "No harmonized estimate for this month";
    else if (state.chartMode === "adjusted") {
      unit = row.index.status === "early_era_extrapolation"
        ? "Aqua-equivalent detections · extrapolated from Terra"
        : "Aqua-equivalent detections";
    } else unit = row.index.platform + " recorded vegetation detections";

    for (const bar of state.bars) {
      bar.classList.toggle("is-active", Number(bar.dataset.index) === state.activeIndex);
    }
    const peak = state.chartMode === "adjusted" ? model.adjustedPeak : model.rawPeak;
    const peakValue = state.chartMode === "adjusted" ? peak.index.value : model.rawValue(peak);
    const highest = state.activeIndex === model.rows.indexOf(peak);
    const month = $("story-readout-month");
    const valueNode = $("story-readout-value");
    const unitNode = $("story-readout-unit");
    if (month) month.textContent = dateLabel(row.month);
    if (valueNode) valueNode.textContent = format(value);
    if (unitNode) unitNode.textContent = unit + (highest && value !== null ? " · highest in record" : "");
    if (range) {
      range.value = String(state.activeIndex);
      range.setAttribute("aria-valuetext", dateLabel(row.month) + ". "
        + (value === null ? "No harmonized estimate for this month."
          : format(value) + " " + unit + (highest ? ". Highest in the plotted record." : ".")));
    }
    if (state.marker) {
      if (value === null) {
        state.marker.setAttribute("visibility", "hidden");
      } else {
        const x = state.geom.left + state.activeIndex * state.geom.step + state.geom.step / 2;
        const y = state.geom.top + state.geom.plotH - value / state.geom.scaleMax * state.geom.plotH;
        const line = state.marker.querySelector("line");
        const dot = state.marker.querySelector("circle");
        line.setAttribute("x1", x.toFixed(2));
        line.setAttribute("x2", x.toFixed(2));
        line.setAttribute("y1", state.geom.top);
        line.setAttribute("y2", state.geom.top + state.geom.plotH);
        dot.setAttribute("cx", x.toFixed(2));
        dot.setAttribute("cy", Math.max(state.geom.top, y).toFixed(2));
        state.marker.setAttribute("visibility", "visible");
      }
    }
  }

  function monthAt(event) {
    const host = $("story-chart");
    const svg = host?.querySelector("svg");
    if (!svg || !state.geom) return state.activeIndex;
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (state.geom.width / rect.width);
    const ratio = (x - state.geom.left) / state.geom.plotW;
    return Math.max(0, Math.min(model.rows.length - 1, Math.floor(ratio * model.rows.length)));
  }

  function bindInspect() {
    const host = $("story-chart");
    const range = $("story-range");
    if (!host || !range) return;
    host.addEventListener("pointerdown", (event) => {
      state.dragging = true;
      state.pinnedIndex = monthAt(event);
      state.hoverIndex = null;
      state.activeIndex = state.pinnedIndex;
      host.setPointerCapture?.(event.pointerId);
      updateInspect();
    });
    host.addEventListener("pointermove", (event) => {
      if (state.dragging) {
        state.pinnedIndex = monthAt(event);
        state.activeIndex = state.pinnedIndex;
        updateInspect();
      } else if (event.pointerType !== "touch") {
        state.hoverIndex = monthAt(event);
        state.activeIndex = state.hoverIndex;
        updateInspect();
      }
    });
    host.addEventListener("pointerup", (event) => {
      state.dragging = false;
      host.releasePointerCapture?.(event.pointerId);
    });
    host.addEventListener("pointercancel", () => { state.dragging = false; });
    host.addEventListener("pointerleave", () => {
      if (state.dragging) return;
      state.hoverIndex = null;
      state.activeIndex = state.pinnedIndex ?? model.firstEligible;
      updateInspect();
    });
    range.addEventListener("input", () => {
      state.pinnedIndex = Number(range.value);
      state.hoverIndex = null;
      state.activeIndex = state.pinnedIndex;
      updateInspect();
    });
  }

  function compareRow(name, value, tag, cls, display = format(value)) {
    const width = Math.min(100, value / model.scaleMax * 100);
    return '<div class="compare-row"><div class="compare-row-head"><div>'
      + '<span class="compare-name">' + name + '</span>'
      + (tag ? '<span class="compare-tag">' + tag + '</span>' : '') + '</div>'
      + '<strong class="compare-value">' + display + '</strong></div>'
      + '<div class="compare-track"><span class="compare-fill ' + cls + '" style="width:'
      + width.toFixed(2) + '%"></span></div></div>';
  }

  function renderCompare() {
    const row = model.example;
    const aqua = row.platforms.Aqua.vegetation_detections;
    const source = row.platforms["NOAA-20"].vegetation_detections;
    const estimate = row.index.value;
    const bridge = model.bridge;
    const holdout = bridge.holdout_years.join("–");
    const training = bridge.training_years.join(" and ");
    visual.innerHTML = '<section class="story-compare" aria-labelledby="story-compare-title">'
      + '<div class="story-chart-head"><h3 id="story-compare-title">September 2019 · vegetation detections</h3>'
      + '<span>Shared scale</span></div>'
      + '<div class="compare-rows">'
      + compareRow("Aqua recorded", aqua, "", "is-aqua")
      + compareRow("NOAA-20 recorded", source, "", "is-noaa")
      + compareRow("NOAA-20 on Aqua’s scale", estimate, "modeled estimate", "is-estimate", formatEstimate(estimate))
      + '</div>'
      + '<div class="compare-axis" aria-hidden="true"><span>0</span><span>'
      + formatInteger(model.scaleMax / 3) + '</span><span>' + formatInteger(model.scaleMax * 2 / 3)
      + '</span><span>' + formatInteger(model.scaleMax) + ' detections</span></div>'
      + '<p class="story-chart-note">All three bars use the same 0–' + formatInteger(model.scaleMax)
      + ' detection scale. The hatched bar is a model estimate, not a recorded count.</p></section>'
      + '<section class="story-validation" aria-labelledby="story-validation-title">'
      + '<p class="story-eyebrow">Held-out check</p>'
      + '<h3 id="story-validation-title">Closer to Aqua, not just here.</h3>'
      + '<div class="validation-figures">'
      + '<div class="validation-figure"><span>Before adjustment</span><strong>'
      + format(bridge.unadjusted.mae) + '</strong></div>'
      + '<span class="validation-arrow" aria-hidden="true">→</span>'
      + '<div class="validation-figure is-after"><span>After adjustment</span><strong>'
      + format(bridge.adjusted.mae) + '</strong></div></div>'
      + '<p class="validation-unit">average absolute difference from Aqua, detections per month</p>'
      + '<p class="story-chart-note">Across ' + bridge.unadjusted.months
      + ' months held out from fitting, ' + holdout + '. The conversion used earlier overlap months in '
      + training + '. <a href="#validation">See the validation table</a>.</p></section>';
  }

  function renderHandoff() {
    const row = model.example;
    visual.innerHTML = '<div class="story-handoff">'
      + '<div class="story-chart-head"><h3>Bulgaria · September 2019</h3><span>Raw comparison</span></div>'
      + '<div class="handoff-stats">'
      + '<div><span>Aqua recorded</span><strong>' + format(row.platforms.Aqua.vegetation_detections) + '</strong></div>'
      + '<div><span>NOAA-20 recorded</span><strong>' + format(row.platforms["NOAA-20"].vegetation_detections) + '</strong></div>'
      + '<div><span>Aqua-equivalent</span><strong>' + formatEstimate(row.index.value) + '</strong></div></div>'
      + '<p class="story-chart-note">The explorer opens with the monthly satellite table and the map for these recorded hotspots.</p>'
      + '</div>';
  }

  async function openExplorer() {
    const button = $("story-primary");
    if (!button) return;
    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Opening the explorer…";
    $("story-action-note").hidden = true;
    try {
      const result = onOpenExample ? await onOpenExample() : false;
      if (result === false) {
        showActionNote("The explorer data could not load. Try again, or use “Explore without the example.”");
        announce("The explorer could not open.");
      } else {
        announce("Explorer opened on Bulgaria, September 2019, Raw comparison.");
      }
    } catch (error) {
      console.error(error);
      showActionNote("The explorer data could not load. Try again, or use “Explore without the example.”");
      announce("The explorer could not open.");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  }

  function renderActions() {
    const actions = $("story-actions");
    const stage = state.stage;
    const primary = stage === "inspect" ? "Reveal the satellite switch"
      : stage === "reveal" ? "Show Aqua-equivalent estimates"
        : stage === "adjusted" ? "Compare September 2019"
          : stage === "compare" ? "Next: the explorer"
            : "Open Bulgaria · September 2019";
    const back = stage === "reveal" ? "Back to the record"
      : stage === "adjusted" ? "Back to recorded counts"
        : stage === "compare" ? "Back" : stage === "handoff" ? "Back" : "";
    actions.innerHTML = '<button class="story-primary" id="story-primary" type="button">' + primary + '</button>'
      + (back ? '<button class="story-secondary" id="story-back" type="button">' + back + '</button>' : '')
      + (stage === "handoff" ? '<button class="story-replay" id="story-replay" type="button">Replay</button>'
        + '<a class="story-text-link" href="#explore">Explore without the example</a>' : '');

    $("story-primary").addEventListener("click", () => {
      if (stage === "inspect") {
        go("reveal", {
          focus: true,
          flash: true,
          message: "Reveal: " + dateLabel(model.rawPeak.month) + " is the highest recorded month at "
            + format(model.rawValue(model.rawPeak)) + " " + model.rawPeak.index.platform
            + " detections. January 2019 is where NOAA-20 takes over.",
        });
      } else if (stage === "reveal") {
        go("adjusted", {
          focus: true,
          flash: true,
          message: "Aqua-equivalent estimates shown. " + dateLabel(model.adjustedPeak.month)
            + " is highest at " + formatEstimate(model.adjustedPeak.index.value) + ". "
            + dateLabel(model.example.month) + " is " + formatEstimate(model.example.index.value) + ".",
        });
      } else if (stage === "adjusted") {
        go("compare", { focus: true, flash: true, message: "Step 3 of 4. Compare September 2019 across Aqua and NOAA-20." });
      } else if (stage === "compare") {
        go("handoff", { focus: true, flash: true, message: "Step 4 of 4. The guided story is complete." });
      } else {
        openExplorer();
      }
    });
    $("story-back")?.addEventListener("click", () => {
      const previous = stage === "reveal" ? "inspect" : stage === "adjusted" ? "reveal" : stage === "compare" ? "adjusted" : "compare";
      go(previous, { focus: true, flash: true, message: "Back to step " + stageStep[previous] + " of 4." });
    });
    $("story-replay")?.addEventListener("click", () => {
      go("inspect", { focus: true, flash: true, message: "Story restarted at step 1 of 4." });
    });
  }

  const observer = new ResizeObserver(() => {
    if (!["inspect", "reveal", "adjusted"].includes(state.stage)) return;
    const host = $("story-chart");
    if (!host) return;
    const width = Math.round(host.clientWidth);
    if (width && width !== state.lastWidth) drawChart();
  });
  observer.observe(visual);

  window.addEventListener("hashchange", () => {
    if (location.hash === "#explore") $("explore")?.focus({ preventScroll: true });
  });

  render();
}




