# KeukAI — Copilot Instructions

## What this repo is

KeukAI is a **big, beautiful, filterable interactive SPA** for a Keuka Lake / Finger
Lakes (upstate NY) family vacation. It plots wineries, breweries, restaurants, marinas,
museums, shops, emergency services and more as emoji-coded pins on a 2D map and a 3D
globe, from the trip's home base at **Willow Landing**.

Places were seeded from public Finger Lakes visitor listings, then enriched with
verified details (hours, website, phone, address, reviews), geocoded, and rendered as a
category-filterable map + browsable list.

## Accuracy is the whole point

This app is used to make real plans on a real vacation, so **correctness beats coverage.**

- Treat the seed place list as a starting point, **not** as authoritative for details.
  Verify every phone/address/website against the business's own site or an authoritative
  source before trusting it.
- Never invent hours, phone numbers, reviews, or coordinates. If a field can't be
  verified, leave it empty/null and mark the record as needing review — do not guess.
- Record where each enriched fact came from (`sourceUrl`) so it can be re-checked.

## Target stack

- **Vite + React + TypeScript** SPA.
- **Tailwind CSS** for styling.
- **react-leaflet** + **Leaflet** (OpenStreetMap tiles) for the 2D map, **CesiumJS**
  (free, token-free Esri terrain + imagery) for the 3D globe.
- Data is **static JSON** shipped with the app (no backend/server at runtime). The
  enrichment/geocoding pipeline is a build-time/offline concern, not part of the SPA.

## Architecture (big picture)

Two clearly separated halves:

1. **Data pipeline (`scripts/`, run offline, Node/TS).** Verified JSON → geocoded dataset.
   - Merge the verified `enriched/` records with the `updates/` overrides.
   - Geocode addresses and emit versioned `src/data/places.json` (+ category metadata).
     The SPA only ever reads this committed JSON — it never calls the pipeline at runtime.

2. **SPA (`src/`).** Reads `places.json` and renders:
   - A **map** with one marker per place, color/icon-coded by category.
   - **Category filters** (multi-select) that filter both map and list together.
   - A **detail view** per place (hours, contact, website, reviews, description, source).

The pipeline data flow, concretely:
- `src/data/enriched/<category>.json` — verified places (hours, phone, website, reviews).
- `src/data/enriched/updates/<category>.json` — field-level overrides applied by id/name
  (a changed address clears stale coords for re-geocoding; supports remove/reclassify).
- `scripts/geocode.ts` merges enriched + updates, geocodes via Nominatim (throttled +
  cached in `scripts/.cache/`), and writes `src/data/places.json`.

Keep these decoupled: the SPA must build and run from committed JSON even if the pipeline
is broken or its network sources are down.

## Data model

Every place is one object. Keep the shape stable and typed (`src/data/types.ts`).
Suggested core fields — extend as needed but don't rename casually:

```ts
type Category =
  | 'winery' | 'brewery-distillery' | 'restaurant' | 'cafe'
  | 'festival-event' | 'museum-historical' | 'marina-boat-rental'
  | 'shopping' | 'lodging-rental' | 'spa' | 'dog-friendly'
  | 'race-track'
  | 'hospital-urgent-care'; // safety/emergency

// Each category maps to an emoji used as its map marker + filter icon:
//   winery 🍷  brewery-distillery 🍺  restaurant 🍽️  cafe ☕
//   festival-event 🎪  museum-historical 🏛️  marina-boat-rental ⛵
//   shopping 🛍️  lodging-rental 🏡  spa 💆  dog-friendly 🐶  race-track 🏁
//   hospital-urgent-care 🚑    home base (Willow Landing) ⭐
// Keep this map in one place (e.g. src/data/categoryMeta.ts) — label + emoji + color.

// Per-day opening hours, 24h "HH:MM". Enables the open/closed-now logic.
// null day = closed that day. Omit/undefined = hours unknown (don't gray out).
interface DayHours { open: string; close: string }
type WeeklyHours = Partial<Record<
  'sun'|'mon'|'tue'|'wed'|'thu'|'fri'|'sat', DayHours | null
>>;

interface Place {
  id: string;              // stable slug
  name: string;
  categories: Category[];  // a place can be multiple (e.g. winery + dog-friendly)
  lake?: string;           // e.g. 'Keuka', 'Seneca', 'Cayuga', 'Canandaigua'
  address?: string;
  lat?: number; lng?: number;
  phone?: string;
  website?: string;
  hours?: WeeklyHours;     // structured so the SPA can compute open/closed now
  hoursNote?: string;      // seasonal caveats, "by appointment", etc.
  description?: string;
  reviews?: { rating?: number; count?: number; summary?: string };
  sourceUrl?: string;      // where enriched facts were verified
  needsReview?: boolean;   // true when any field is unverified/uncertain
}
```

### Home base (Willow Landing)

The family is staying at **Willow Landing** on Keuka Lake — treat it as the trip's
**home base**, not just another place:

- Render it with a distinct **⭐ star marker** (visually different from category pins).
- It is the **origin** for all travel-time estimates (see below).
- Store it separately from `places` (e.g. `src/data/homeBase.ts`) with `name`, `address`,
  `lat`, `lng`, and any house rules. Its exact address must be geocoded/verified before
  travel times mean anything — mark `needsReview` until confirmed.
- Consider surfacing the home-base **House Rules** and emergency info on/near the
  home-base view so guests see them.

### Time zone & "now"

All open/closed and travel-time logic is anchored to **America/New_York** (Finger Lakes,
NY) — compute "now" in that zone, not the user's local zone, so results are correct even
if someone opens the app from another time zone.

## Conventions

- The committed JSON is the product. When you improve enrichment, regenerate and commit
  the JSON (`npm run geocode`) so the SPA and data stay in sync.
- Prefer free/no-key data sources so the pipeline is reproducible (e.g. OSM/Nominatim for
  geocoding — respect its usage policy and cache results). If a keyed API is introduced,
  read the key from an env var, never commit it.
- Filtering is category-driven and must apply to map and list simultaneously — they share
  one filtered dataset, not two independent ones.
- This is a NY Finger Lakes dataset; keep `lake` and town/region context, since users
  plan by proximity to where they're staying.

## Map & marker behavior

- **Markers are emoji-coded** by category (see the emoji map above); Willow Landing uses
  the ⭐ star. The map is centered on **Keuka Lake** by default with the surrounding
  Finger Lakes destinations in view.
- **Emergency places (🚑 hospital-urgent-care)** are a distinct, safety-styled category
  (`safety: true`). They default to **on** but are **user-toggleable** like any other
  filter, so travelers can hide them when they only want activities.
- **Open/closed now:** using each place's structured `hours` and the current
  America/New_York time, visually **gray out / de-emphasize places that are currently
  closed** (dim marker + list row, e.g. show an "Open"/"Closed" badge). Places with
  unknown hours are shown normally (never falsely marked closed). This state is derived at
  render time from "now" — never bake it into the JSON.
- Filtering, open/closed dimming, and travel-time all read from the **one shared filtered
  dataset** so map and list never diverge.
- **2D / 3D views:** a toggle switches between the flat Leaflet map and a "Google
  Earth"-style **CesiumJS 3D globe** (`src/components/Cesium3DView.tsx`). The globe uses
  **free, token-free Esri** satellite imagery + 3D terrain (no Cesium ion account/billing;
  `Ion.defaultAccessToken = ''`). Cesium is **lazy-loaded** (`React.lazy`) so it only
  downloads when 3D is opened. Markers are color-emoji billboards (rendered to a canvas so
  emoji stay colored, unlike SDF labels); closed places are grayscaled the same as 2D.
- **Open/closed tally:** the header shows a live "🟢 N open · 🔴 N closed" count over the
  currently-filtered places, recomputed each minute alongside the open/closed logic.

## Travel time from home base

Each destination shows an **estimated drive time from Willow Landing**, ideally
traffic-aware:

- Compute a real **driving** ETA (not straight-line distance). Prefer a routing service;
  if it exposes live/traffic-aware durations, use them and label the estimate accordingly.
- **Graceful degradation:** if no routing/traffic API/key is available or the network is
  down, fall back to a free router (e.g. OSRM) or a distance-based estimate, and clearly
  label it as approximate. The SPA must still render without any routing API.
- Any keyed traffic/routing provider's key comes from an **env var**, never committed.
- Cache ETAs where reasonable; don't hammer the routing API on every re-render or filter
  toggle.
- **Waze navigation** is provided via free Waze universal deep links
  (`https://waze.com/ul?ll=<lat>,<lng>&navigate=yes`) — no API key/account needed. On a
  phone these open the Waze app and start live-traffic turn-by-turn navigation, which is
  how a destination gets "sent to the phone". Waze has no free REST API for in-app ETAs,
  so on-map estimates stay routing-based (`src/lib/travel.ts`) while Waze handles actual
  navigation. Nav link builders live in `src/lib/nav.ts`.

## Commands

Once scaffolded (Vite defaults), expect:

- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Preview production build: `npm run preview`
- Run the data pipeline: `npm run pipeline` (or `node scripts/<name>.ts` via tsx)

If you add tests (Vitest), run a single test with:
`npx vitest run src/path/to/file.test.ts -t "test name"`

Update this section with the exact scripts once `package.json` exists.
