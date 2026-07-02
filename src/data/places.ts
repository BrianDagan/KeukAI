import type { Place } from './types';
import placesData from './places.json';

/** Normalize categories to an array so one malformed record can't crash the app. */
const normalized = (placesData as Place[]).map((p) => ({
  ...p,
  categories: Array.isArray(p.categories) ? p.categories : [],
}));

export const PLACES: Place[] = normalized.filter((p) => p.lat != null && p.lng != null);

/** Places we couldn't place on the map (missing coords) — surfaced separately. */
export const UNMAPPED: Place[] = normalized.filter((p) => p.lat == null || p.lng == null);
