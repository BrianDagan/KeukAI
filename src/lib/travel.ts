import type { Place } from '../data/types';
import { HOME_BASE } from '../data/homeBase';

export interface DriveEstimate {
  minutes: number;
  km: number;
  /** true = real routed driving time; false = straight-line approximation. */
  routed: boolean;
  trafficAware: boolean;
}

const EARTH_KM = 6371;

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_KM * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/** Rough rural-road ETA used as an always-available fallback. */
function straightLineEstimate(place: Place): DriveEstimate | null {
  if (place.lat == null || place.lng == null) return null;
  const km = haversineKm(HOME_BASE.lat, HOME_BASE.lng, place.lat, place.lng);
  // road distance ~1.3x crow-flies; ~65 km/h effective on Finger Lakes roads.
  const roadKm = km * 1.3;
  const minutes = Math.round((roadKm / 65) * 60);
  return { minutes: Math.max(minutes, 1), km: roadKm, routed: false, trafficAware: false };
}

const cache = new Map<string, DriveEstimate>();

/**
 * Estimate driving time from Willow Landing to a place.
 * Tries the public OSRM demo server for a real routed duration; if that fails
 * (offline, rate-limited), falls back to a straight-line estimate. Traffic-aware
 * routing can be layered in later behind an env-var API key without changing callers.
 */
export async function driveTimeFromHome(place: Place): Promise<DriveEstimate | null> {
  if (place.lat == null || place.lng == null) return null;
  const key = place.id;
  const cached = cache.get(key);
  if (cached) return cached;

  const fallback = straightLineEstimate(place);

  try {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${HOME_BASE.lng},${HOME_BASE.lat};${place.lng},${place.lat}` +
      `?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const json = (await res.json()) as {
        routes?: { duration: number; distance: number }[];
      };
      const route = json.routes?.[0];
      if (route) {
        const est: DriveEstimate = {
          minutes: Math.max(Math.round(route.duration / 60), 1),
          km: route.distance / 1000,
          routed: true,
          trafficAware: false,
        };
        cache.set(key, est);
        return est;
      }
    }
  } catch {
    // network/offline — use fallback below
  }

  if (fallback) cache.set(key, fallback);
  return fallback;
}

export function formatDrive(est: DriveEstimate | null): string {
  if (!est) return '—';
  const label = est.minutes >= 60
    ? `${Math.floor(est.minutes / 60)}h ${est.minutes % 60}m`
    : `${est.minutes} min`;
  return est.routed ? label : `~${label}`;
}
