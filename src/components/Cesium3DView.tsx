import { useEffect, useRef, useState } from 'react';
import type { Place } from '../data/types';
import { HOME_BASE } from '../data/homeBase';
import { HOME_BASE_EMOJI, placeEmoji } from '../data/categoryMeta';
import { openStateNow } from '../lib/hours';
import { loadCesium } from '../lib/loadCesium';
import type * as Cesium from 'cesium';

const ESRI_IMAGERY =
  'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer';
const ESRI_TERRAIN =
  'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer';

const iconCache = new Map<string, string>();
function emojiImage(emoji: string, closed: boolean, big = false): string {
  const key = `${emoji}|${closed ? 'c' : 'o'}|${big ? 'b' : 's'}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const size = big ? 72 : 52;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${big ? 56 : 40}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  // Keep the icon full-color for contrast; mark "closed" with a red ✕ badge.
  ctx.fillText(emoji, size / 2, size / 2 + 1);
  if (closed) {
    const r = big ? 12 : 9;
    const bx = size - r - 1;
    const by = r + 1;
    ctx.shadowColor = 'transparent';
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(r * 1.5)}px sans-serif`;
    ctx.fillText('\u00d7', bx, by + 1);
  }
  const url = canvas.toDataURL();
  iconCache.set(key, url);
  return url;
}

function CesiumLoading({ progress }: { progress: number }) {
  const pct = Math.max(1, Math.round(progress * 100));
  return (
    <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-100">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
      <div className="text-lg font-semibold">🌎 Loading 3D globe</div>
      <div className="h-2 w-64 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full bg-sky-400 transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-slate-400">{pct}% · one-time ~6&nbsp;MB download</div>
    </div>
  );
}

function CesiumError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center gap-3 bg-slate-900 px-6 text-slate-100">
      <div className="text-lg font-semibold">🌎 Couldn't load the 3D globe</div>
      <div className="max-w-xs text-center text-xs text-slate-400">{message}</div>
      <button
        onClick={onRetry}
        className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-400"
      >
        Retry
      </button>
    </div>
  );
}

interface Props {
  places: Place[];
  selected: Place | null;
  onSelect: (p: Place) => void;
}

export default function Cesium3DView({ places, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const cesiumRef = useRef<typeof import('cesium') | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const placesRef = useRef(places);
  placesRef.current = places;

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Load Cesium on demand, then build the viewer.
  useEffect(() => {
    let disposed = false;
    let handler: Cesium.ScreenSpaceEventHandler | null = null;

    loadCesium(setProgress)
      .then((C) => {
        if (disposed || !containerRef.current) return;
        cesiumRef.current = C;
        C.Ion.defaultAccessToken = ''; // free, token-free Esri terrain + imagery

        const viewer = new C.Viewer(containerRef.current, {
          baseLayer: false as unknown as undefined,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          selectionIndicator: false,
        });
        viewerRef.current = viewer;
        viewer.scene.globe.depthTestAgainstTerrain = true;
        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

        C.ArcGisMapServerImageryProvider.fromUrl(ESRI_IMAGERY, { enablePickFeatures: false })
          .then((prov) => {
            if (!disposed) viewer.imageryLayers.addImageryProvider(prov);
          })
          .catch(() => {});
        C.ArcGISTiledElevationTerrainProvider.fromUrl(ESRI_TERRAIN)
          .then((tp) => {
            if (!disposed) viewer.terrainProvider = tp;
          })
          .catch(() => {});

        viewer.camera.setView({
          destination: C.Cartesian3.fromDegrees(-77.1, 42.35, 42000),
          orientation: { heading: 0, pitch: C.Math.toRadians(-42), roll: 0 },
        });

        handler = new C.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
          const picked = viewer.scene.pick(e.position);
          const id = picked?.id?.id as string | undefined;
          if (id) {
            const place = placesRef.current.find((p) => p.id === id);
            if (place) onSelectRef.current(place);
          }
        }, C.ScreenSpaceEventType.LEFT_CLICK);

        setReady(true);
      })
      .catch((err: unknown) => {
        if (!disposed) setError(err instanceof Error ? err.message : 'Failed to load 3D globe');
      });

    return () => {
      disposed = true;
      handler?.destroy();
      viewerRef.current?.destroy();
      viewerRef.current = null;
      cesiumRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // Rebuild markers whenever the filtered set changes.
  useEffect(() => {
    const C = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!C || !viewer) return;
    viewer.entities.removeAll();

    viewer.entities.add({
      id: '__home__',
      position: C.Cartesian3.fromDegrees(HOME_BASE.lng, HOME_BASE.lat),
      billboard: {
        image: emojiImage(HOME_BASE_EMOJI, false, true),
        verticalOrigin: C.VerticalOrigin.BOTTOM,
        heightReference: C.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new C.NearFarScalar(5e3, 1.0, 5e5, 0.45),
      },
    });

    for (const p of places) {
      if (p.lat == null || p.lng == null) continue;
      const closed = openStateNow(p.hours) === 'closed';
      viewer.entities.add({
        id: p.id,
        position: C.Cartesian3.fromDegrees(p.lng, p.lat),
        billboard: {
          image: emojiImage(placeEmoji(p.categories), closed),
          verticalOrigin: C.VerticalOrigin.BOTTOM,
          heightReference: C.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new C.NearFarScalar(5e3, 1.0, 5e5, 0.4),
        },
      });
    }
  }, [places, ready]);

  // Recenter on the selected place without changing the current zoom (camera height).
  useEffect(() => {
    const C = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!C || !viewer || !selected || selected.lat == null || selected.lng == null) return;
    const height = viewer.camera.positionCartographic.height;
    const latOffset = 0.03 * (height / 6000); // keep the tilted framing proportional to zoom
    viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(selected.lng, selected.lat - latOffset, height),
      orientation: { heading: 0, pitch: C.Math.toRadians(-40), roll: 0 },
      duration: 1.0,
    });
  }, [selected, ready]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {!ready && !error && <CesiumLoading progress={progress} />}
      {error && (
        <CesiumError
          message={error}
          onRetry={() => {
            setError(null);
            setProgress(0);
            setAttempt((a) => a + 1);
          }}
        />
      )}
    </div>
  );
}
