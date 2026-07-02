import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

/**
 * vite-plugin-cesium injects an eager <script src=".../Cesium.js"> (+ widgets CSS)
 * into index.html, loading the ~6 MB library on every page load. We instead load
 * Cesium on demand (see src/lib/loadCesium.ts) when the 3D globe is opened, so in
 * production we strip those eager tags. We keep the plugin for copying the /cesium
 * assets. In dev we leave the tags in place so the globe still works there.
 */
function stripEagerCesium(): PluginOption {
  return {
    name: 'strip-eager-cesium',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html
        .replace(/<script\b[^>]*\bsrc="[^"]*Cesium\.js"[^>]*><\/script>\s*/g, '')
        .replace(/<link\b[^>]*\bhref="[^"]*Widgets\/widgets\.css"[^>]*>\s*/g, '');
    },
  };
}

export default defineConfig({
  plugins: [react(), cesium(), stripEagerCesium()],
});
