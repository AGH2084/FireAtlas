# FIRMS local data inventory

Root is `D:/NASA_SpaceApps_2026/data/`. Preserve it in place.

| Directory or file | Use |
| --- | --- |
| `raw/{MODIS,VIIRS_SNPP,VIIRS_NOAA20}/{year}/{country}/` | Extracted country-year hotspot CSVs. Use relative paths from the manifest. |
| `archives/{MODIS,VIIRS_SNPP,VIIRS_NOAA20}/` | Original NASA all-country yearly ZIPs. |
| `metadata/country_inventory.csv` | Input manifest with source, year, country, relative path, bytes, counts, dates, satellites, versions, confidence values, columns and CRC32. |
| `metadata/archive_inventory.csv`, `yearly_summary_files.txt`, `AttributesReadme.txt` | Archive verification, NASA catalog snapshot and field guidance. |
| `metadata/nasa_missing_standard_days.csv`, `MISSING_DAYS.md` | Known source outages by platform, with snapshot provenance. |
| `README.md`, `VERIFICATION.md`, `logs/`, `scripts/` | Local acquisition procedure, reported verification evidence, logs and scripts. |

| Local source | Years | ZIPs | CSVs | Hotspot rows from verification report | Earliest reported detection |
| --- | --- | ---: | ---: | ---: | --- |
| MODIS (Terra/Aqua) | 2000–2025 | 26 | 5,275 | 111,424,417 | 2000-11-01 |
| VIIRS S-NPP (`N`) | 2012–2025 | 14 | 3,062 | 281,144,514 | 2012-01-20 |
| VIIRS NOAA-20 (`N20`, `viirs-jpss1`) | 2018–2025 | 8 | 1,758 | 155,932,272 | 2018-04-01 |
| Total | | 48 | 10,095 | 548,501,203 | |

Direct checks enumerated the ZIP and CSV files and matched sizes to the report (9.75 GB compressed, 43.47 GB extracted). Sampled all three 2024 exports for Bulgaria, Canada, South Africa and Brazil. The manifest contains 238 distinct NASA country/territory names across all years. The existing verification report records catalog checksums, matching extraction CRCs and full row parsing. Onboarding reused those results and did a bounded spot check.

Samples have one row per hotspot observation, with WGS84 coordinates, UTC acquisition date/time, instrument, satellite, confidence, version, scan/track, brightness channels, FRP, day/night and type. MODIS samples use a numeric confidence field while VIIRS uses category codes such as `n`. Preserve leading zeroes in acquisition time and preserve the original version strings. The report lists MODIS versions `6.03`, `6.2` and `61.03`, and VIIRS version `2`. Confirm type/confidence definitions and distributions before filtering. [NASA attribute definitions](https://www.earthdata.nasa.gov/data/tools/firms/active-fire-data-attributes-modis-viirs) · [NASA country inventory](https://firms.modaps.eosdis.nasa.gov/country/) · [NASA catalog](https://firms.modaps.eosdis.nasa.gov/data/country/yearly_summary_files.txt)

NASA's country catalog lists countries with recorded detections for each source/year. An absent file leaves coverage unknown. All three sources have partial first years. The local missing-day snapshot lists 56 Terra, 26 Aqua, 35 S-NPP and 6 NOAA-20 platform-day outages through 2025. It cannot account for cloud, partial-day and regional gaps. S-NPP ended new FIRMS delivery in November 2026. Treat the optional recent-data extension as a separate product with its own provenance. [FIRMS FAQ](https://www.earthdata.nasa.gov/data/tools/firms/faq) · [FIRMS API and availability services](https://firms.modaps.eosdis.nasa.gov/api/)

## Sample workload

All four countries have files for all requested years in each source. Manifest counts for 2024 across all three sources give these workloads.

| Country | Rows in 2024 | Use |
| --- | ---: | --- |
| Bulgaria | 10,220 | Fast vertical slice and Sofia demo |
| South Africa | 520,530 | Southern Hemisphere and larger benchmark |
| Canada | 1,679,579 | Higher-latitude transfer and major fire seasons |
| Brazil | 4,452,038 | Stress test and contrasting burning regime |

## Windows preflight

- AMD Ryzen 7 6800HS Creator Edition, 16 logical processors. Windows reported 13.69 GiB usable and 3.58 GiB currently available at the check.
- C: had about 4.18 GiB free, including the current temp location. D: had about 283.50 GiB free. Put large scratch/output work on D: outside the originals if a writable output location is available. The repo and its small demo export can stay on C:. Check disk before package installation and builds.
- Working executables were Python 3.15.2, Node 24.13.0, npm 11.11.0 and Git 2.45.1. The current Python environment has none of Polars, NumPy, SciPy or DuckDB. Python's standard library is enough to begin. Check compatible wheels before depending on any analytical package.
- The workspace was empty and had no Git repository. Initialize it and add ignores in the first implementation session.



## Inputs for dashboard comparison

The existing country history JSON includes `months[].index.platform`, `months[].index.value`, and `months[].platforms[platform].vegetation_detections` with per-platform status. These fields supply the raw and adjusted comparison from the current static release.
