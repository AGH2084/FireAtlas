# Progress and handoff

## November 14 coordinate inspection and current-view CSV export

Added accessible latitude/longitude controls and a **Go to coordinates** action to the MapLibre detector map. Both inputs require signed decimal degrees: latitude −90 through 90 and longitude −180 through 180. Valid entries preserve the country, month, platform, and date range, then center at local inspection zoom; a live status names the coordinate target and selected country/month/platform. Locations outside the selected country remain navigable, with an explicit warning that data is limited to that country's existing catalog.

The map now summarizes loaded detailed records as detections in the current map view and offers **Export current view CSV** only once original point bundles have loaded. The export never uses overview cells, cluster totals, or anchors. It includes country key/name, selected month/platform, recorded longitude/latitude, acquisition date and original zero-padded UTC HHMM, confidence, `current_map_view` scope, the `type=0` presumed-vegetation filter note, NASA FIRMS source, and blank product version because the generated point bundles do not carry version metadata. CSV uses quoted escaped cells, CRLF, UTF-8 BOM, and filenames such as `fireatlas-pilot-2019-09-noaa-20-current-map-view.csv`. The UI distinguishes unavailable catalog periods, loading/failed detailed data, and an empty loaded view; it reiterates that rows are detections rather than confirmed incidents or burned area.

Implementation is in `dashboard/index.html`, `dashboard/style.css`, `dashboard/app.js`, and `dashboard/hotspot-map.js`; cache versions are `style.css?v=10`, `app.js?v=12`, and `hotspot-map.js?v=7`. The builder completed Bulgaria and South Africa reconciliations before the execution window ended while regenerating Canada; because this task changes only copied frontend assets, the documented source-to-release copy workflow synced all four changed files into `out/`. JavaScript syntax and source/release byte checks passed.

Follow-up: the initial camera and each country change now apply **Fit country** only after that country's map assets are ready, so they cannot retain the constructor fallback view. Cache versions are now `app.js?v=13` and `hotspot-map.js?v=8`.

## November 14 documentation checkpoint

Updated the README and methodology with the shipped static three-country explorer, MapLibre country-fit behavior, coordinate inspection boundaries, detailed-point loading model, and exact current-view CSV scope/limitations. The documentation now explicitly distinguishes exported satellite detections from confirmed incidents, perimeters, dispatch guidance, and burned-area measurements.

Browser smoke checks against `http://127.0.0.1:8766` reloaded the release and verified Bulgaria September 2019. At Sofia (`42.6977`, `23.3219`), detailed loading reported two current-view point records and enabled export; clicking export reported that both records were exported with no browser console errors. The browser automation download observer did not provide a local file path, so the downloaded file's bytes were not independently read. Invalid latitude `91` produced the inline range error. `0, 0` navigated outside Bulgaria, warned about catalog scope, found an empty detailed view, and disabled export. Canada August 2023 (437,553) and South Africa July 2024 (65,413) switched with no console errors and export correctly remained blocked until detail data loaded. A 390×844 viewport showed the controls with no horizontal overflow. Not yet manually checked: a zero-record month, a failed bundle request, an unavailable-month flow after this UI change, and a downloaded CSV opened in a spreadsheet.

## November 14 colored terrain and local context

Added MapLibre color relief from the existing AWS Terrarium elevation source, with subdued hillshade and a more transparent country fill. Added local Natural Earth v5.1.2 1:10m roads, rivers and populated places for Bulgaria, Canada and South Africa. The context export is made by `scripts/build_map_context.py` from the pinned Natural Earth GeoJSON files `ne_10m_roads`, `ne_10m_rivers_lake_centerlines` and `ne_10m_populated_places`. The script keeps features intersecting a country bounding box plus a one-degree margin, road ranks up to 5, river ranks up to 6 and place ranks up to 4. Place labels thin by zoom and screen spacing; FIRMS points and clusters remain above all base layers. These geographic features are generalized reference context, not coordinates used for the hotspot analysis. The source set is [Natural Earth public-domain data](https://www.naturalearthdata.com/about/terms-of-use/).

The three local context files are 67 KB, 692 KB and 176 KB. `build_dashboard.py` now copies `map-context/` into the release. The Bulgaria rebuild and its hotspot reconciliations passed; source and release frontend/context files match. The served browser showed terrain color, roads, rivers, labels and 26 Bulgaria September 2019 clusters. Canada August 2023 and South Africa July 2024 loaded their local context and clusters with no console errors. Close-zoom point performance and offline tile fallback still need browser checks.

## November 14 MapLibre startup hotfix

The first MapLibre release stalled at “Loading monthly detections…” because this machine's Python `http.server` served the vendored `.mjs` files as `text/plain`; browser ESM imports require a JavaScript MIME type. Renamed the unchanged MapLibre ESM and worker bundles to `.js`, updated imports and cache strings, and synced `dashboard/` with `out/`. The served browser now shows the Bulgaria September 2019 monthly panel and 26 numbered map clusters, with no console errors. The earlier checkpoint's browser-unverified note applied before this hotfix.

## November 14 MapLibre renderer checkpoint

Replaced the custom map canvas with MapLibre GL JS 6.16.0, vendored under `dashboard/vendor/maplibre-gl/` with a same-origin ESM worker and CSS. The static builder now copies that directory into `out/`. The base layer is a plain local color with Natural Earth 1:10m country outlines; AWS Open Data Mapzen Terrarium tiles add hillshade when available. The base and FIRMS overlay remain usable if elevation requests fail. Elevation credits link to the [Mapzen source attribution list](https://github.com/tilezen/joerd/blob/master/docs/attribution.md); the [AWS Open Data registry](https://registry.opendata.aws/terrain-tiles/) lists the tile set and source-specific licensing. There is no application API key or published per-app request allowance in the registry; do not assume availability for a public launch. Offline operation retains the plain background and local boundary but not hillshade unless the browser already has tiles cached.

The map still uses the existing `*-hotspots-v2/overview.json` and five-degree point bundles. Country fit shows numbered aggregates anchored to recorded FIRMS coordinates. Detail mode starts only after zooming past 180 pixels per degree and loads bundles intersecting visible half-degree cells, filtering individual points to the viewport. Selection shows acquisition UTC and confidence. No monthly data, calibration, or coverage statuses changed. The bundle cache is limited to four files.

The full three-country release rebuild passed its existing count reconciliations. Static checks passed for JavaScript syntax, Python syntax, and vendor assets in `out/`. For the largest sample month, Canada August 2023 has 437,553 records in 925 overview cells and 68 bundles; the largest bundle has 80,623 records and is 3,691,144 bytes. Bulgaria September 2019 and South Africa July 2024 also reconcile to 4,205 and 65,413 recorded points. Browser smoke testing and pan/zoom performance remain **unverified**: automatic approval review rejected navigation to the rebuilt localhost preview because the review service hit a usage limit. Do not treat this as acceptance of the interactive map until a browser check covers the worker, fit, detail selection, resize, outage, tile failure, and Canada responsiveness.

## 2026-11-14, about 12:00 Sofia time

- Onboarding complete. Read the live Sofia schedule, challenge and resources, legal terms, team, judging and submission guides, and FIRMS source pages.
- Verified that Sofia allows a one-person Local Event team for Global Judging. Confirm the user's actual registration and team listing when preparing the submission. Confirm the local upload route and resolve any pre-start data preparation question with the Local Lead if applicable.
- Read the local catalog and verification notes, matched 48 archive and 10,095 CSV file counts and byte totals, and inspected 12 sample headers and rows. Reused the local verification report's full parse result of 548,501,203 observations. Preserved the input files in place.
- Windows preflight confirmed 13.69 GiB usable RAM, roughly 4.18 GiB free on C: and 283.50 GiB free on D:. Python 3.15.2 and Node 24.13.0 are available. Analytics packages are absent and Git has no repository here yet.
- Proposed output is monthly country JSON served by a static Next.js app. Proposed scientific baseline is paired monthly counts with an Aqua MODIS reference. Evaluate a per-platform calibration, and consider equal-area cell-days if it fits the time box. Method choice, bridge support, timings and accuracy remain unverified. No implementation or application test has run.
- Hard schedule on Sunday, November 15 (Sofia time) is 14:00 for local video, 16:00 for finalist pitches if selected, and 23:59 for website submission. Internal freeze is 10:00. Aim for a 30-second video and delivery by 13:00.

**Next implementation task:** Initialize Git and add ignores. Then implement a read-only Bulgaria monthly extractor from `metadata/country_inventory.csv`. Preserve separate Terra, Aqua, S-NPP and NOAA-20 counts and UTC acquisition dates. Emit the smallest versioned JSON export with explicit coverage states. Reconcile unfiltered 2024 totals to the manifest (1,427 MODIS combined, 3,904 S-NPP and 4,889 NOAA-20), test an unavailable period and a zero-detection month, and commit the working checkpoint. Use that export for the first before/after comparison.

## Bulgaria pilot

- Ran `python scripts/pilot.py` on 48 Bulgaria files and 205,219 detections in 1.22 seconds. Verified file totals against the manifest and reconciled 2024 counts for Terra (579), Aqua (848), S-NPP (3,904) and NOAA-20 (4,889). Verified 312 monthly records, distinct null/zero handling and a known-outage flag.
- The fit used presumed vegetation detections (`type=0`, 180,461 rows) and all confidence classes. It excluded flagged outage months and partial mission start years from fitting and scoring. The comparison measures agreement with Aqua, with regional observation coverage still unknown.
- For NOAA-20, the 2019–2021 detection-count factor was about 0.193. On 23 eligible months in 2024–2025, average absolute disagreement fell from 225.61 to 9.30 Aqua detections per month. Spearman rank correlation was 0.942 and unchanged by multiplication. Signed bias after adjustment was +5.28 detections per month.
- The 10 km equal-area cell-day candidate also needed calibration. Its NOAA-20 holdout MAE was 5.43 cell-days after adjustment. On each method's own Aqua scale, MAE divided by the mean Aqua value was about 20% for both. Bulgaria alone gives little reason to prefer the grid for NOAA-20.
- Outputs are local and ignored by Git. They contain monthly raw counts, candidate aggregates, coverage flags, factors and validation scores. A production harmonized series is pending. The results describe Bulgaria, and a pooled or country-specific calibration across regions remains to be tested.

## South Africa and Canada transfer test

Ran the offline pilot with `--transfer-from outputs/pilot/report.json`. South Africa processed 5,273,585 observations in 19.72 seconds and Canada processed 12,863,256 in 46.05 seconds. Verified that each transferred factor exactly matches Bulgaria's report and all three comparisons use the same eligible 2024–2025 months.

| Country | Platform | Months | Bulgaria count factor | Local count factor | Unadjusted MAE | Bulgaria MAE | Local MAE |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| South Africa | Terra | 24 | 1.4163 | 1.4663 | 1214.29 | 833.22 | 796.88 |
| South Africa | S-NPP | 19 | 0.1931 | 0.1594 | 9872.16 | 424.57 | 179.24 |
| South Africa | NOAA-20 | 23 | 0.1927 | 0.1574 | 12676.91 | 510.96 | 231.15 |
| Canada | Terra | 24 | 1.4163 | 0.8794 | 585.42 | 2994.48 | 597.15 |
| Canada | S-NPP | 19 | 0.1931 | 0.0977 | 62212.42 | 7293.13 | 1089.13 |
| Canada | NOAA-20 | 23 | 0.1927 | 0.1030 | 65753.91 | 7475.76 | 1262.12 |

MAE is mean absolute error against Aqua in presumed vegetation detections per month. Local factors improved the VIIRS count estimates in both target countries relative to transfer. Grid cell-days had mixed transfer results in South Africa and benefited from local VIIRS fits in Canada. Canada Terra's locally fitted multiplier slightly worsened holdout count error compared with using Terra raw counts. Full candidate metrics are in `outputs/south-africa/report.json` and `outputs/canada/report.json`.

## Pilot dashboard export

The 2013–2021 Terra factor made Bulgaria's 2003–2011 error worse (59.11 to 72.31). The exporter therefore uses a Terra bridge trained closer to the period it will estimate. A separate 2003–2008 fit improved average absolute error against Aqua on 36 eligible 2009–2011 months in each pilot country.

| Country | Early Terra factor | Unadjusted MAE | Adjusted MAE |
| --- | ---: | ---: | ---: |
| Bulgaria | 1.2294 | 51.72 | 44.26 |
| South Africa | 1.5937 | 1073.03 | 596.12 |
| Canada | 0.9426 | 315.72 | 255.05 |

The exporter writes 312 months and 293 non-null pilot index values per country. It uses Terra for the early era, Aqua in 2003–2018 and locally adjusted NOAA-20 in 2019–2025. It includes all four raw platforms. Terra estimates before 2003 are flagged as extrapolations. Index gaps include the partial 2000 start and known outages of the selected platform. Prototype bridge thresholds and units are in [methodology](METHODOLOGY.md#historical-series-and-coverage). No country outside the pilot has been assessed here. Confidence sensitivity, Git setup and the web app remain pending.

## Dashboard

### Bulgaria hotspot map

The Bulgaria map follows the calendar's selected satellite and uses the same presumed vegetation filter. It draws a local Natural Earth outline and groups hotspots into one-degree clusters at country scale and half-degree clusters when zoomed in. At close zoom it loads point files for the visible cells. Each point carries its FIRMS coordinates, acquisition time and confidence. A known outage can leave the index unavailable while recorded hotspots remain visible.

The Bulgaria-only rebuild runs with `python scripts/build_dashboard.py --country Bulgaria` when the other pilot exports are already in `out`. The generated hotspot data totals about 2.85 MB across 7,758 files, including the overview. The builder reconciles the point counts with every Bulgaria calendar month. Benchmark coarser packaging before extending point files to Canada and South Africa.

Boundary source is the public-domain [Natural Earth Admin 0 Countries v5.1.2](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_110m_admin_0_countries.geojson). The dashboard credits Natural Earth beside the map.

- Built the three-country dashboard and an offline static release builder. Year filters and calendar selection drive the month detail, raw satellite table and NOAA-20 detection grid. Includes a historical same-month median and held-out errors.
- Used the design-taste-frontend Accent ladder direction, seed 1494986031. The screen asks when burning activity was highest and gives the monthly calendar the most space. The data uses an ember hue. A compact top bar serves the single workspace. The first screenshot round identified a tall mobile title, a long mobile calendar and unequal tablet panel lengths. Reduced the title and calendar heights and enlarged the tablet map.
- The build reconciles every NOAA-20 grid total with the corresponding pilot month. Geography uses aggregate detection cells on a coordinate grid. Country boundary and base tiles would require an additional asset. Source uses plain static HTML, CSS and JavaScript. Confidence sensitivity, Git setup and public hosting are pending.



### Expanded interactive maps and geography correction

Codex expanded the interactive map to Bulgaria, Canada and South Africa, following the calendar-selected Terra/Aqua/NOAA-20 platform. The map now occupies a full-width panel (420–720px tall). All countries share a Mercator projection for both boundaries and points. Replaced the very coarse Bulgaria boundary with Natural Earth v5.1.2 Admin 0 1:10m geometry for all three countries: https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_admin_0_countries.geojson (public domain). These are reference outlines, not survey boundaries. Original FIRMS coordinates are never clipped or moved to fit them. Cluster anchors are actual recorded points nearest their cell mean, replacing geometric cell centers that could appear outside the country. Screen groups retain one of those recorded anchors.

The Python builder processes one year at a time and bundles half-degree cells into 5-degree country/month files. Every selected-platform month reconciled against history in the full build. Sample September 2019 and June 2023 bundles across all three countries also passed count and anchor-membership checks. Generated v2 assets: Bulgaria 577 files / 3.05 MB; Canada 8,886 / 210.76 MB; South Africa 2,869 / 76.02 MB. Largest bundle is 5.9 MB (Canada); browser loads only bundles intersecting the view at close zoom. Initial country load no longer fetches the unused legacy NOAA-20 grid. Full rebuild: `python scripts/build_dashboard.py`. Raw D: inputs remain untouched.

Browser verification: country switching, detailed outlines, fit-country and zoom controls inspected for all three countries. Known limitation: Natural Earth borders are generalized, and no street/terrain basemap is included. Next: measure cold-load transfer and cache memory for large Canadian months before deployment; remove obsolete v1 generated assets from the deployment package.

Codex moved the selected month into a compact full-width section between the calendar and map. The summary and satellite table sit side by side on wider screens and stack on phones. The calendar scrolls within a shorter panel. Verified the layout and that selecting October 2019 updates both the summary and map in the local preview.


## November 14 handoff before comparison mode

The offline three-country release and interactive maps are working. The calendar, selected month and map are stacked, with the monthly estimate and satellite table side by side on wider screens. The localhost preview serves `out/` on port 8766. Frontend source is in `dashboard/`, the release builder is `scripts/build_dashboard.py`, and existing monthly inputs for the browser are `out/data/pilot.json`, `out/data/south-africa.json`, and `out/data/canada.json`. The workspace did not contain a usable Git checkout at the last check.

Next task: implement an optional comparison using the selected platform's unadjusted vegetation count and existing Aqua-equivalent estimate. Mark platform changes in the calendar, show both month totals, explain the map's recorded points, and link the interpretation to held-out results. Reuse the generated data. Bulgaria in September 2019 is the preview check (4,205 raw NOAA-20, 810.4 Aqua-equivalent, 672 observed Aqua).


## November 14 handoff after comparison mode

Implemented and copied to the static release. Use Calendar view > Raw comparison. The calendar uses raw vegetation counts from the same platform schedule and shows both peak months. The selected-month panel shows both totals and highlights the source satellite. The map explains that it displays recorded coordinates, and the validation section explains held-out error. Verified all three countries, Bulgaria September 2019, and the pre-record unavailable state in the local preview. Reused the existing exports.

To resume in OpenCode, open this folder, read AGENTS.md and this checkpoint, and keep serving out on port 8766. The next project checkpoint is local demo review and deployment preparation, including a clean-build asset check and measuring cold-load transfer for Canada.

## November 14 hotfix: country-fit map clusters

The map now keeps numbered clusters at the country-fit view and switches to original points only after a real zoom-in. Bulgaria previously crossed the 120 px/degree point threshold at fit, so it showed individual detections while Canada and South Africa showed circles; zooming out was already disabled at the fit view. Verified all three countries at fit, Bulgaria September 2019, and the zoom-in/fit round-trip in the 8766 preview. At that checkpoint, cache versions were `app.js?v=5` and `hotspot-map.js?v=3`.

## November 14 same-month satellite comparison

Raw comparison now puts Aqua's recorded vegetation count, the selected platform's recorded count, and the Aqua-equivalent estimate in one table in the selected-month panel, with a link to held-out validation. Verified Bulgaria September 2019 (672 / 4,205 / 810.4), Canada and South Africa, a 2022-04 Aqua outage (comparison unavailable, not a 3-vs-189 comparison), 2002-01 Aqua partial start with zero detections (unavailable), 2024-02 NOAA-20 outage (unavailable), and 2010-01 Aqua reference month (no cross-satellite table). Harmonized mode is unchanged; the 390 px and 700 px layouts have no horizontal overflow. Source and `out/` copies are in sync; current cache versions are `style.css?v=5`, `app.js?v=6` and `hotspot-map.js?v=3`.

Next experience prototype: see [interactive opening specification](INTERACTIVE_OPENING_SPEC.md) for the OpenCode handoff, verified Bulgaria examples and acceptance checks.

## November 14 guided opening

Implemented the four-step Bulgaria opening above the explorer in `dashboard/story.js`, `dashboard/app.js`, `dashboard/index.html` and `dashboard/style.css`. It fetches the existing `out/data/pilot.json`; no data pipeline changed. Steps: inspect the monthly record, reveal the satellite switch, show Aqua-equivalent estimates, compare September 2019 three ways, then hand off. Replay and **Skip to explorer** are available throughout, and the final step also offers a direct explorer link.

Exact values shown: September 2019 peak 4,205 NOAA-20 records; January 2019 Aqua-to-NOAA-20 transition; August 2001 Aqua-equivalent peak 3,318.0, labeled an extrapolated Terra estimate; September 2019 comparison 672 Aqua / 4,205 NOAA-20 / 810.4 NOAA-20 on Aqua's scale. The held-out check shows 225.6 before and 9.3 after adjustment across 23 months in 2024–2025, with 2019 and 2021 as training years. The chart uses one fixed 0–4,500 scale across raw and adjusted modes, draws only the 293 months with harmonized estimates, and leaves 19 gaps blank rather than zero. A 26-row text table provides the same values.

The handoff sets Bulgaria, Raw comparison, 2000–2025 and 2019-09, then focuses the calendar heading. Verified the 672 / 4,205 / 810.4 table and the NOAA-20 map at 4,205 recorded hotspots. After handoff, switching to Canada (August 2023, 437,553 recorded hotspots) and South Africa (July 2024, 65,413) keeps the Raw view and updates the calendar, selected month and map with no console errors.

Browser checks covered 1440×900, 768×1024, 390×844 and 320×568 with no horizontal overflow. All five stages fit at 1440 and 768. At 390, step 1's primary action is visible (bottom 843 px of 844) and the handoff action is visible; steps 2 and 3 require a short scroll. At 320, the page does not overflow horizontally, but all step actions, including the handoff, start below the fold. Keyboard range arrows, Enter advancement, focus-to-title, live announcements, Back, Replay, Skip, the table disclosure and the validation link were exercised. Touch tap updates the readout and slider; at 390 px each month column is sub-pixel, so the range slider is the precise selector. Reduced motion disables the transition and switches instantly. There were no page or console errors.

Source and `out/` are byte-identical for the four frontend files. Cache versions are `style.css?v=7`, `app.js?v=8`, `story.js?v=2` and `hotspot-map.js?v=3`; the preview serves `out/` at http://127.0.0.1:8766. Residual issues: the story heading is an `h2` before the explorer `h1`, the story fetches `pilot.json` separately from the explorer, and the mobile folds noted above. No Git repository is initialized.
