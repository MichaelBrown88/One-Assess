/// <reference types="vitest" />
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin, type ViteDevServer } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import os from "node:os";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { vitePwaCoachManifest } from "./src/constants/productBranding";
import { COACH_RUNTIME_CACHING } from "./src/pwa/runtimeCaching";

/**
 * VitePWA injects the coach `manifest.webmanifest` link into every HTML entry.
 * Patch `client.html` on disk after build so `/r/*` keeps only `manifest-client.webmanifest`.
 */
function stripCoachManifestFromClientHtml(): Plugin {
  let outDir = "dist";
  return {
    name: "strip-coach-manifest-from-client-html",
    apply: "build",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    closeBundle() {
      const clientPath = path.join(outDir, "client.html");
      if (!fs.existsSync(clientPath)) return;
      const html = fs.readFileSync(clientPath, "utf8");
      if (!html.includes("manifest-client.webmanifest")) return;
      const next = html.replace(/\s*<link rel="manifest" href="\/manifest\.webmanifest"[^>]*>\s*/gi, "\n");
      if (next !== html) fs.writeFileSync(clientPath, next);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    fs: {
      deny: ['.git/**', '**/.cursor/**', '**/one-assess-local-report-review.json', 'node_modules/**', 'firebase.json', 'stackhawk.yml']
    }
  },
  plugins: [
    mode === 'development' && {
      name: 'local-saved-report-review',
      apply: 'serve' as const,
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split('?')[0] !== '/__local_report/review') return next();
          const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '');
          const localHost = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(req.headers.host ?? '');
          const sameOrigin = !req.headers.origin || req.headers.origin === `http://${req.headers.host}`;
          const file = path.join(os.tmpdir(), 'one-assess-local-report-review.json');
          res.setHeader('Cache-Control', 'no-store');
          if (!loopback || !localHost || !sameOrigin || req.method !== 'GET' || !fs.existsSync(file)) {
            res.statusCode = 404;
            return res.end();
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(fs.readFileSync(file, 'utf8'));
        });
      },
    },
    mode === "development" && {
      name: "debug-roadmap-ndjson",
      enforce: "pre" as const,
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = req.url?.split("?")[0] ?? "";
          if (url !== "/__debug_ndjson" || req.method !== "POST") {
            next();
            return;
          }
          const chunks: Buffer[] = [];
          req.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });
          req.on("end", () => {
            try {
              const body = Buffer.concat(chunks).toString("utf8").trim();
              if (body) {
                const logPath = path.resolve(__dirname, ".cursor/debug-523b0c.log");
                fs.mkdirSync(path.dirname(logPath), { recursive: true });
                fs.appendFileSync(logPath, `${body}\n`, "utf8");
              }
            } catch (err) {
              console.error("[debug-roadmap-ndjson] append failed:", err);
            }
            res.statusCode = 204;
            res.end();
          });
        });
      },
    },
    // Serve client.html (client PWA manifest/icons) for /r/* routes in dev
    {
      name: 'client-html-fallback',
      configureServer(server: { middlewares: { use: (fn: (req: { url?: string }, res: unknown, next: () => void) => void) => void } }) {
        server.middlewares.use((req: { url?: string }, _res: unknown, next: () => void) => {
          // Match /r, /r/, /r/anything — all client PWA routes
          if (req.url && /^\/r($|\/|\?)/.test(req.url)) {
            req.url = '/client.html';
          }
          next();
        });
      },
    },
    tailwindcss(),
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'og-image.png', 'sitemap.xml'],
      manifest: vitePwaCoachManifest(),
      workbox: {
        // Immediately activate new service workers to prevent stale chunk references
        // (old SW serving old index.html that references non-existent JS filenames)
        // autoUpdate also forces clientsClaim. Script and Firebase requests are
        // not in runtimeCaching, so claiming the page cannot stall those fetches.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Only precache the shell (CSS, HTML, fonts). Hashed JS stays on the
        // browser HTTP cache so a cold dynamic import is not fetched inside the worker.
        globPatterns: ['**/*.{css,html,woff2}'],
        globIgnores: ['**/heic2any-*', '**/heic-to-*', '**/generateCategoricalChart-*', '**/pose-*'],
        maximumFileSizeToCacheInBytes: 300_000, // 300 KB safety cap
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/companion\//, /^\/r($|\/)/],
        // Scripts and Firebase/Google traffic are intentionally absent. See runtimeCaching.ts.
        runtimeCaching: COACH_RUNTIME_CACHING,
      },
    }),
    stripCoachManifestFromClientHtml(),
  ].filter(Boolean),
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-webcam',
      'qrcode.react',
      '@radix-ui/react-progress',
      '@radix-ui/react-visually-hidden',
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared/billing": path.resolve(__dirname, "./functions/src/shared/billing"),
      "@shared/metadataInts": path.resolve(__dirname, "./functions/src/metadataInts.ts"),
      "@shared/reportingFx": path.resolve(__dirname, "./functions/src/shared/reportingFx.ts"),
      "@shared/ownerConsole": path.resolve(__dirname, "./functions/src/shared/ownerConsole.ts"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    passWithNoTests: false,
    // functions/lib is compiled CJS output — its .test.js copies can't import vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'functions/lib/**'],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        client: path.resolve(__dirname, 'client.html'),
      },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/ai'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', 'lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  }
}));
