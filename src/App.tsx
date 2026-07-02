import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { Category } from './data/types';
import { PLACES } from './data/places';
import { ALL_CATEGORIES } from './data/categoryMeta';
import { HOME_BASE } from './data/homeBase';
import { nowInFingerLakes, openStateNow } from './lib/hours';
import { useDriveTimes } from './lib/useDriveTimes';
import { useTheme } from './lib/useTheme';
import MapView from './components/MapView';
import FilterBar from './components/FilterBar';
import PlaceList from './components/PlaceList';
import PlaceDetail from './components/PlaceDetail';
import TravelFlyout from './components/TravelFlyout';

const Cesium3DView = lazy(() => import('./components/Cesium3DView'));

function useFingerLakesClock(): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () =>
      setLabel(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          weekday: 'short',
          hour: 'numeric',
          minute: '2-digit',
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);
  return label;
}

export default function App() {
  const [active, setActive] = useState<Set<Category>>(new Set(ALL_CATEGORIES));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [view3d, setView3d] = useState(false);
  // Re-render every minute so open/closed state stays current.
  const [minute, setMinute] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setMinute((m) => m + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const clock = useFingerLakesClock();
  const now = nowInFingerLakes();
  const [theme, toggleTheme] = useTheme();

  const counts = useMemo(() => {
    const c = Object.fromEntries(ALL_CATEGORIES.map((k) => [k, 0])) as Record<Category, number>;
    for (const p of PLACES) for (const cat of p.categories) if (cat in c) c[cat]++;
    return c;
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLACES.filter((p) => {
      const inFilter = p.categories.some((c) => active.has(c));
      if (!inFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.address?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [active, query]);

  const driveTimes = useDriveTimes(visible);

  const openCounts = useMemo(() => {
    let open = 0, closed = 0, unknown = 0;
    for (const p of visible) {
      const s = openStateNow(p.hours);
      if (s === 'open') open++;
      else if (s === 'closed') closed++;
      else unknown++;
    }
    return { open, closed, unknown };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, minute]);
  const selected = useMemo(
    () => visible.find((p) => p.id === selectedId) ?? PLACES.find((p) => p.id === selectedId) ?? null,
    [selectedId, visible],
  );

  const toggle = (c: Category) => {
    setActive((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100">
      <header className="flex items-center justify-between gap-3 bg-keuka-deep px-4 py-2 text-white dark:bg-slate-950">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-bold">
            ⭐ KeukAI
          </h1>
          <span className="hidden text-xs text-white/70 sm:inline">
            Keuka Lake vacation guide · home base: {HOME_BASE.name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-green-500/20 px-2 py-0.5 font-medium text-green-100">
              🟢 {openCounts.open} open
            </span>
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 font-medium text-red-100">
              🔴 {openCounts.closed} closed
            </span>
            {openCounts.unknown > 0 && (
              <span className="hidden rounded-full bg-white/10 px-2 py-0.5 font-medium text-white/70 md:inline">
                {openCounts.unknown} hrs&nbsp;?
              </span>
            )}
          </div>
          <div className="hidden text-xs text-white/80 sm:block">🕑 {clock}</div>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="rounded-full bg-white/10 px-2 py-1 text-sm transition hover:bg-white/20"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-full max-w-sm flex-col border-r border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          {selected ? (
            <PlaceDetail
              place={selected}
              drive={driveTimes[selected.id] ?? null}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <>
              <FilterBar
                active={active}
                counts={counts}
                onToggle={toggle}
                onAll={() => setActive(new Set(ALL_CATEGORIES))}
                onNone={() => setActive(new Set())}
              />
              <div className="p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search places…"
                  className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm focus:border-keuka-water focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>
              <div className="px-3 pb-1 text-xs text-gray-400 dark:text-slate-500">
                {visible.length} shown · {now.weekday}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <PlaceList
                  places={visible}
                  selectedId={selectedId}
                  onSelect={(p) => setSelectedId(p.id)}
                  driveTimes={driveTimes}
                />
              </div>
            </>
          )}
        </aside>

        <main className="relative min-h-0 flex-1">
          <TravelFlyout places={visible} driveTimes={driveTimes} onSelect={(p) => setSelectedId(p.id)} />

          <div className="absolute bottom-6 left-3 z-[1000] flex overflow-hidden rounded-full bg-white shadow-md ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10">
            <button
              onClick={() => setView3d(false)}
              className={
                'px-3 py-1.5 text-sm font-medium transition ' +
                (!view3d
                  ? 'bg-keuka-water text-white'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700')
              }
            >
              🗺️ 2D
            </button>
            <button
              onClick={() => setView3d(true)}
              className={
                'px-3 py-1.5 text-sm font-medium transition ' +
                (view3d
                  ? 'bg-keuka-water text-white'
                  : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700')
              }
            >
              🌎 3D
            </button>
          </div>

          {view3d ? (
            <Suspense
              fallback={
                <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-900 text-slate-100">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
                  <div className="text-sm text-slate-300">🌎 Loading 3D globe…</div>
                </div>
              }
            >
              <Cesium3DView
                places={visible}
                selected={selected}
                onSelect={(p) => setSelectedId(p.id)}
              />
            </Suspense>
          ) : (
            <MapView
              places={visible}
              selected={selected}
              onSelect={(p) => setSelectedId(p.id)}
              driveTimes={driveTimes}
            />
          )}
        </main>
      </div>
    </div>
  );
}
