# MapLibre GL JS vendor files

Pinned release: **6.16.0** from the [MapLibre GL JS npm package](https://www.npmjs.com/package/maplibre-gl/v/6.16.0).

The static app imports the package's ESM bundles as `maplibre-gl.js` and `maplibre-gl-worker.js`, and loads `maplibre-gl.css`. The package names them `.mjs`; we rename them because Python's standard-library HTTP server returns `.mjs` as `text/plain` on this machine, which blocks browser module loading. The release builder copies this directory into `out/vendor/`. No CDN is needed for the library. `LICENSE.txt` is the package's license.

Elevation tiles are separate from these vendor files and require network access. The map falls back to its local background and country outline when they fail.
