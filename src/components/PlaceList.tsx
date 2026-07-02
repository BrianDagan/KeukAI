import type { Place } from '../data/types';
import { placeEmoji } from '../data/categoryMeta';
import { openStateNow } from '../lib/hours';
import { formatDrive, type DriveEstimate } from '../lib/travel';

function OpenBadge({ place }: { place: Place }) {
  const state = openStateNow(place.hours);
  if (state === 'open')
    return <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/50 dark:text-green-300">Open</span>;
  if (state === 'closed')
    return <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">Closed</span>;
  return <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-slate-700 dark:text-slate-300">Unknown</span>;
}

interface Props {
  places: Place[];
  selectedId: string | null;
  onSelect: (p: Place) => void;
  driveTimes: Record<string, DriveEstimate | null>;
}

export default function PlaceList({ places, selectedId, onSelect, driveTimes }: Props) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-slate-700">
      {places.map((p) => {
        const closed = openStateNow(p.hours) === 'closed';
        return (
          <li key={p.id}>
            <button
              onClick={() => onSelect(p)}
              className={
                'flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-slate-800 ' +
                (selectedId === p.id ? 'bg-keuka-water/10 dark:bg-sky-500/10' : '') +
                (closed ? ' opacity-60' : '')
              }
            >
              <span className="mt-0.5 text-lg">{placeEmoji(p.categories)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-gray-800 dark:text-slate-100">{p.name}</span>
                  <OpenBadge place={p} />
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
                  <span>🚗 {formatDrive(driveTimes[p.id])}</span>
                  {p.lake && <span>· {p.lake} Lake</span>}
                  {p.needsReview && <span title="Details unverified">· ⚠️</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
      {places.length === 0 && (
        <li className="px-3 py-6 text-center text-sm text-gray-400 dark:text-slate-500">No places match your filters.</li>
      )}
    </ul>
  );
}
