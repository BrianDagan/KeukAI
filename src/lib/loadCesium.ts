/**
 * Lazily loads the CesiumJS library (~6 MB) only when the 3D globe is opened.
 *
 * The library is streamed with `fetch` so we can report real download progress,
 * then executed via a Blob URL (a single download — no double fetch). The result
 * is cached so the globe opens instantly on subsequent toggles.
 */

const BASE = import.meta.env.BASE_URL; // '/' on the custom domain
const CESIUM_JS = `${BASE}cesium/Cesium.js`;
const CESIUM_CSS = `${BASE}cesium/Widgets/widgets.css`;
// Approximate uncompressed size, used as the progress denominator when the
// server reports a compressed Content-Length (e.g. gzip on GitHub Pages).
const CESIUM_APPROX_BYTES = 5_900_000;

type CesiumGlobal = typeof import('cesium');

interface CesiumWindow extends Window {
  Cesium?: CesiumGlobal;
  CESIUM_BASE_URL?: string;
}

let cached: Promise<CesiumGlobal> | null = null;

export function loadCesium(onProgress?: (fraction: number) => void): Promise<CesiumGlobal> {
  const w = window as CesiumWindow;
  if (w.Cesium) {
    onProgress?.(1);
    return Promise.resolve(w.Cesium);
  }
  if (cached) return cached;

  const run = (async (): Promise<CesiumGlobal> => {
    w.CESIUM_BASE_URL = `${BASE}cesium/`;

    // Widget stylesheet is tiny — load it in parallel, don't block on it.
    if (!document.querySelector('link[data-cesium-widgets]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CESIUM_CSS;
      link.setAttribute('data-cesium-widgets', '');
      document.head.appendChild(link);
    }

    const res = await fetch(CESIUM_JS);
    if (!res.ok || !res.body) throw new Error(`Download failed (HTTP ${res.status})`);

    const cl = Number(res.headers.get('content-length') || 0);
    // Trust Content-Length only if it looks uncompressed; otherwise estimate.
    const total = cl > 4_000_000 ? cl : CESIUM_APPROX_BYTES;

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        onProgress?.(Math.min(0.99, received / total));
      }
    }

    const url = URL.createObjectURL(new Blob(chunks as BlobPart[], { type: 'text/javascript' }));
    try {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Cesium failed to initialize'));
        document.head.appendChild(script);
      });
    } finally {
      URL.revokeObjectURL(url);
    }

    if (!w.Cesium) throw new Error('Cesium global missing after load');
    onProgress?.(1);
    return w.Cesium;
  })();

  cached = run;
  // Allow a retry if the download/exec fails.
  run.catch(() => {
    if (cached === run) cached = null;
  });
  return run;
}
