"""Build a dashboard history from an offline country pilot."""

import argparse
import json
from pathlib import Path

from pilot import fit_factor, score, write_json


METRIC = "vegetation_detections"
ELIGIBLE = "catalog_available_coverage_unknown"


def early_pairs(months, first_year, last_year):
    pairs = []
    for row in months:
        year = int(row["month"][:4])
        if first_year <= year <= last_year:
            terra, aqua = (row["platforms"][platform] for platform in ("Terra", "Aqua"))
            if terra["status"] == aqua["status"] == ELIGIBLE:
                pairs.append((terra[METRIC], aqua[METRIC]))
    return pairs


def evaluation(factor, baseline, adjusted, training, holdout):
    # Match the pilot's proposed 10% improvement threshold.
    supported = (
        factor is not None and adjusted is not None and adjusted["months"] >= 12
        and baseline["mae"] > 0 and adjusted["mae"] <= 0.9 * baseline["mae"]
    )
    return {
        "factor": factor,
        "supported": supported,
        "training_years": training,
        "holdout_years": holdout,
        "unadjusted": baseline,
        "adjusted": adjusted,
    }


def build_history(monthly, report):
    if monthly["country"] != report["country"] or report["reference"] != "Aqua":
        raise ValueError("Monthly data and Aqua-reference report must describe the same country")

    months = monthly["months"]
    early_train = early_pairs(months, 2003, 2008)
    early_test = early_pairs(months, 2009, 2011)
    early_factor = fit_factor(early_train)
    terra = evaluation(
        early_factor, score(early_test, 1),
        score(early_test, early_factor) if early_factor is not None else None,
        [2003, 2008], [2009, 2011],
    )
    noaa = report["comparisons"]["NOAA-20"][METRIC]
    viirs = evaluation(
        noaa["factor"], noaa["holdout"]["unadjusted"], noaa["holdout"]["adjusted"],
        [2019, 2021], [2024, 2025],
    )
    bridges = {"Terra": terra, "NOAA-20": viirs}

    history = []
    for row in months:
        month = row["month"]
        platform = "Terra" if month < "2003-01" else "Aqua" if month < "2019-01" else "NOAA-20"
        reading = row["platforms"][platform]
        status = reading["status"]
        factor = 1.0
        if platform in bridges:
            bridge = bridges[platform]
            factor = bridge["factor"]
            if status == ELIGIBLE and not bridge["supported"]:
                status = "unsupported_calibration"
        if platform == "Terra" and month < "2000-11":
            status = "before_record"
        # The first partial year is inspectable in the raw series only.
        value = round(reading[METRIC] * factor, 3) if status == ELIGIBLE else None
        history.append({
            **row,
            "index": {
                "value": value,
                "platform": platform,
                "status": "early_era_extrapolation" if platform == "Terra" and value is not None else status,
            },
        })
    return {
        "schema_version": 1,
        "country": monthly["country"],
        "unit": "Aqua-equivalent presumed vegetation hotspot detections",
        "bridges": bridges,
        "months": history,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pilot_directory", type=Path)
    args = parser.parse_args()
    directory = args.pilot_directory
    monthly = json.loads((directory / "monthly.json").read_text(encoding="utf-8"))
    report = json.loads((directory / "report.json").read_text(encoding="utf-8"))
    history = build_history(monthly, report)
    output = directory / "history.json"
    write_json(output, history)
    print(f"{history['country']}: {sum(row['index']['value'] is not None for row in history['months'])} indexed months → {output}")


if __name__ == "__main__":
    main()
