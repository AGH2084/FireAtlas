# FireAtlas

FireAtlas is a proposed web app for comparing historical satellite-detected burning activity across the MODIS and VIIRS eras. A fire manager selects a country and date range, then uses a monthly calendar and map to compare historical activity, inspect raw detections by platform and see where the harmonization is uncertain.

## MVP

- Country selection and a map of the selected area, with the date range applied consistently to the calendar and comparison.
- Monthly burning-activity calendar spanning the earliest supported historical data through December 2025. Highlight incomplete or unavailable periods and let users see how a month compares with the same month in prior years.
- Raw MODIS and VIIRS detections alongside a calibrated activity index, with platform provenance and held-out validation linked from the calendar.
- A concise methodology and limitations view. The index represents satellite-detected activity. The plotted values are neither incident counts nor burned area.
- A guided Bulgaria opening above the explorer. Four short steps inspect the monthly record, reveal the January 2019 Aqua-to-NOAA-20 switch, compare satellites on one scale, then hand off to Bulgaria in September 2019. Replay and skip are always available.

Start with Bulgaria, validate on other regions, and expand from the manifest as processing and validation allow. The deployment baseline is Python preprocessing and a statically exportable Next.js/TypeScript app loading per-country JSON. See the [execution plan](docs/EXECUTION_PLAN.md) for decisions and fallback paths.

## Project notes

- [Challenge, judging and submission](docs/CHALLENGE.md)
- [Local data and machine inventory](docs/DATA_INVENTORY.md)
- [Scientific method and validation plan](docs/METHODOLOGY.md)
- [Execution schedule](docs/EXECUTION_PLAN.md)
- [Progress and next task](docs/PROGRESS.md)

## Run the offline pilot

From the project directory, run this with Python 3.10 or newer.

```powershell
python scripts/pilot.py
```

It reads the local FIRMS manifest and Bulgaria CSVs, then writes `outputs/pilot/monthly.json` and `outputs/pilot/report.json`. The script uses the standard library and runs independently of the dashboard and network. Pass `--data-root` to use another local copy, or `--country South_Africa --output outputs/south-africa` to repeat the experiment on another country. See [progress](docs/PROGRESS.md) for the measured results and the next validation step.

To compare Bulgaria's fitted factors with locally fitted factors on the same months, run:

```powershell
python scripts/pilot.py --country South_Africa --output outputs/south-africa --transfer-from outputs/pilot/report.json
python scripts/pilot.py --country Canada --output outputs/canada --transfer-from outputs/pilot/report.json
```

Build the dashboard payload from each completed pilot with `python scripts/export_history.py outputs/pilot`. Repeat with `outputs/south-africa` and `outputs/canada`. Each directory receives a `history.json` with raw platform counts, nullable index values, bridge validation metrics and coverage flags.

## Run the dashboard

Generate the static release from the three completed pilots, then serve it locally.

```powershell
python scripts/build_dashboard.py
python -m http.server 8766 --bind 127.0.0.1 --directory out
```

Open [FireAtlas on localhost](http://127.0.0.1:8766). The static build uses plain HTML, CSS and JavaScript and can be hosted from `out/`. The page opens with a guided Bulgaria story that can be replayed or skipped; its final action opens the explorer at Bulgaria, September 2019 in Raw comparison. The full-width interactive map covers Bulgaria, Canada and South Africa. It follows the selected month's Terra, Aqua or NOAA-20 platform, showing grouped detections at country scale and original FIRMS coordinates at close zoom. Detailed Natural Earth borders provide geographic context; they are generalized reference boundaries. Python prebuilds country/month spatial bundles, so no live FIRMS API calls are needed. The map can run offline with the calendar and validation views.



## Resume in another coding agent

Open this directory as the workspace and start with [AGENTS.md](AGENTS.md) and the latest checkpoint in [progress](docs/PROGRESS.md). The existing local preview uses port 8766. For frontend-only work, copy the edited files from `dashboard/` into `out/` to reuse the generated data. Use the Python build when the release data needs regeneration.


Choose **Raw comparison** in Calendar view to compare peak months and inspect raw and adjusted counts for the selected month. The selected-month panel shows Aqua's recorded count, the selected satellite's recorded count, and the Aqua-equivalent estimate together, with a link to held-out validation. The static export includes the required monthly fields.
