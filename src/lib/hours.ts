import type { Place, Weekday, WeeklyHours } from '../data/types';

const TZ = 'America/New_York';
const DAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface NowInZone {
  weekday: Weekday;
  minutes: number; // minutes since midnight
}

/** Current wall-clock time in the Finger Lakes (America/New_York). */
export function nowInFingerLakes(date = new Date()): NowInZone {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const wdShort = get('weekday').toLowerCase().slice(0, 3) as Weekday;
  let hour = parseInt(get('hour'), 10);
  if (hour === 24) hour = 0; // some environments emit 24 for midnight
  const minute = parseInt(get('minute'), 10);
  return { weekday: wdShort, minutes: hour * 60 + minute };
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

export type OpenState = 'open' | 'closed' | 'unknown';

/**
 * Determine whether a place is open right now.
 * - 'unknown' when hours (for today) are not known — never dim these.
 * - Handles overnight ranges (close < open) and previous-day spillover.
 */
export function openStateNow(hours: WeeklyHours | undefined, now = nowInFingerLakes()): OpenState {
  if (!hours) return 'unknown';

  const todayIdx = DAYS.indexOf(now.weekday);
  const today = hours[now.weekday];

  // Explicitly closed today.
  if (today === null) {
    // still might be within an overnight range from yesterday
    if (isOpenFromPrevDay(hours, todayIdx, now.minutes)) return 'open';
    return 'closed';
  }

  if (today === undefined) {
    // Today's hours unknown, but an overnight range from a known prior day could apply.
    if (isOpenFromPrevDay(hours, todayIdx, now.minutes)) return 'open';
    return 'unknown';
  }

  const open = hhmmToMinutes(today.open);
  const close = hhmmToMinutes(today.close);

  if (close > open) {
    if (now.minutes >= open && now.minutes < close) return 'open';
  } else {
    // overnight (e.g. 17:00 -> 02:00): open if after open time today
    if (now.minutes >= open) return 'open';
  }

  if (isOpenFromPrevDay(hours, todayIdx, now.minutes)) return 'open';
  return 'closed';
}

function isOpenFromPrevDay(hours: WeeklyHours, todayIdx: number, nowMinutes: number): boolean {
  const prev = hours[DAYS[(todayIdx + 6) % 7]];
  if (!prev) return false;
  const open = hhmmToMinutes(prev.open);
  const close = hhmmToMinutes(prev.close);
  if (close <= open) {
    // overnight range spilling into today
    return nowMinutes < close;
  }
  return false;
}

export function isEmergency(place: Place): boolean {
  return place.categories.includes('hospital-urgent-care');
}
