// src/scripts/services/indexeddb.js

const DB_NAME = 'StoryAppDB';
const DB_VERSION = 2; 
const STORE_NAME = 'offline-stories';

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      return resolve(db);
    }
    // Perubahan di sini akan memicu onupgradeneeded
    const request = indexedDB.open(DB_NAME, DB_VERSION); 
    
    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        // Ini memastikan Object Store 'offline-stories' dibuat
        database.createObjectStore(STORE_NAME, { keyPath: 'id' }); 
      }
    };
    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = (event) => {
      reject(new Error(`IndexedDB error: ${event.target.errorCode}`));
    };
  });
}

async function addOfflineStory(storyData) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const storyWithId = { ...storyData, id: tempId, sync: false };
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(storyWithId);
    request.onsuccess = () => {
      resolve(storyWithId);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Fungsi baru: Save story dari API ke IndexedDB
async function saveStoryToIndexedDB(story) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    // Gunakan ID asli dari API
    const storyToSave = {
      id: story.id,
      description: story.description,
      photoUrl: story.photoUrl,
      name: story.name,
      lat: story.lat,
      lon: story.lon,
      createdAt: story.createdAt,
      savedAt: new Date().toISOString(),
      sync: true // Sudah tersimpan di server
    };
    
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(storyToSave); // put = add or update
    
    request.onsuccess = () => {
      resolve(storyToSave);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Fungsi baru: Cek apakah story sudah disimpan
async function isStorySaved(storyId) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(storyId);
    
    request.onsuccess = () => {
      resolve(!!request.result); // true jika ada, false jika tidak
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function getAllOfflineStories() {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function deleteOfflineStory(id) {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => {
      resolve(true);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export { 
  openDB, 
  addOfflineStory, 
  saveStoryToIndexedDB, 
  isStorySaved, 
  getAllOfflineStories, 
  deleteOfflineStory 
};