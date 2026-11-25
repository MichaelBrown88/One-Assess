/**
 * Runtime caching for the coach service worker.
 *
 * Hashed `/assets/*.js` files are already immutable at the HTTP layer. Routing
 * them through Workbox NetworkFirst left the first dynamic import with an empty
 * cache and a network fetch that never settles when the worker is also holding
 * Firestore listen channels. Those channels must not be intercepted either:
 * NetworkOnly still runs them inside the worker.
 *
 * vite-plugin-pwa forces `clientsClaim` when `registerType` is `autoUpdate`,
 * so the worker does take control of the open page. That is safe only while
 * this list does not answer script or Firebase requests.
 */

const SAME_ORIGIN_IMAGE = /\.(?:png|jpg|jpeg|svg|gif|webp)$/;

export interface CoachRuntimeCacheRule {
  urlPattern: RegExp | ((input: { url: URL }) => boolean);
  handler: 'CacheFirst';
  options: {
    cacheName: string;
    expiration: { maxEntries: number; maxAgeSeconds: number };
  };
}

export const COACH_RUNTIME_CACHING: CoachRuntimeCacheRule[] = [
  {
    // Same-origin images only. A bare extension test also matches Storage URLs
    // (posture.jpg on storage.googleapis.com), which must stay out of the worker.
    urlPattern: ({ url }) =>
      SAME_ORIGIN_IMAGE.test(url.pathname) && !url.hostname.endsWith('googleapis.com'),
    handler: 'CacheFirst',
    options: {
      cacheName: 'images',
      expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
    },
  },
];
