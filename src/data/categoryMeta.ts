import type { Category } from './types';

export interface CategoryMeta {
  label: string;
  emoji: string;
  color: string;
  /** Safety category — styled distinctly, but still user-toggleable. */
  safety?: boolean;
}

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  winery: { label: 'Wineries & Vineyards', emoji: '🍷', color: '#6b2d5c' },
  'brewery-distillery': { label: 'Breweries & Distilleries', emoji: '🍺', color: '#b8860b' },
  restaurant: { label: 'Restaurants', emoji: '🍽️', color: '#c0392b' },
  cafe: { label: 'Cafés & Coffee', emoji: '☕', color: '#7b4b28' },
  'festival-event': { label: 'Festivals & Events', emoji: '🎪', color: '#d35400' },
  'museum-historical': { label: 'Museums & History', emoji: '🏛️', color: '#5d6d7e' },
  'marina-boat-rental': { label: 'Marinas & Boat Rentals', emoji: '⛵', color: '#1f6f8b' },
  shopping: { label: 'Shopping & Boutiques', emoji: '🛍️', color: '#8e44ad' },
  'lodging-rental': { label: 'Lodging & Rentals', emoji: '🏡', color: '#2c3e50' },
  spa: { label: 'Spas & Wellness', emoji: '💆', color: '#c94c8c' },
  'dog-friendly': { label: 'Dog-Friendly', emoji: '🐾', color: '#3f7d20' },
  'race-track': { label: 'Racing & Motorsports', emoji: '🏁', color: '#111827' },
  'hospital-urgent-care': {
    label: 'Emergency & Urgent Care',
    emoji: '🚑',
    color: '#e11d48',
    safety: true,
  },
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as Category[];

export const HOME_BASE_EMOJI = '⭐';

/** Primary emoji for a place, based on its first category. */
export function placeEmoji(categories: Category[]): string {
  const first = categories[0];
  return first ? CATEGORY_META[first].emoji : '📍';
}
