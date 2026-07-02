import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Place } from '../data/types';
import { HOME_BASE } from '../data/homeBase';
import { HOME_BASE_EMOJI, placeEmoji } from '../data/categoryMeta';
import { openStateNow } from '../lib/hours';
import { formatDrive, type DriveEstimate } from '../lib/travel';
import { wazeUrl } from '../lib/nav';

const KEUKA_CENTER: [number, number] = [42.55, -77.1];

function emojiIcon(emoji: string, closed: boolean, home = false): L.DivIcon {
  const cls = 'keukai-marker' + (home ? ' keukai-marker--home' : '');
  const badge = closed ? '<span class="keukai-closed-badge">✕</span>' : '';
  return L.divIcon({
    className: '',
    html: `<div class="${cls}">${emoji}${badge}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -12],
  });
}

function FlyTo({ place }: { place: Place | null }) {
  const map = useMap();
  useEffect(() => {
    if (place?.lat != null && place?.lng != null) {
      // Keep the user's current zoom — just pan to the selected place.
      map.flyTo([place.lat, place.lng], map.getZoom(), { duration: 0.6 });
    }
  }, [place, map]);
  return null;
}

function FlyHome({ signal }: { signal: number }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    map.flyTo([HOME_BASE.lat, HOME_BASE.lng], map.getZoom(), { duration: 0.7 });
  }, [signal, map]);
  return null;
}

/** Redraw Leaflet after viewport/orientation changes so tiles fill the new size. */
function ResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [map]);
  return null;
}

interface Props {
  places: Place[];
  selected: Place | null;
  onSelect: (p: Place) => void;
  driveTimes: Record<string, DriveEstimate | null>;
  homeSignal: number;
}

export default function MapView({ places, selected, onSelect, driveTimes, homeSignal }: Props) {
  const homeIcon = useMemo(() => emojiIcon(HOME_BASE_EMOJI, false, true), []);

  return (
    <MapContainer center={KEUKA_CENTER} zoom={11} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={[HOME_BASE.lat, HOME_BASE.lng]} icon={homeIcon}>
        <Popup>
          <strong>{HOME_BASE_EMOJI} {HOME_BASE.name}</strong>
          <br />
          Our home base
          <br />
          <span className="text-xs text-gray-500">{HOME_BASE.address}</span>
        </Popup>
      </Marker>

      {places.map((p) => {
        const state = openStateNow(p.hours);
        const closed = state === 'closed';
        const est = driveTimes[p.id];
        return (
          <Marker
            key={p.id}
            position={[p.lat!, p.lng!]}
            icon={emojiIcon(placeEmoji(p.categories), closed)}
            eventHandlers={{ click: () => onSelect(p) }}
          >
            <Popup>
              <strong>{placeEmoji(p.categories)} {p.name}</strong>
              <br />
              <span
                className={
                  state === 'open'
                    ? 'text-green-600'
                    : state === 'closed'
                      ? 'text-red-600'
                      : 'text-gray-400'
                }
              >
                {state === 'open' ? 'Open now' : state === 'closed' ? 'Closed now' : 'Hours unknown'}
              </span>
              {' · '}🚗 {formatDrive(est)} from home
              <br />
              <a href={wazeUrl(p)} target="_blank" rel="noreferrer" className="text-[#0a9bd6]">
                🧭 Navigate with Waze
              </a>
            </Popup>
          </Marker>
        );
      })}

      <FlyTo place={selected} />
      <FlyHome signal={homeSignal} />
      <ResizeHandler />
    </MapContainer>
  );
}
