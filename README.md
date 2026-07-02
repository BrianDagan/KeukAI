# KeukAI 🍷🌊

An interactive vacation map for **Keuka Lake** and the surrounding Finger Lakes
(upstate New York). KeukAI plots wineries, breweries, restaurants, marinas,
museums, shops, emergency services and more as emoji-coded pins you can filter,
search, and navigate to — in both a flat 2D map and a photorealistic 3D globe.

> Live: **https://keukai.briandagan.com**

## Features

- 🗺️ **Emoji-coded map** — every place is a category emoji (🍷 🍺 🍽️ ⛵ 🏛️ 🚑 …),
  filterable by activity, with search.
- 🌎 **2D / 3D views** — a flat Leaflet/OpenStreetMap map and a Google-Earth-style
  CesiumJS globe with real terrain + satellite imagery.
- ⭐ **Home base** — Willow Landing is pinned as the trip's home base; all drive
  times are measured from there.
- 🕑 **Open / closed now** — hours are evaluated in `America/New_York` time; closed
  places get a red ✕ badge (icons stay full-color for legibility), and the header
  shows a live open/closed tally.
- 🚗 **Drive-time ETAs** — estimated driving time from the home base (OSRM with a
  straight-line fallback), plus a collapsible "nearest first" flyout.
- 🧭 **One-tap navigation** — Waze and Google Maps deep links for every place.
- 🌙 **Dark mode** — persisted, respects your system preference.

## Tech stack

Vite · React + TypeScript · Tailwind CSS · react-leaflet (2D) · CesiumJS (3D).
No backend and no API keys required — the site is fully static and every runtime
dependency is a free, HTTPS, token-free service.

## Local development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Data

Place data lives in `src/data/`:

- `enriched/*.json` — verified place records (hours, phone, website, reviews),
  each with a `sourceUrl`. Anything unverified is flagged `needsReview`.
- `enriched/updates/*.json` — second-pass corrections, reclassifications and
  de-duplications applied on top of the enriched set.
- `places.json` — the built dataset the app imports (generated; do not edit by hand).

Regenerate `places.json` (merges the files above and geocodes addresses via the
OpenStreetMap Nominatim service, throttled + cached):

```bash
npm run geocode
```

Place details are researched from public sources; accuracy is best-effort, so
always call ahead to confirm hours before a visit.

## Deployment

The site deploys to GitHub Pages via the workflow in
`.github/workflows/deploy.yml` (build → `actions/deploy-pages`). The custom
domain is configured in `public/CNAME`.

## Credits

Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors ·
routing by [OSRM](http://project-osrm.org/) · 3D imagery & terrain by
[Esri](https://www.esri.com/) · globe by [CesiumJS](https://cesium.com/) ·
navigation via [Waze](https://www.waze.com/) and Google Maps.

## License

[MIT](./LICENSE) © 2026 Brian Dagan
