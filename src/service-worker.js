/* eslint-disable no-restricted-globals */

// --- CACHE & DB CONFIG ---
const CACHE_NAME = 'story-app-cache-v2'; 
const DATA_CACHE_NAME = 'story-app-data-v2'; 
const DB_NAME = 'StoryAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline-stories';
const API_BASE_URL = 'https://story-api.dicoding.dev/v1'; 
const STORY_API_URL = `${API_BASE_URL}/stories`;

// **PERBAIKAN KRITIS: Base path harus sesuai nama repository baru**
const BASE_PATH = '/myappstory'; 

const urlsToCache = [
  BASE_PATH + '/', 
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json', 
  
  // Aset Dasar (KRITIS: Nama File JS dan menggunakan BASE_PATH)
  BASE_PATH + '/bundle.js',       
  BASE_PATH + '/styles.bundle.css', 
  
  // Path icons
  BASE_PATH + '/icons/icon-192.png',
  BASE_PATH + '/icons/icon-512.png',
  
  // Aset Leaflet (URL eksternal)
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache).catch((err) => console.log('Cache add failed:', err)))
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          }
          return null;
        }).filter(p => p !== null) 
      )
    )
  );
  self.clients.claim();
});

// Fetch Handler
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const requestUrl = event.request.url.replace(`${self.location.origin}${BASE_PATH}`, self.location.origin);

  // --- Strategy: Stale-While-Revalidate untuk Data API (/stories) ---
  if (requestUrl.includes(STORY_API_URL) && !requestUrl.includes('push-subscribe')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(requestUrl);
        
        const networkFetch = fetch(requestUrl)
          .then(async (response) => {
            if (response.status === 200 || response.type === 'opaque') {
              await cache.put(requestUrl, response.clone()); 
            }
            return response;
          })
          .catch((err) => {
            console.log('[SW] Network failed for API:', err);
            throw err; 
          });
        
        if (cachedResponse) {
             console.log('[SW] Serving from Data Cache');
             return cachedResponse;
        }
        
        // Fallback ke index.html di base path
        return networkFetch.catch(() => caches.match(BASE_PATH + '/index.html')); 
      })
    );
    return;
  }

  // --- Strategy: Cache Falling Back to Network (Aset Statis) ---
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200 && event.request.url.startsWith(self.location.origin)) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        // Fallback offline shell ke index.html di base path
        .catch(() => caches.match(BASE_PATH + '/index.html')); 
    })
  );
});

// --- OFFLINE SYNC HANDLERS (Stub) ---
// ... (Logika getOfflineStoriesSW, syncOfflineStories, dll. Dibiarkan kosong/stub di sini) ...
// --- PUSH NOTIFICATION HANDLERS (Stub) ---
// ... (Logika push dan notificationclick Dibiarkan kosong/stub di sini) ...