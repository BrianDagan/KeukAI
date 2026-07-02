import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

/**
 * vite-plugin-cesium injects a render-blocking <script src=".../Cesium.js">.
 * Cesium (~6 MB) is only needed for the 3D globe, so defer it — the 2D app then
 * paints immediately instead of waiting on the whole library to download.
 */
function deferCesiumScript(): PluginOption {
  return {
    name: 'defer-cesium-script',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<script(\s+src="[^"]*Cesium\.js")><\/script>/,
        '<script defer$1></script>',
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), cesium(), deferCesiumScript()],
});
