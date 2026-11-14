# FireAtlas interactive opening

Build a roughly 30-second guided Bulgaria story above the existing explorer. The visitor should be able to explain how changing satellites can change the apparent peak in a detection record.

## Visitor flow

1. **Inspect the record.** Open with “Which month had the most detections?” and a large timeline of monthly raw vegetation detections in Bulgaria, 2000–2025. Label the vertical axis and let visitors inspect individual months by pointer, touch and keyboard. Let them select a month or go straight to **Reveal the satellite switch**. Include **Skip to explorer**.
2. **Reveal the switch.** Highlight September 2019, the raw peak at 4,205 NOAA-20 detections, and mark the January 2019 transition from Aqua to NOAA-20. Explain that the chart uses one platform per month and that the instrument can affect the count. On **Show Aqua-equivalent estimates**, redraw on the same time axis and numeric scale, label the new units, and highlight August 2001 at 3,318.0. Label that early Terra estimate as extrapolated. A short transition can help the visitor follow the change.
3. **Show the same month through two satellites.** For September 2019, show three horizontal bars on the same numerical scale, with Aqua recorded at 672, NOAA-20 recorded at 4,205, and the NOAA-20 estimate on Aqua's scale at 810.4. Visually distinguish the modeled estimate from recorded counts. State that the model used earlier overlap months to estimate a conversion factor. Show 225.6 → 9.3 as the average absolute difference from Aqua across 23 held-out months in 2024–2025. Label the unit as detections per month.
4. **Open the explorer.** Link directly to Bulgaria, September 2019 in Raw comparison view, with the map and satellite table available. Include Replay and a direct path to the explorer from the opening screen.

## Build sequence

1. Read AGENTS.md and the latest checkpoint in docs/PROGRESS.md. Work in dashboard/ and use the existing generated release in out/. Reuse the Bulgaria history payload and the existing explorer's rendering and selection code.
2. Build the timeline and reveal as a small self-contained component. Derive both peaks from the same months with an available harmonized estimate, and leave unavailable months as gaps. Explain this eligibility rule in a short chart note. Read the overlap and validation numbers from the same payload. Use the existing month and platform labels.
3. Build the overlap bars and validation line. Lead with the chart, the question, and one primary action per step. Use the existing FireAtlas typography and a restrained ember highlight. Let the visitor advance at their own pace. A reduced-motion preference should switch states immediately.
4. Wire both paths into the explorer. Keep the current three-country filters available and use the existing map when the visitor opens the example. Serve the updated frontend from out/ on localhost:8766 using the README instructions. Record the preview and any open issues in docs/PROGRESS.md.

## Acceptance checks

- The first screen makes the question and action obvious. The full story takes roughly 30 seconds without requiring a prediction.
- The raw and adjusted peaks match the Bulgaria export. Verify the two observed counts, the estimate, and the held-out figures. The chart labels refer to satellite detections and estimates. The validation text describes agreement with Aqua.
- A visitor can complete, skip, and replay the story by keyboard or touch. The timeline has a readable text equivalent and the reveal announces its result. Check desktop, a narrow phone viewport, and reduced motion.
- Explore the example after the reveal, then switch to Canada and South Africa. Verify the existing calendar and map still follow selection.
- Show the prototype to someone unfamiliar with the project and ask why the peak moved. Their answer should mention the satellite change and the adjustment to a common scale.

## Skills and tools

No plugin is required. If design-taste-frontend is available in OpenCode, use it for visual hierarchy, typography, and responsive polish. The interaction and data requirements above define the experience. A browser preview or browser automation tool helps with layout and interaction checks. Real satellite imagery can wait until the chart-led walkthrough works.
