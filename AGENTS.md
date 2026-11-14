# FireAtlas agent instructions

FireAtlas compares historical NASA FIRMS active-fire detections across MODIS and VIIRS. Read the latest checkpoint in [docs/PROGRESS.md](docs/PROGRESS.md) first; older entries are history. Keep a runnable three-country demo at every checkpoint — prefer a labeled pilot over unvalidated coverage.

## Repo shape and stack

- `scripts/` is Python 3.10+ standard library only. The local environment has no NumPy, Pandas or DuckDB; add a dependency only after a measured need and a wheel check.
- The app is hand-written static HTML/CSS/ES modules in `dashboard/`. There is no Next.js, npm, bundler, linter or test runner, despite the architecture proposal in [docs/EXECUTION_PLAN.md](docs/EXECUTION_PLAN.md).
- `out/` is the generated static release the demo serves (~280 MB, ignored). `outputs/` holds ignored intermediates: `monthly.json`, `report.json`, `history.json`.
- `out/data/<key>.json` drives the calendar and validation; `<key>-hotspots-v2/overview.json` plus its bundles drive the map. `<key>` is `pilot` (Bulgaria), `canada` or `south-africa` — never the display name.
- Adding a country touches `COUNTRIES` in `scripts/build_dashboard.py`, the `<select>` in `dashboard/index.html`, the bounds/name in `dashboard/hotspot-map.js`, a `<key>-outline.json`, and a generated `outputs/<folder>/history.json`.
- Generated hotspot data is large (Canada is ~211 MB). Do not recursively read or glob `out/`; edit source, not artifacts. `out/data/bulgaria-hotspots/` is an obsolete v1 directory — the builder writes only `*-hotspots-v2/`.
- No Git repository is initialized yet, although `.gitignore` is configured. Check before relying on `git` history.

## Build and verify

Run from the repo root:

```powershell
# Pilots: Bulgaria first, then transfer its fitted factors to the others
python scripts/pilot.py
python scripts/pilot.py --country South_Africa --output outputs/south-africa --transfer-from outputs/pilot/report.json
python scripts/pilot.py --country Canada --output outputs/canada --transfer-from outputs/pilot/report.json

# Per-country dashboard history
python scripts/export_history.py outputs/pilot
python scripts/export_history.py outputs/south-africa
python scripts/export_history.py outputs/canada

# Static release, then serve the release rather than dashboard/
python scripts/build_dashboard.py
python -m http.server 8765 --bind 127.0.0.1 --directory out
```

- `build_dashboard.py` needs all three `outputs/*/history.json`. `--country Bulgaria` only rebuilds one country into an existing `out/`; it cannot bootstrap a single-country release.
- The build copies every file in `dashboard/` into `out/`. After frontend edits, rerun it or copy the changed files into `out/`; otherwise the preview serves stale assets.
- Bump the `?v=` query strings when changing cached assets (currently `style.css?v=7`, `app.js?v=8`, `story.js?v=2`, `hotspot-map.js?v=3`). The current preview uses port 8766; any free port works.
- There is no test suite. Verification comes from the scripts' `ValueError` reconciliations (manifest row counts, calendar totals, map/hotspot totals) plus a browser smoke test at the served URL. Run scripts from the repo root so `export_history.py` and `build_dashboard.py` can import `pilot.py`.

## Data and scientific guardrails

- Treat `D:/NASA_SpaceApps_2026/data/` as read-only. Scripts default to it; use `--data-root` for another copy, and never write outputs inside it.
- Keep Terra, Aqua, S-NPP (`N`) and NOAA-20 (`N20`/`viirs-jpss1`) separate and labeled. The index uses Terra for 2001–2002 (flagged extrapolation), Aqua for 2003–2018 and adjusted NOAA-20 for 2019–2025.
- The index unit is Aqua-equivalent presumed-vegetation hotspot detections, not incident counts or burned area. The map shows recorded FIRMS coordinates, never adjusted or clipped points.
- Preserve status semantics: `null` means unavailable for a stated reason, `0` means a present catalog period with no detections, and unknown observation coverage is distinct from both. Do not collapse `before_record`, `partial_start_year`, `known_outage`, `unsupported_calibration`, etc.
- Work from `metadata/country_inventory.csv` and benchmark a small sample before wider processing. Record input provenance, date ranges, platform, version, filters and excluded periods.
- Do not weaken reconciliation/validation checks or invent values for unsupported months. Report held-out results and known failure modes before making scientific claims.
- If you change the method or UI numbers, update [progress](docs/PROGRESS.md) and retain the citations plus Codex/AI and third-party disclosure required by [the challenge notes](docs/CHALLENGE.md).
