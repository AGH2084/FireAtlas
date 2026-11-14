"""Trim pinned Natural Earth v5.1.2 GeoJSON to local map context files."""

import argparse
import json
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
COUNTRIES = {
    "pilot": (21.3, 40.2, 29.7, 45.3),
    "canada": (-142.1, 40.6, -51.5, 84.2),
    "south-africa": (15.3, -36, 34, -21),
}


def points(geometry):
    if geometry["type"] == "Point":
        yield geometry["coordinates"]
    elif geometry["type"] == "LineString":
        yield from geometry["coordinates"]
    elif geometry["type"] == "MultiLineString":
        for line in geometry["coordinates"]:
            yield from line


def within(geometry, bounds):
    west, south, east, north = bounds
    return any(west <= lon <= east and south <= lat <= north for lon, lat in points(geometry))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_dir", type=Path, help="Directory with Natural Earth v5.1.2 GeoJSON inputs")
    args = parser.parse_args()
    names = {
        "roads": "ne_10m_roads.geojson",
        "rivers": "ne_10m_rivers_lake_centerlines.geojson",
        "places": "ne_10m_populated_places.geojson",
    }
    features = {
        kind: json.loads((args.source_dir / name).read_text(encoding="utf-8"))["features"]
        for kind, name in names.items()
    }
    output = PROJECT / "dashboard" / "map-context"
    output.mkdir(exist_ok=True)
    for key, bounds in COUNTRIES.items():
        result = {"roads": [], "rivers": [], "places": []}
        for feature in features["roads"]:
            props = feature["properties"]
            if props["scalerank"] > 5 or not within(feature["geometry"], bounds):
                continue
            result["roads"].append({"type": "Feature", "geometry": feature["geometry"], "properties": {}})
        for feature in features["rivers"]:
            props = feature["properties"]
            if props["scalerank"] > 6 or not within(feature["geometry"], bounds):
                continue
            result["rivers"].append({"type": "Feature", "geometry": feature["geometry"], "properties": {}})
        for feature in features["places"]:
            props = feature["properties"]
            if props["SCALERANK"] > 4 or not within(feature["geometry"], bounds):
                continue
            result["places"].append({"name": props["NAME_EN"] or props["NAME"], "coordinates": feature["geometry"]["coordinates"], "rank": props["SCALERANK"]})
        path = output / f"{key}.json"
        path.write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
        print(key, {kind: len(items) for kind, items in result.items()}, path.stat().st_size)


if __name__ == "__main__":
    main()
