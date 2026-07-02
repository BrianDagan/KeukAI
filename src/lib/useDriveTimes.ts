import { useEffect, useState } from 'react';
import type { Place } from '../data/types';
import { driveTimeFromHome, type DriveEstimate } from './travel';

/**
 * Loads drive-time estimates from Willow Landing for the given places.
 * Results are cached in the travel module, so re-renders don't re-fetch.
 */
export function useDriveTimes(places: Place[]): Record<string, DriveEstimate | null> {
  const [times, setTimes] = useState<Record<string, DriveEstimate | null>>({});

  useEffect(() => {
    let cancelled = false;
    const missing = places.filter((p) => !(p.id in times));
    if (missing.length === 0) return;

    (async () => {
      // Small concurrency to be gentle on the routing service.
      const batchSize = 4;
      for (let i = 0; i < missing.length; i += batchSize) {
        if (cancelled) return;
        const batch = missing.slice(i, i + batchSize);
        const results = await Promise.all(
          batch.map(async (p) => [p.id, await driveTimeFromHome(p)] as const),
        );
        if (cancelled) return;
        setTimes((prev) => {
          const next = { ...prev };
          for (const [id, est] of results) next[id] = est;
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places]);

  return times;
}
