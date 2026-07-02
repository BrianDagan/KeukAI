import type { Place, Weekday } from '../data/types';
import { CATEGORY_META, placeEmoji } from '../data/categoryMeta';
import { openStateNow } from '../lib/hours';
import { formatDrive, type DriveEstimate } from '../lib/travel';
import { wazeUrl, googleMapsUrl } from '../lib/nav';

const DAY_LABELS: Record<Weekday, string> = {
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat',
};
const DAY_ORDER: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

interface Props {
  place: Place;
  drive: DriveEstimate | null;
  onClose: () => void;
}

export default function PlaceDetail({ place, drive, onClose }: Props) {
  const state = openStateNow(place.hours);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between border-b border-gray-200 p-3 dark:border-slate-700">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-slate-100">
            <span>{placeEmoji(place.categories)}</span>
            {place.name}
          </h2>
          <div className="mt-1 flex flex-wrap gap-1">
            {place.categories.map((c) => (
              <span
                key={c}
                className="rounded-full px-2 py-0.5 text-[10px] text-white"
                style={{ backgroundColor: CATEGORY_META[c]?.color }}
              >
                {CATEGORY_META[c]?.label ?? c}
              </span>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        <div className="flex items-center gap-3">
          <span
            className={
              'rounded px-2 py-0.5 text-xs font-medium ' +
              (state === 'open'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                : state === 'closed'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                  : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-300')
            }
          >
            {state === 'open' ? 'Open now' : state === 'closed' ? 'Closed now' : 'Hours unknown'}
          </span>
          <span className="text-gray-600 dark:text-slate-300">🚗 {formatDrive(drive)} from Willow Landing</span>
        </div>

        <div className="flex gap-2">
          <a
            href={wazeUrl(place)}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#33ccff] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            🧭 Navigate with Waze
          </a>
          <a
            href={googleMapsUrl(place)}
            target="_blank"
            rel="noreferrer"
            title="Open in Google Maps"
            className="flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            🗺️
          </a>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-slate-500">
          Waze opens navigation on your phone with live traffic — send yourself there in one tap.
        </p>

        {place.description && <p className="text-gray-700 dark:text-slate-300">{place.description}</p>}

        {place.reviews?.rating != null && (
          <p className="text-gray-700 dark:text-slate-300">
            ⭐ {place.reviews.rating}
            {place.reviews.count != null && (
              <span className="text-gray-400 dark:text-slate-500"> ({place.reviews.count} reviews)</span>
            )}
          </p>
        )}

        <dl className="space-y-1 text-gray-700 dark:text-slate-300">
          {place.address && (
            <div className="flex gap-2">
              <dt>📍</dt>
              <dd>
                <a
                  className="text-keuka-water hover:underline"
                  href={googleMapsUrl(place)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {place.address}
                </a>
              </dd>
            </div>
          )}
          {place.phone && (
            <div className="flex gap-2">
              <dt>📞</dt>
              <dd>
                <a className="text-keuka-water hover:underline" href={`tel:${place.phone}`}>
                  {place.phone}
                </a>
              </dd>
            </div>
          )}
          {place.website && (
            <div className="flex gap-2">
              <dt>🌐</dt>
              <dd>
                <a
                  className="break-all text-keuka-water hover:underline"
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                >
                  {place.website.replace(/^https?:\/\//, '')}
                </a>
              </dd>
            </div>
          )}
        </dl>

        {place.hours && (
          <div>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Hours</h3>
            <table className="w-full text-xs text-gray-600 dark:text-slate-300">
              <tbody>
                {DAY_ORDER.filter((d) => d in place.hours!).map((d) => {
                  const h = place.hours![d];
                  if (h === undefined) return null;
                  return (
                    <tr key={d}>
                      <td className="py-0.5 pr-3 font-medium">{DAY_LABELS[d]}</td>
                      <td>{h === null ? 'Closed' : `${h.open}–${h.close}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {place.hoursNote && <p className="text-xs italic text-gray-500 dark:text-slate-400">{place.hoursNote}</p>}

        {place.needsReview && (
          <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            ⚠️ Some details are unverified — call ahead to confirm.
          </p>
        )}

        {place.sourceUrl && (
          <p className="text-[10px] text-gray-400 dark:text-slate-500">
            Source:{' '}
            <a href={place.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
              {place.sourceUrl.replace(/^https?:\/\//, '').slice(0, 40)}
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
