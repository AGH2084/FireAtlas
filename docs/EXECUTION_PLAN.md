# Solo execution plan

Planning anchor is Saturday, November 14, around 12:00 Sofia time. Feature freeze is Sunday at 10:00 and local demo delivery is due at 14:00. Each checkpoint should leave a runnable country demo or a reproducible experiment. Save a small Git commit at each working milestone.

## Architecture

Use a manifest-driven Python CLI to read CSVs, produce compact country/month tables, fit and evaluate candidate bridges, and export a versioned JSON manifest plus one JSON payload per country. Start with `csv`, `collections` and `json` from the standard library. Process a country/year at a time and write only aggregates, compact geospatial summaries and metrics. For the optional grid candidate, deduplicate cell-days within bounded time chunks and measure peak memory on a large sample.

Use a statically exportable Next.js/TypeScript app. Load the selected country's JSON after selection. Render an accessible heatmap, a lightweight time-series comparison and a country boundary or aggregated-detection map. Start with a license-verified simplified boundary asset and a local map style. Keep the map usable with a cached geometry view if tiles, WebGL or network access fail. Use Tailwind, MapLibre and Recharts if they are quick to set up. A simple CSS calendar and browser-native chart/geometry renderer are viable fallbacks. The browser receives no raw worldwide point feed. An API contract, FastAPI and database are unnecessary for these fixed queries. Add DuckDB/Parquet or Polars only if measurement shows that repeated CSV parsing or the grid workload needs acceleration and compatible packages are available.

Minimum data contract is the schema version, geography ID/display name, UTC month, per-platform raw count and coverage status, nullable index value, index unit and platform used, method version and a compact paired-validation summary. Country identifiers come from the manifest and an explicit mapping to boundaries. Expose catalog entries only when app data exists. Use the UI to explain dates and coverage, with distinct states for missing record, known outage/partial coverage and zero catalog detections.

## Time boxes and exit criteria

| Sofia time | Work and dependency | Acceptance or fallback |
| --- | --- | --- |
| **Sat 12:00–13:00** | Initialize Git and ignore raw data, generated outputs, caches and secrets. Read the Bulgaria manifest and spot-check one overlap-year total per platform against the inventory. Build the monthly raw extractor, including coverage fields. | One deterministic Bulgaria JSON export. Reconcile year totals where no filtering is applied. Confirm a gap, an inactive platform and a zero-detection month have different representations. Use Python standard library to avoid wheel setup. |
| **13:00–15:30** | After extraction, benchmark one overlapping year for Bulgaria, South Africa and Canada. Fit the count baseline and bridge on development data. Run the grid variant if the first benchmark leaves room in this block. | Log elapsed time, peak RAM, rows/sec, export size and error against the same reference metric. Freeze the methodology from development validation before the final holdout. Use the count candidate if grid work would delay the slice. |
| **15:30–18:00** | Build the Bulgaria vertical slice from the working JSON. Wire date range, map, calendar and raw-versus-harmonized comparison. | A repeatable click-through tells one story using actual detections. A known unavailable month renders correctly. If a chart/map library stalls, use the lighter renderer and keep the interaction. |
| **18:00–20:00** | Publish the final holdout results from the frozen method for the pilot countries. Integrate the approved pilots and run a high-volume Brazil sample. Forecast full ingest time from observed throughput and total input bytes/rows. | Produce per-platform/country metrics, record failures and test three selections. At 19:00 start wider ingest only if a measured estimate plus a buffer fits by 21:00 and memory, temporary space and export quotas are safe. Otherwise ship a clearly labeled pilot build. |
| **20:00–22:30** | Complete dashboard, accessibility, explanations and public static deployment. If broader processing finishes, expose empirically supported IDs and flag countries with unsupported harmonization. | Signed-out project link loads, selection/date changes synchronize, no unsupported periods have invented values, and mobile/keyboard checks pass. Keep the pilot build available. Pause optional scope at 22:30. |
| **Sun 08:00–10:00** | Validate the release against the inventory and held-out results. Rehearse the Bulgaria route and one comparison country. | Freeze at 10:00. Verify a cold load, filters, sample totals, gap states, citations and deployment from a clean build. Fall back to the Saturday working checkpoint if needed. |
| **10:00–13:00** | Record and time the 30-second English demo, prepare the 3-minute live pitch and 5-minute Q&A, complete the Project tab, check public links and submit. | Aim for 13:00 delivery and website confirmation to leave an hour of local buffer. Have a local video file and an offline copy of the demo assets. |
| **14:00–23:59** | Sofia demo cutoff at 14:00, screening at 14:30, finalists at 15:45 and pitches at 16:00. Recheck the website entry and resubmit any agreed corrections before 23:59. | Local handoff verified and NASA website success banner visible. See [the submission checklist](CHALLENGE.md#deadlines-and-materials). |

Critical path is manifest → raw counts and coverage checks → calibrated pilot export → working calendar/map → final holdout and deployment → demo and submission. Keep country selector, map, monthly calendar, raw comparison and eligibility requirements on this path. Use a same-month historical median in the existing calendar tooltip where supported. Give priority to one visible scientific validation result and one usable demo story over expanded coverage or separate charts. Drop trends, exports, drawn areas and 2026 ingest first if behind.

## Failure and recovery

| Risk | Trigger and response |
| --- | --- |
| Weak or unstable calibration | If no candidate passes the holdout gate, display calibrated values only where supported and clearly label the experimental segments. Keep the validated raw record and quantify where agreement failed. |
| Coverage and sensor transitions | Exclude flagged periods from fitting/scoring. Keep independent platform series and note the 2025 endpoint, partial starts, orbit drift, product versions and unresolved clear-sky coverage. |
| Global workload exceeds laptop budget | Cap initial export at pilot countries. Never build a global in-memory point table. Benchmark and write bounded aggregate updates so processing can resume without rerunning completed countries. |
| Asset or deployment failure | Use a simplified licensed boundary or local geometry rendering, local demo export, public video and an accessible project repository or documentation link. Test links signed out and have the demo recording ready ahead of deadline. |
| Teammate arrives later | Offer demo recording and submission copy, citation/license checks, or validation QA on the current build. Give them a frozen export or public preview and keep core pipeline ownership with the solo developer. |



## Current implementation checkpoint

The next dashboard task is the raw versus harmonized comparison described in the [latest handoff](PROGRESS.md#november-14-handoff-before-comparison-mode). Verify it locally with the existing three-country release before resuming deployment work.


## Comparison checkpoint complete

The raw comparison has been implemented and verified in the local release. Resume from the [latest checkpoint](PROGRESS.md#november-14-handoff-after-comparison-mode).
