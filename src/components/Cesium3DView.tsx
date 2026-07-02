import { useEffect, useRef } from 'react';
import {
  Viewer,
  Ion,
  ArcGisMapServerImageryProvider,
  ArcGISTiledElevationTerrainProvider,
  Cartesian3,
  Math as CesiumMath,
  VerticalOrigin,
  HeightReference,
  NearFarScalar,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import type { Place } from '../data/types';
import { HOME_BASE } from '../data/homeBase';
import { HOME_BASE_EMOJI, placeEmoji } from '../data/categoryMeta';
import { openStateNow } from '../lib/hours';

// We use only free, token-free Esri terrain + imagery — no Cesium ion account needed.
Ion.defaultAccessToken = '';

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

interface Props {
  places: Place[];
  selected: Place | null;
  onSelect: (p: Place) => void;
}

export default function Cesium3DView({ places, selected, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the viewer once.
  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const viewer = new Viewer(containerRef.current, {
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

    // Satellite imagery + real terrain (both free/token-free).
    ArcGisMapServerImageryProvider.fromUrl(ESRI_IMAGERY, { enablePickFeatures: false })
      .then((prov) => {
        if (!disposed) viewer.imageryLayers.addImageryProvider(prov);
      })
      .catch(() => {});
    ArcGISTiledElevationTerrainProvider.fromUrl(ESRI_TERRAIN)
      .then((tp) => {
        if (!disposed) viewer.terrainProvider = tp;
      })
      .catch(() => {});

    // Angled "Google Earth" view centered on Keuka Lake.
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(-77.1, 42.35, 42000),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-42), roll: 0 },
    });

    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((e: ScreenSpaceEventHandler.PositionedEvent) => {
      const picked = viewer.scene.pick(e.position);
      const id = picked?.id?.id as string | undefined;
      if (id) {
        const place = places.find((p) => p.id === id);
        if (place) onSelectRef.current(place);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      disposed = true;
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild markers whenever the filtered set changes.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.entities.removeAll();

    viewer.entities.add({
      id: '__home__',
      position: Cartesian3.fromDegrees(HOME_BASE.lng, HOME_BASE.lat),
      billboard: {
        image: emojiImage(HOME_BASE_EMOJI, false, true),
        verticalOrigin: VerticalOrigin.BOTTOM,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new NearFarScalar(5e3, 1.0, 5e5, 0.45),
      },
    });

    for (const p of places) {
      if (p.lat == null || p.lng == null) continue;
      const closed = openStateNow(p.hours) === 'closed';
      viewer.entities.add({
        id: p.id,
        position: Cartesian3.fromDegrees(p.lng, p.lat),
        billboard: {
          image: emojiImage(placeEmoji(p.categories), closed),
          verticalOrigin: VerticalOrigin.BOTTOM,
          heightReference: HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new NearFarScalar(5e3, 1.0, 5e5, 0.4),
        },
      });
    }
  }, [places]);

  // Recenter on the selected place without changing the current zoom (camera height).
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !selected || selected.lat == null || selected.lng == null) return;
    const height = viewer.camera.positionCartographic.height;
    const latOffset = 0.03 * (height / 6000); // keep the tilted framing proportional to zoom
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(selected.lng, selected.lat - latOffset, height),
      orientation: { heading: 0, pitch: CesiumMath.toRadians(-40), roll: 0 },
      duration: 1.0,
    });
  }, [selected]);

  return <div ref={containerRef} className="h-full w-full" />;
}
