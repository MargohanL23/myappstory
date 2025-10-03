// src/scripts/views/add-story.js
import { addStory } from '../services/api.js';
import { initMap, onMapClick, addMarker, clearMarkers } from '../services/map.js';
import { addOfflineStory } from '../services/indexeddb.js';

export default function AddStory() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>Add New Story</h1>
    <form id="story-form" class="story-form">
      <label>
        Description:
        <textarea name="description" required></textarea>
      </label>

      <label>
        Photo:
        <input type="file" name="photo" accept="image/*" required />
      </label>

      <label>
        Latitude:
        <input type="number" step="any" name="lat" readonly placeholder="Click map to select location" />
      </label>

      <label>
        Longitude:
        <input type="number" step="any" name="lon" readonly placeholder="Click map to select location" />
      </label>

      <div 
        id="map" 
        style="height:400px; margin:16px 0; border:1px solid #ccc; border-radius:8px;" 
        role="region" 
        aria-label="Pilih lokasi di peta"
      ></div>

      <button type="submit">Submit Story</button>
      <p id="form-msg" class="form-msg"></p>
    </form>
  `;

  // === HELPER: Ubah File menjadi Base64 ===
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file.'));
      if (file) reader.readAsDataURL(file);
      else reject(new Error('No file provided.'));
    });
  };

  // === INIT MAP & HANDLERS ===
  setTimeout(() => {
    const map = initMap('map', { center: [-2.5, 118], zoom: 5 });
    const latInput = container.querySelector('input[name="lat"]');
    const lonInput = container.querySelector('input[name="lon"]');

    if (map) {
      onMapClick((latlng) => {
        latInput.value = latlng.lat.toFixed(6);
        lonInput.value = latlng.lng.toFixed(6);

        clearMarkers();
        addMarker({
          lat: latlng.lat,
          lon: latlng.lng,
          popupHtml: `Lokasi dipilih:<br>${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`
        });
      });
    }

    // === HANDLE FORM SUBMIT ===
    const form = container.querySelector('#story-form');
    const msgEl = container.querySelector('#form-msg');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      submitBtn.disabled = true;
      msgEl.textContent = 'Submitting...';
      msgEl.style.color = 'black';

      const description = container.querySelector('textarea[name="description"]').value;
      const photoFile = container.querySelector('input[name="photo"]').files[0];
      const lat = container.querySelector('input[name="lat"]').value;
      const lon = container.querySelector('input[name="lon"]').value;

      const formData = new FormData();
      formData.append('description', description);
      formData.append('photo', photoFile);
      if (lat) formData.append('lat', lat);
      if (lon) formData.append('lon', lon);

      try {
        // Coba kirim langsung ke API (Online)
        await addStory(formData);
        msgEl.textContent = '✅ Story added successfully! Redirecting...';
        msgEl.style.color = 'green';
        
        form.reset();
        clearMarkers();
        latInput.value = '';
        lonInput.value = '';
        
        setTimeout(() => window.location.hash = '#/home', 1000);

      } catch (err) {
        // Jika gagal (Offline), simpan ke IndexedDB
        console.warn('Network submit failed, saving to IndexedDB:', err.message);

        try {
          const photoBase64 = await fileToBase64(photoFile);

          const storyData = {
            description: description,
            photoBase64: photoBase64,
            lat: lat ? parseFloat(lat) : null,
            lon: lon ? parseFloat(lon) : null,
            createdAt: new Date().toISOString(),
          };

          await addOfflineStory(storyData);

          // Request Background Sync
          if ('serviceWorker' in navigator && 'sync' in await navigator.serviceWorker.ready) {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync.register('sync-offline-stories');
            msgEl.textContent = '💾 Saved offline! Will sync when online. Check Favorite page.';
          } else {
            msgEl.textContent = '💾 Saved offline! Visit Favorite page to see saved stories.';
          }
          
          msgEl.style.color = 'orange';
          
          form.reset();
          clearMarkers();
          latInput.value = '';
          lonInput.value = '';
          
          setTimeout(() => window.location.hash = '#/favorite', 1500);

        } catch (dbErr) {
          msgEl.textContent = `❌ Failed to save: ${dbErr.message}`;
          msgEl.style.color = 'red';
          submitBtn.disabled = false;
        }
      }
    });
  }, 0);

  return container;
}