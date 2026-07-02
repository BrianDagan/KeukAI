import type { Place } from './types';
import placesData from './places.json';

export const PLACES: Place[] = (placesData as Place[]).filter(
  (p) => p.lat != null && p.lng != null,
);

/** Places we couldn't place on the map (missing coords) — surfaced separately. */
export const UNMAPPED: Place[] = (placesData as Place[]).filter(
  (p) => p.lat == null || p.lng == null,
);
