import { useMemo, useState } from 'react';
import type { Place } from '../data/types';
import { placeEmoji } from '../data/categoryMeta';
import { openStateNow } from '../lib/hours';
import { formatDrive, type DriveEstimate } from '../lib/travel';

interface Props {
  places: Place[];
  driveTimes: Record<string, DriveEstimate | null>;
  onSelect: (p: Place) => void;
}

export default function TravelFlyout({ places, driveTimes, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  const ranked = useMemo(() => {
    return [...places]
      .map((p) => ({ p, est: driveTimes[p.id] ?? null }))
      .sort((a, b) => {
        const am = a.est?.minutes ?? Infinity;
        const bm = b.est?.minutes ?? Infinity;
        return am - bm;
      });
  }, [places, driveTimes]);

  return (
    <div className="absolute right-3 top-3 z-[1000] flex flex-col items-end">
      <button
        onClick={() => setOpen((o) => !o)}
        title="Sort visible places by drive time from Willow Landing"
        className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-md ring-1 ring-black/5 transition hover:bg-gray-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        🚗 <span className="hidden sm:inline">By drive time</span>
        <span className="text-xs text-gray-400 dark:text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 max-h-[70vh] w-72 overflow-y-auto rounded-lg bg-white shadow-xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
          <div className="sticky top-0 border-b border-gray-100 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
            Nearest first · {ranked.length} shown
          </div>
          <ol className="divide-y divide-gray-100 dark:divide-slate-700">
            {ranked.map(({ p, est }, i) => {
              const closed = openStateNow(p.hours) === 'closed';
              return (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      onSelect(p);
                      setOpen(false);
                    }}
                    className={
                      'flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-700 ' +
                      (closed ? 'opacity-60' : '')
                    }
                  >
                    <span className="w-5 text-right text-xs text-gray-400 dark:text-slate-500">
                      {i + 1}
                    </span>
                    <span className="text-base">{placeEmoji(p.categories)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-slate-100">
                      {p.name}
                    </span>
                    <span className="whitespace-nowrap text-xs font-medium text-keuka-water dark:text-sky-400">
                      {formatDrive(est)}
                    </span>
                  </button>
                </li>
              );
            })}
            {ranked.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-gray-400 dark:text-slate-500">
                No places match your filters.
              </li>
            )}
          </ol>
        </div>
      )}
    </div>
  );
}
