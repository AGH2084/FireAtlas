# 2026 challenge and submission requirements

Verified November 14, 2026. All times below are Sofia local time (EET, UTC+02:00).

## Challenge scope

- **Explicit objective.** Deliver a web app with a harmonized MODIS/VIIRS active-fire hotspot time series and a burning-activity calendar. Use it to explore seasonal patterns, unusual conditions and critical periods in a selected area. The objective calls for a long record from the early 2000s to the present. [Official challenge](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/)
- **MVP interpretation.** Let the user select a country and date range. Provide month-of-year historical context, a map, and an auditable raw-versus-harmonized comparison. End at the latest local complete year, 2025, and state that cutoff in the UI and submission. The challenge mentions recent/current comparisons, so the frozen 2025 endpoint is a scope gap against a literal present-day reading. Explore a separately labeled 2026 extension only if time and comparable verified coverage permit. [Official challenge](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/)
- **Suggested outputs.** Drawing an area, entering coordinates, downloading analytics or visuals, and exporting hotspot CSV are examples in the challenge wording. Use accessible colors and readable numeric values as part of the core design. Worldwide ingest is a FireAtlas design goal. [Official challenge](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/)
- **NASA data.** FIRMS is the listed resource. Global Award eligibility requires using at least one NASA resource. Cite FIRMS products and versions and link the usage guidance. [Challenge resources](https://www.spaceappschallenge.org/2026/challenges/modis-and-viirs-hot-spots/?tab=resources) · [Submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/#project-page-form-field-instructions) · [FIRMS attribution](https://www.earthdata.nasa.gov/data/tools/firms)

## Eligibility and rules

- **A one-person Sofia team is eligible for Global Judging.** Local Event teams can have 1–6 members. Universal Event teams require at least two. For Sofia, create the team page, choose this official challenge and verify that every listed member, including the owner, is a registered and accepted Sofia participant and appears on the Members tab. Local nominations determine which projects advance. Local finalist selection and awards are separate. [Judging and awards guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/#eligibility-for-global-judging) · [Team formation guide](https://www.spaceappschallenge.org/resources/team-formation-guide/)
- The FAQ prohibits starting challenge work before the hackathon. Sofia listed 10:30 Saturday as the start of hacking. The main event page describes a registration window through the close, while the Terms require registration before the start. This onboarding did not verify account status or the timing of earlier data preparation. Confirm personal registration and ask the Local Lead about archival data preparation if any happened before the start. [Participant FAQ](https://www.spaceappschallenge.org/resources/participant-faqs/) · [Terms and Conditions](https://www.spaceappschallenge.org/legal/) · [2026 event page](https://www.spaceappschallenge.org/2026/)
- Submit original work that directly addresses the challenge. Cite all datasets, tools, code, text and assets. Identify applicable licenses and use third-party materials available for public use under the event terms. Observe the rights, consent and privacy terms for media, including the restrictions on identifiable under-18 participants. [Terms and Conditions](https://www.spaceappschallenge.org/legal/)
- The 2026 guide permits AI assistance, called SI in the form, to accelerate work and expects the team to originate the solution idea. Disclose Codex assistance. Acknowledge generated code/data in descriptive text and metadata where applicable. Generated imagery or video requires a visible watermark, and generated audio requires disclosure in descriptive text and metadata. Generated content must follow the NASA branding restriction. [Submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/#project-page-form-field-instructions)

## Deadlines and materials

| When | Requirement or milestone |
| --- | --- |
| Sat Nov 14, 09:00 | NASA website submission opened |
| Sat Nov 14, 10:30 | Sofia hacking began |
| Sun Nov 15, 10:00 | FireAtlas internal feature freeze |
| Sun Nov 15, 14:00 | Sofia demo due, 30–60 seconds of video |
| Sun Nov 15, 14:30 | Sofia demo screening |
| Sun Nov 15, 15:45 | Five Sofia finalists announced |
| Sun Nov 15, 16:00 | Sofia live finals, 3-minute pitch and 5-minute Q&A |
| Sun Nov 15, 17:30 | Sofia awards and closing |
| Sun Nov 15, 23:59 | NASA website submission closes |

The supplied 14:00 and 16:00 times match the published Sofia schedule. NASA's website demo cap is **30 seconds**, or up to **seven slides** including title and introductory slides. A 30-second English video fits both published windows. Confirm the local upload route with the Local Lead or venue announcement. The published schedule gives timing and format. [Sofia schedule](https://www.spaceappschallenge.org/2026/local-events/sofia/?tab=schedule) · [Submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/)

Complete the Team page's Project tab with project name, high-level summary, public demo link, public final project link, detailed description, AI/SI disclosure, NASA data and other references. Use English for the form and linked material. A video with non-English speech needs English subtitles. Verify links in a signed-out window, accept the terms and original-work confirmations, click **Submit for Judging**, and verify the success banner. Recheck submission after edits and resubmit as needed. [Submission guide](https://www.spaceappschallenge.org/resources/project-submission-guide/#project-page-form-field-instructions) · [Judging guide](https://www.spaceappschallenge.org/resources/judging-awards-guide/#eligibility-for-global-judging)

## Judging

NASA scores each criterion from **1 to 5** at every level. The FireAtlas evidence below is a plan for the demo and submission. [Official rubric](https://www.spaceappschallenge.org/resources/judging-awards-guide/#judging-criteria)

| Criterion | What judges assess | FireAtlas evidence |
| --- | --- | --- |
| Impact | Who benefits and how much the solution helps | A land manager can put a high-activity month in historical context before deciding where to investigate. |
| Creativity | Originality or a meaningful improvement | Show what a sensor transition does to the raw record and how the calibrated view changes that interpretation. |
| Validity | Scientific grounding, feasibility and usability | Demonstrate a live user flow, blocked holdout metrics, provenance and readable gaps. |
| Relevance | Fit to the chosen challenge and meaningful NASA data use | Show the harmonized FIRMS record directly in the historical calendar. |
| Presentation | Clarity of the problem, solution and significance | Show one country, one month and one before/after comparison. Give the held-out result and limitation in the pitch. |



## Demo notes

The planned comparison walkthrough uses Bulgaria in September 2019 to explain differences between satellite detection counts and demonstrate held-out validation. See the [project handoff](PROGRESS.md#november-14-handoff-before-comparison-mode) for implementation status.


The comparison walkthrough is now available locally under Calendar view > Raw comparison. In Bulgaria, select September 2019 and follow See held-out results to the validation section.
