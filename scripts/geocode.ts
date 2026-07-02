/**
 * Merge + geocode pipeline.
 * - Reads verified place records from src/data/enriched/*.json (+ updates/ overrides).
 * - Geocodes every place from its address via OpenStreetMap/Nominatim (throttled + cached).
 * - Writes the committed dataset src/data/places.json.
 *
 * Run: npm run geocode
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ENRICHED_DIR = join(ROOT, 'src', 'data', 'enriched');
const UPDATES_DIR = join(ENRICHED_DIR, 'updates');
const OUT = join(ROOT, 'src', 'data', 'places.json');
const CACHE_DIR = join(ROOT, 'scripts', '.cache');
const CACHE = join(CACHE_DIR, 'geocode.json');

type AnyPlace = Record<string, unknown> & {
  id?: string;
  name: string;
  categories: string[];
  address?: string;
  lat?: number;
  lng?: number;
};

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Punctuation-insensitive key so "Babe's Burger" == "babes burger" == "Babe&#39;s Burger". */
function normName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function loadEnriched(): AnyPlace[] {
  if (!existsSync(ENRICHED_DIR)) return [];
  const out: AnyPlace[] = [];
  for (const f of readdirSync(ENRICHED_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      const arr = readJson<AnyPlace[]>(join(ENRICHED_DIR, f));
      if (Array.isArray(arr)) out.push(...arr);
    } catch (e) {
      console.warn(`Skipping ${f}: ${(e as Error).message}`);
    }
  }
  return out;
}

function mergeById(enriched: AnyPlace[]): AnyPlace[] {
  const byId = new Map<string, AnyPlace>();
  const seenNames = new Map<string, string>(); // normName -> id
  for (const p of enriched) {
    const id = p.id || slug(p.name);
    p.id = id;
    const nn = normName(p.name);
    const existingId = seenNames.get(nn);
    const existing = existingId ? byId.get(existingId) : byId.get(id);
    if (existing) {
      existing.categories = Array.from(
        new Set([...(existing.categories ?? []), ...(p.categories ?? [])]),
      );
    } else {
      byId.set(id, p);
      seenNames.set(nn, id);
    }
  }
  return [...byId.values()];
}

/** Category-named update files imply the category for any new place they introduce. */
const CATEGORY_FILES = new Set([
  'winery',
  'brewery-distillery',
  'restaurant',
  'cafe',
  'festival-event',
  'museum-historical',
  'marina-boat-rental',
  'shopping',
  'lodging-rental',
  'spa',
  'trails-parks',
  'race-track',
  'hospital-urgent-care',
]);

/**
 * dog-friendly is a cross-cutting attribute, not a category — convert it to the
 * `dogFriendly` flag. Also drop any categories that aren't in our known set
 * (e.g. an agent inventing "veterinarian"), so one stray value can't break the UI.
 */
function normalizeCategories(places: AnyPlace[]): void {
  for (const p of places) {
    const cats = Array.isArray(p.categories) ? (p.categories as string[]) : [];
    if (cats.includes('dog-friendly')) p.dogFriendly = true;
    const valid = cats.filter((c) => c !== 'dog-friendly' && CATEGORY_FILES.has(c));
    p.categories = Array.from(new Set(valid));
    if (p.categories.length === 0) console.warn(`  ! dropped all categories for: ${p.name}`);
  }
}

function loadUpdates(): AnyPlace[] {
  if (!existsSync(UPDATES_DIR)) return [];
  const out: AnyPlace[] = [];
  for (const f of readdirSync(UPDATES_DIR)) {
    if (!f.endsWith('.json')) continue;
    const fileCat = f.replace(/\.json$/, '');
    const inferred = CATEGORY_FILES.has(fileCat) ? fileCat : null;
    try {
      const arr = readJson<AnyPlace[]>(join(UPDATES_DIR, f));
      if (!Array.isArray(arr)) continue;
      for (const e of arr) {
        // Gap-fill entries in a category file may omit categories (they used to
        // inherit them from the seed record). Backfill from the filename so a new
        // place is never left uncategorized.
        const cats = e.categories;
        if (
          inferred &&
          e.remove !== true &&
          (!Array.isArray(cats) || cats.length === 0)
        ) {
          e.categories = [inferred];
        }
        out.push(e);
      }
    } catch (e) {
      console.warn(`Skipping update ${f}: ${(e as Error).message}`);
    }
  }
  return out;
}

/**
 * Apply second-pass updates onto the merged set. Updates are matched by id or
 * normalized name; provided (non-null) fields overwrite existing ones. A supplied
 * address that differs clears stale coordinates so the place is re-geocoded.
 */
function applyUpdates(merged: AnyPlace[], updates: AnyPlace[]): AnyPlace[] {
  const byId = new Map<string, AnyPlace>();
  const byName = new Map<string, AnyPlace>();
  for (const p of merged) {
    if (p.id) byId.set(p.id, p);
    byName.set(normName(p.name), p);
  }
  let applied = 0;
  const removeIds = new Set<string>();
  const CONTROL = new Set(['id', 'name', 'remove', 'replaceCategories']);
  for (const u of updates) {
    const target = (u.id && byId.get(u.id)) || byName.get(normName(u.name));

    if (u.remove === true) {
      if (target?.id) removeIds.add(target.id);
      continue;
    }

    if (!target) {
      merged.push(u);
      if (u.id) byId.set(u.id, u);
      byName.set(normName(u.name), u);
      continue;
    }
    applied++;
    for (const [k, v] of Object.entries(u)) {
      if (CONTROL.has(k)) continue;
      if (v == null) continue;
      if (k === 'categories' && Array.isArray(v)) {
        target.categories = u.replaceCategories
          ? [...v]
          : Array.from(new Set([...(target.categories ?? []), ...v]));
        continue;
      }
      if (k === 'address' && typeof v === 'string' && v.trim() !== (target.address ?? '').trim()) {
        // address changed -> drop stale coords unless the update also supplies coords
        if (u.lat == null || u.lng == null) {
          delete target.lat;
          delete target.lng;
        }
      }
      (target as Record<string, unknown>)[k] = v;
    }
  }
  const result = merged.filter((p) => !(p.id && removeIds.has(p.id)));
  console.log(`Applied ${applied} updates, removed ${removeIds.size} (of ${updates.length}).`);
  return result;
}

type Cache = Record<string, { lat: number; lng: number } | null>;

function loadCache(): Cache {
  if (existsSync(CACHE)) return readJson<Cache>(CACHE);
  return {};
}

async function geocode(address: string, cache: Cache): Promise<{ lat: number; lng: number } | null> {
  const key = address.trim();
  if (key in cache) return cache[key];
  const url =
    'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=' +
    encodeURIComponent(key);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'KeukAI/1.0 (vacation SPA)' } });
    if (res.ok) {
      const arr = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (arr[0]) {
        const hit = { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) };
        cache[key] = hit;
        return hit;
      }
    }
  } catch (e) {
    console.warn(`geocode failed for "${key}": ${(e as Error).message}`);
  }
  cache[key] = null;
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Extract a coarse "City, NY" query from a messy address for fallback geocoding. */
function cityFallback(address: string): string | null {
  // Match "..., <City>, NY[ 12345]" or "<City>, NY"
  const m = address.match(/([A-Za-z .'-]+),\s*(NY|New York)\b/i);
  if (m) return `${m[1].trim()}, NY`;
  return null;
}

async function geocodeBest(
  address: string,
  cache: Cache,
): Promise<{ lat: number; lng: number } | null> {
  const primary = await geocode(address, cache);
  if (primary) return primary;
  const fb = cityFallback(address);
  if (fb && fb !== address.trim()) {
    await sleep(1100);
    return geocode(fb, cache);
  }
  return null;
}

async function main() {
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  const cache = loadCache();

  const merged = applyUpdates(mergeById(loadEnriched()), loadUpdates());
  normalizeCategories(merged);
  console.log(`Merged ${merged.length} places. Geocoding…`);

  let done = 0;
  let hits = 0;
  for (const p of merged) {
    if (p.lat != null && p.lng != null) {
      hits++;
    } else if (p.address) {
      const known = p.address in cache;
      const geo = await geocodeBest(p.address, cache);
      if (geo) {
        p.lat = geo.lat;
        p.lng = geo.lng;
        hits++;
      } else {
        (p as AnyPlace).needsReview = true;
      }
      writeFileSync(CACHE, JSON.stringify(cache, null, 2));
      if (!known) await sleep(1100); // respect Nominatim usage policy
    } else {
      (p as AnyPlace).needsReview = true;
    }
    done++;
    if (done % 20 === 0) console.log(`  …${done}/${merged.length}`);
  }

  merged.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(OUT, JSON.stringify(merged, null, 2));
  console.log(`Wrote ${merged.length} places (${hits} geocoded) -> ${OUT}`);
}

main();
