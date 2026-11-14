"""Assemble a static FireAtlas release from the three existing pilot exports."""

import argparse
from collections import Counter, defaultdict
import csv
import json
import math
from pathlib import Path
import shutil

from pilot import PLATFORMS, write_json


PROJECT = Path(__file__).resolve().parents[1]
COUNTRIES = {"Bulgaria": "pilot", "South_Africa": "south-africa", "Canada": "canada"}


def build_hotspots(root, manifest, history, directory, country):
    selection = {row["month"]: row["index"]["platform"] for row in history["months"]}
    directory.mkdir(parents=True, exist_ok=True)
    overview = {}
    for year in sorted({row["month"][:4] for row in history["months"]}):
        points = defaultdict(lambda: defaultdict(list))
        for item in manifest:
            if item["country"] != country or str(item["year"]) != year:
                continue
            if item["source"] not in {"modis", "viirs-jpss1"}:
                continue
            with (root / item["path"]).open(encoding="utf-8", newline="") as file:
                for row in csv.DictReader(file):
                    date = row["acq_date"]
                    month = date[:7]
                    if row["type"] != "0" or PLATFORMS[row["satellite"]] != selection.get(month):
                        continue
                    lon, lat = float(row["longitude"]), float(row["latitude"])
                    cell = math.floor(lon * 2), math.floor(lat * 2)
                    points[month][cell].append([lon, lat, date, row["acq_time"], row["confidence"]])
        for row in history["months"]:
            month = row["month"]
            if not month.startswith(year):
                continue
            cells = points.get(month, {})
            expected = row["platforms"][selection[month]]["vegetation_detections"]
            if sum(map(len, cells.values())) != (expected or 0):
                raise ValueError(f"Hotspots do not reconcile: {country}, {month}")
            entries = []
            bundles = defaultdict(dict)
            for (x, y), group in sorted(cells.items()):
                # Anchor each cluster to a recorded point nearest its mean, never an empty grid center.
                lon = sum(p[0] for p in group) / len(group)
                lat = sum(p[1] for p in group) / len(group)
                anchor = min(group, key=lambda p: (p[0]-lon)**2 + (p[1]-lat)**2)
                entries.append([x, y, len(group), anchor[0], anchor[1]])
                bundles[(x // 10, y // 10)][f"{x}:{y}"] = group
            if entries:
                overview[month] = entries
            for (x, y), bundle in bundles.items():
                (directory / f"{month}-{x}-{y}.json").write_text(json.dumps(bundle, separators=(",", ":")), encoding="utf-8")
        print(f"Hotspots {country} {year}", flush=True)
    (directory / "overview.json").write_text(json.dumps(overview, separators=(",", ":")), encoding="utf-8")


def detection_map(root, manifest, country):
    cells = defaultdict(Counter)
    for item in manifest:
        if item["country"] != country or item["source"] != "viirs-jpss1":
            continue
        with (root / item["path"]).open(encoding="utf-8", newline="") as file:
            for row in csv.DictReader(file):
                if row["type"] == "0":
                    cell = tuple(math.floor(float(row[axis]) * 2) for axis in ("longitude", "latitude"))
                    cells[row["acq_date"][:7]][cell] += 1
    return {
        month: [[x, y, count] for (x, y), count in sorted(counts.items())]
        for month, counts in sorted(cells.items())
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-root", type=Path, default=Path("D:/NASA_SpaceApps_2026/data"))
    parser.add_argument("--country", choices=COUNTRIES, help="Rebuild one country in an existing release")
    args = parser.parse_args()
    root = args.data_root.resolve()
    release = PROJECT / "out"
    if release.resolve().is_relative_to(root):
        parser.error("The static output must be outside the original data directory")
    with (root / "metadata/country_inventory.csv").open(encoding="utf-8", newline="") as file:
        manifest = list(csv.DictReader(file))
    data_dir = release / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    for country, folder in COUNTRIES.items():
        if args.country and args.country != country:
            continue
        history = json.loads((PROJECT / "outputs" / folder / "history.json").read_text(encoding="utf-8"))
        if history["country"] != country:
            raise ValueError(f"Unexpected country in {folder}")
        geography = detection_map(root, manifest, country)
        for row in history["months"]:
            month = row["month"]
            expected = row["platforms"]["NOAA-20"]["vegetation_detections"]
            if sum(cell[2] for cell in geography.get(month, ())) != (expected or 0):
                raise ValueError(f"Map does not reconcile for {country}, {month}")
        write_json(data_dir / f"{folder}.json", history)
        (data_dir / f"{folder}-map.json").write_text(
            json.dumps(geography, separators=(",", ":")), encoding="utf-8"
        )
        build_hotspots(root, manifest, history, data_dir / (folder + "-hotspots-v2"), country)
        print(f"Built {country}", flush=True)
    for path in (PROJECT / "dashboard").iterdir():
        if path.is_file():
            shutil.copyfile(path, release / path.name)
        elif path.is_dir() and path.name in {"vendor", "map-context"}:
            shutil.copytree(path, release / path.name, dirs_exist_ok=True)


if __name__ == "__main__":
    main()
