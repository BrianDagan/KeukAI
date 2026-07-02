import type { Place } from '../data/types';

/**
 * Waze universal deep link. On a phone this opens the Waze app and starts
 * turn-by-turn navigation with live traffic to the destination; on desktop it
 * opens waze.com. Prefers precise coordinates, falls back to the address.
 * No API key or account required.
 */
export function wazeUrl(place: Pick<Place, 'lat' | 'lng' | 'address' | 'name'>): string {
  if (place.lat != null && place.lng != null) {
    return `https://waze.com/ul?ll=${place.lat},${place.lng}&navigate=yes`;
  }
  const q = encodeURIComponent(place.address ?? place.name);
  return `https://waze.com/ul?q=${q}&navigate=yes`;
}

/** Google Maps directions from Willow Landing to the destination. */
export function googleMapsUrl(place: Pick<Place, 'lat' | 'lng' | 'address' | 'name'>): string {
  const dest =
    place.lat != null && place.lng != null
      ? `${place.lat},${place.lng}`
      : encodeURIComponent(place.address ?? place.name);
  return (
    'https://www.google.com/maps/dir/?api=1' +
    '&origin=' +
    encodeURIComponent('6207 E Bluff Dr, Penn Yan, NY 14527') +
    `&destination=${dest}`
  );
}
