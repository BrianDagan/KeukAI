export type Category =
  | 'winery'
  | 'brewery-distillery'
  | 'restaurant'
  | 'cafe'
  | 'festival-event'
  | 'museum-historical'
  | 'marina-boat-rental'
  | 'shopping'
  | 'lodging-rental'
  | 'spa'
  | 'dog-friendly'
  | 'race-track'
  | 'hospital-urgent-care';

export type Weekday = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

/** 24h "HH:MM" local (America/New_York). */
export interface DayHours {
  open: string;
  close: string;
}

/**
 * Per-day hours. A day mapped to `null` means explicitly closed that day.
 * A missing day means hours unknown for that day (do not mark closed).
 */
export type WeeklyHours = Partial<Record<Weekday, DayHours | null>>;

export interface Reviews {
  rating?: number;
  count?: number;
  summary?: string;
}

export interface Place {
  id: string;
  name: string;
  categories: Category[];
  lake?: string | null;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  hours?: WeeklyHours;
  hoursNote?: string;
  description?: string;
  reviews?: Reviews;
  sourceUrl?: string;
  needsReview?: boolean;
}

export interface HomeBase {
  name: string;
  address: string;
  lat: number;
  lng: number;
  houseRules?: string[];
}
