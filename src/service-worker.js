/* eslint-disable no-restricted-globals */
 
// --- CACHE & DB CONFIG ---
const CACHE_NAME = 'story-app-cache-v4';
const DATA_CACHE_NAME = 'story-app-data-v4';
const DB_NAME = 'StoryAppDB';
const DB_VERSION = 1;
const STORE_NAME = 'offline-stories';
const API_BASE_URL = 'https://story-api.dicoding.dev/v1';
const STORY_API_URL = `${API_BASE_URL}/stories`;
 
// Perbaikan: Pastikan path ini sudah relatif atau sesuai dengan publicPath Webpack
// Jika menggunakan publicPath: './' di Webpack, path ini harus disesuaikan:
const urlsToCache = [
  './', 
  './index.html',
  './manifest.json',
  './bundle.js',
  './icons/icon1.png',
  './icons/icon2.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
];
 
// === INSTALL SERVICE WORKER ===
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('[SW] Cache installation failed:', err);
      })
  );
  self.skipWaiting();
});
 
// === ACTIVATE SERVICE WORKER ===
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name !== DATA_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});
 
// === FETCH HANDLER (OFFLINE MODE) ===
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
 
  const requestUrl = event.request.url;
 
  // Strategy: Network First, fallback to Cache untuk API Stories
  if (requestUrl.includes(STORY_API_URL)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(DATA_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving API from cache (OFFLINE)');
              return cachedResponse;
            }
            // Menggunakan path relatif untuk fallback offline
            return caches.match('./index.html');
          });
        })
    );
    return;
  }
 
  // Strategy: Cache First, fallback to Network untuk aset statis
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log('[SW] Serving from cache:', event.request.url);
        return cachedResponse;
      }
 
      return fetch(event.request)
        .then((response) => {
          if (response.status === 200 && event.request.url.startsWith('http')) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] Offline fallback to index.html');
          // Menggunakan path relatif untuk fallback offline
          return caches.match('./index.html');
        });
    })
  );
});
 
// === INDEXEDDB HELPER ===
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
 
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
 
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
 
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}
 
// === BACKGROUND SYNC HANDLER ===
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event triggered:', event.tag);
  
  if (event.tag === 'sync-offline-stories') {
    event.waitUntil(syncOfflineStories());
  }
});
 
async function syncOfflineStories() {
  console.log('[SW] Starting sync of offline stories...');
  
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allStories = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
 
    if (allStories.length === 0) {
      console.log('[SW] No offline stories to sync');
      return;
    }
 
    // Get token from client
    const token = await getTokenFromClient();
    if (!token) {
      console.error('[SW] No token available for sync');
      return;
    }
 
    for (const story of allStories) {
      try {
        await uploadStoryToAPI(story, token);
        await deleteOfflineStory(story.id);
        console.log('[SW] Successfully synced story:', story.id);
      } catch (err) {
        console.error('[SW] Failed to sync story:', story.id, err);
      }
    }
 
    console.log('[SW] Sync completed');
  } catch (err) {
    console.error('[SW] Sync failed:', err);
  }
}
 
async function getTokenFromClient() {
  const allClients = await self.clients.matchAll();
  if (allClients.length === 0) return null;
 
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      resolve(event.data.token);
    };
    allClients[0].postMessage({ type: 'REQUEST_TOKEN' }, [messageChannel.port2]);
  });
}
 
async function uploadStoryToAPI(story, token) {
  // Convert base64 to blob
  const base64Data = story.photoBase64.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });
 
  const formData = new FormData();
  formData.append('description', story.description);
  formData.append('photo', blob, 'photo.jpg');
  if (story.lat) formData.append('lat', story.lat);
  if (story.lon) formData.append('lon', story.lon);
 
  const response = await fetch(STORY_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
 
  if (!response.ok) {
    throw new Error('Failed to upload story to API');
  }
 
  return response.json();
}
 
async function deleteOfflineStory(id) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
 
// === PUSH NOTIFICATION HANDLERS ===
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = {
    title: 'New Story',
    body: 'A new story has been added!',
    // FIX: Hapus icon dan badge yang menggunakan BASE_PATH yang tidak terdefinisi.
  };
 
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || notificationData.body,
        // FIX: Hapus icon dan badge di sini juga.
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }
 
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      // FIX: Hapus icon dan badge dari opsi notifikasi.
    })
  );
});
 
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  event.notification.close();
 
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        // FIX: Ganti BASE_PATH + '/' menjadi path relatif './'
        return self.clients.openWindow('./');
      })
  );
});