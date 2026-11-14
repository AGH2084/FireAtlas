"""Run an offline, manifest-driven FIRMS overlap experiment."""

import argparse
from collections import Counter, defaultdict
import csv
import json
import math
from pathlib import Path
import statistics
import time


PLATFORMS = {"Terra": "Terra", "Aqua": "Aqua", "N": "S-NPP", "N20": "NOAA-20"}
SOURCES = {"Terra": "modis", "Aqua": "modis", "S-NPP": "viirs-snpp", "NOAA-20": "viirs-jpss1"}
FIRST_YEAR = {"Terra": 2000, "Aqua": 2002, "S-NPP": 2012, "NOAA-20": 2018}
PAIRS = ("Terra", "S-NPP", "NOAA-20")
FITS = {"Terra": 2013, "S-NPP": 2013, "NOAA-20": 2019}
METRICS = ("vegetation_detections", "detected_cell_days")


def grid_cell(latitude, longitude):
    # Spherical cylindrical equal-area projection, standard parallel 45 degrees.
    radius = 6371007.18
    parallel_cosine = math.cos(math.pi / 4)
    x = radius * math.radians(longitude) * parallel_cosine
    y = radius * math.sin(math.radians(latitude)) / parallel_cosine
    return math.floor(x / 10000), math.floor(y / 10000)


def read_months(root, country):
    with (root / "metadata/country_inventory.csv").open(encoding="utf-8", newline="") as file:
        manifest = [row for row in csv.DictReader(file) if row["country"] == country]
    if not manifest:
        raise ValueError(f"No catalog files for {country}")

    raw, vegetation = Counter(), Counter()
    grid = Counter()
    files = {}
    row_types = Counter()
    missing = defaultdict(list)
    with (root / "metadata/nasa_missing_standard_days.csv").open(encoding="utf-8", newline="") as file:
        for row in csv.DictReader(file):
            platform = row["satellite"].split(" (", 1)[0]
            if platform == "Suomi NPP":
                platform = "S-NPP"
            missing[platform, row["date"][:7]].append(row["date"])

    for item in manifest:
        year, source = int(item["year"]), item["source"]
        local_path = root / item["path"]
        total = 0
        platforms_seen = set()
        cell_days = defaultdict(set)
        with local_path.open(encoding="utf-8", newline="") as file:
            for row in csv.DictReader(file):
                total += 1
                platform, date = PLATFORMS[row["satellite"]], row["acq_date"]
                if SOURCES[platform] != source or date[:4] != item["year"]:
                    raise ValueError(f"Unexpected platform/date in {local_path}")
                platforms_seen.add(platform)
                key = platform, date[:7]
                raw[key] += 1
                row_type = row.get("type", "").strip()
                row_types[row_type] += 1
                if row_type == "0":
                    vegetation[key] += 1
                    cell = grid_cell(float(row["latitude"]), float(row["longitude"]))
                    cell_days[key].add((date, cell))
        if total != int(item["rows"]):
            raise ValueError(f"Manifest row count mismatch for {local_path}: {total}")
        if (source, year) in files:
            raise ValueError(f"Multiple files for {country}, {source}, {year}")
        files[source, year] = platforms_seen
        for key, cells in cell_days.items():
            grid[key] += len(cells)

    months = []
    for year in range(2000, 2026):
        for number in range(1, 13):
            month = f"{year}-{number:02}"
            readings = {}
            for platform, source in SOURCES.items():
                key = platform, month
                present = platform in files.get((source, year), ())
                if year < FIRST_YEAR[platform]:
                    status = "before_record"
                elif (source, year) not in files:
                    status = "file_unavailable"
                elif not present:
                    status = "platform_absent_from_file"
                elif year == FIRST_YEAR[platform]:
                    status = "partial_start_year"
                elif missing[key]:
                    status = "known_outage"
                else:
                    status = "catalog_available_coverage_unknown"
                readings[platform] = {
                    "status": status,
                    "known_missing_days": len(missing[key]),
                    "raw_detections": raw[key] if present else None,
                    "vegetation_detections": vegetation[key] if present else None,
                    "detected_cell_days": grid[key] if present else None,
                }
            months.append({"month": month, "platforms": readings})
    return months, manifest, row_types


def ranks(values):
    groups = defaultdict(list)
    for index, value in enumerate(values):
        groups[value].append(index)
    result = [0.0] * len(values)
    next_rank = 1
    for value in sorted(groups):
        indexes = groups[value]
        average = next_rank + (len(indexes) - 1) / 2
        for index in indexes:
            result[index] = average
        next_rank += len(indexes)
    return result


def score(pairs, factor):
    if not pairs:
        return {"months": 0}
    predicted = [source * factor for source, _ in pairs]
    reference = [target for _, target in pairs]
    errors = [estimate - actual for estimate, actual in zip(predicted, reference)]
    mae = statistics.mean(map(abs, errors))
    mean_reference = statistics.mean(reference)
    rho = None
    if len(set(predicted)) > 1 and len(set(reference)) > 1:
        rho = statistics.correlation(ranks(predicted), ranks(reference))
    return {
        "months": len(pairs),
        "mean_reference": mean_reference,
        "mae": mae,
        "mae_over_mean_reference": mae / mean_reference if mean_reference else None,
        "bias": statistics.mean(errors),
        "spearman": rho,
    }


def fit_factor(pairs):
    source_total = sum(source for source, _ in pairs)
    target_total = sum(target for _, target in pairs)
    if len(pairs) >= 24 and source_total and target_total:
        return target_total / source_total
    return None


def compare(months, transfer=None):
    results = {}
    eligible = "catalog_available_coverage_unknown"
    for platform in PAIRS:
        results[platform] = {}
        for metric in METRICS:
            splits = defaultdict(list)
            for row in months:
                year = int(row["month"][:4])
                if year < FITS[platform]:
                    continue
                source, aqua = row["platforms"][platform], row["platforms"]["Aqua"]
                if source["status"] != eligible or aqua["status"] != eligible:
                    continue
                split = "train" if year <= 2021 else "validation" if year <= 2023 else "holdout"
                splits[split].append((source[metric], aqua[metric]))
            train = splits["train"]
            factor = fit_factor(train)
            results[platform][metric] = {
                "train_months": len(train),
                "factor": factor,
                **{
                    split: {
                        "unadjusted": score(splits[split], 1),
                        "adjusted": score(splits[split], factor) if factor is not None else None,
                    }
                    for split in ("validation", "holdout")
                },
            }
            if transfer is not None:
                external = transfer[platform][metric]["factor"]
                results[platform][metric]["transferred"] = {
                    "factor": external,
                    **{
                        split: score(splits[split], external) if external is not None else None
                        for split in ("validation", "holdout")
                    },
                }
    return results


def write_json(path, value):
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-root", type=Path, default=Path("D:/NASA_SpaceApps_2026/data"))
    parser.add_argument("--country", default="Bulgaria", help="Exact NASA country inventory name")
    parser.add_argument("--output", type=Path, default=Path("outputs/pilot"))
    parser.add_argument("--transfer-from", type=Path, help="Apply factors from this pilot report")
    args = parser.parse_args()
    root, output = args.data_root.resolve(), args.output.resolve()
    if output.is_relative_to(root):
        parser.error("Choose an output directory outside the original data tree")

    start = time.perf_counter()
    months, manifest, row_types = read_months(root, args.country)
    transfer = None
    if args.transfer_from:
        transfer = json.loads(args.transfer_from.read_text(encoding="utf-8"))
        if transfer["reference"] != "Aqua" or transfer["country"] == args.country:
            parser.error("Transfer requires an Aqua-reference report from another country")
    comparisons = compare(months, transfer["comparisons"] if transfer else None)
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / "monthly.json", {
        "schema_version": 1,
        "country": args.country,
        "months": months,
    })
    report = {
        "country": args.country,
        "reference": "Aqua",
        "source_files": [item["path"] for item in manifest],
        "row_types": dict(sorted(row_types.items())),
        "comparisons": comparisons,
    }
    if transfer:
        report["transfer_country"] = transfer["country"]
    write_json(output / "report.json", report)
    print(f"{args.country}: {sum(row_types.values()):,} observations from {len(manifest)} files")
    print(f"Finished in {time.perf_counter() - start:.2f} s. Results: {output}")


if __name__ == "__main__":
    main()
