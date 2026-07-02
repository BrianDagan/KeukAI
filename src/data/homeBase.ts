import type { HomeBase } from './types';

/**
 * Willow Landing — our home base for the vacation.
 * Coordinates geocoded from the street address via OpenStreetMap/Nominatim.
 * Origin for all drive-time estimates.
 */
export const HOME_BASE: HomeBase = {
  name: 'Willow Landing',
  address: '6207 E Bluff Dr, Penn Yan, NY 14527',
  lat: 42.583744,
  lng: -77.096652,
  houseRules: [
    'Respect the serenity of lakefront living — keep noise down, especially at night.',
    'No smoking inside the house.',
    'Clean up after pets; leash dogs near neighboring properties.',
    'Follow all posted dock, boat, and water-safety rules.',
    'In an emergency, call 911 first — see the Emergency layer for nearby hospitals & urgent care.',
  ],
};
