import type { Category } from '../data/types';
import { ALL_CATEGORIES, CATEGORY_META } from '../data/categoryMeta';

interface Props {
  active: Set<Category>;
  counts: Record<Category, number>;
  onToggle: (c: Category) => void;
  onAll: () => void;
  onNone: () => void;
}

export default function FilterBar({ active, counts, onToggle, onAll, onNone }: Props) {
  return (
    <div className="border-b border-gray-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          Filter by activity
        </span>
        <div className="flex gap-2 text-xs">
          <button className="text-keuka-water hover:underline dark:text-sky-400" onClick={onAll}>
            All
          </button>
          <button className="text-gray-400 hover:underline dark:text-slate-500" onClick={onNone}>
            None
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          const on = active.has(c);
          return (
            <button
              key={c}
              onClick={() => onToggle(c)}
              title={meta.label}
              className={
                'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ' +
                (on
                  ? 'border-transparent text-white'
                  : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700')
              }
              style={on ? { backgroundColor: meta.color } : undefined}
            >
              <span>{meta.emoji}</span>
              <span>{meta.label}</span>
              <span className={on ? 'opacity-80' : 'text-gray-400 dark:text-slate-500'}>
                {counts[c] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
