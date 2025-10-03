// src/scripts/views/home.js (KODE SAMA SEPERTI SEBELUMNYA)
import { fetchStories } from '../services/api.js';
import { initMap, addMarker, clearMarkers, openMarkerForId, fitMarkers } from '../services/map.js';
import { createStoryCard } from '../components/story-card.js';
import { saveStoryToIndexedDB, isStorySaved } from '../services/indexeddb.js';

export default function Home() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>Story List</h1>
    <div id="map" style="height:420px; margin-bottom:16px" role="region" aria-label="Peta lokasi cerita"></div>
    <div id="story-list" class="story-list" aria-live="polite"></div>
  `;

  const listEl = container.querySelector('#story-list');
  listEl.innerHTML = `<p>Loading stories...</p>`;

  let storiesData = [];

  setTimeout(() => {
    const map = initMap('map', { center: [-6.2, 106.8], zoom: 5 });

    fetchStories().then(async (stories) => {
      if (!stories || stories.length === 0) {
        listEl.innerHTML = `<p>No stories available.</p>`;
        return;
      }

      storiesData = stories;
      clearMarkers();
      listEl.innerHTML = '';

      for (const s of stories) {
        const id = s.id || s._id || s.key || Math.random().toString(36).slice(2, 9);
        const lat = s.lat ?? s.latitude ?? (s.location && s.location.lat) ?? null;
        const lon = s.lon ?? s.longitude ?? (s.location && s.location.lon) ?? null;
        const title = s.title || s.name || 'Story';
        const desc = s.description || s.desc || '';

        const card = createStoryCard(Object.assign({}, s, { id }));
        listEl.appendChild(card);

        // Update tombol Save jika sudah tersimpan
        const saveBtn = card.querySelector('.btn-save-story');
        if (saveBtn) {
          const saved = await isStorySaved(id);
          if (saved) {
            saveBtn.textContent = '✅ Saved';
            saveBtn.disabled = true;
            saveBtn.style.background = '#4caf50';
          }
        }

        if (lat && lon) {
          const popupHtml = `<strong>${title}</strong><br>${desc}`;
          const marker = addMarker({ id, lat, lon, popupHtml });
          marker.on('click', () => {
            document.querySelectorAll('.story-card.active').forEach((c) => c.classList.remove('active'));
            const target = listEl.querySelector(`[data-story-id="${id}"]`);
            if (target) {
              target.classList.add('active');
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          });
        }
      }

      try { fitMarkers(); } catch (e) { /* ignore */ }
    }).catch((err) => {
      listEl.innerHTML = `<p>Error loading stories: ${err.message}</p>`;
    });
  }, 0);

  // Handler untuk tombol "Show on map"
  listEl.addEventListener('click', (ev) => {
    const btnMap = ev.target.closest('.btn-show-map');
    if (btnMap) {
      const id = btnMap.getAttribute('data-story-id');
      openMarkerForId(id);
      document.querySelectorAll('.story-card.active').forEach((c) => c.classList.remove('active'));
      const target = listEl.querySelector(`[data-story-id="${id}"]`);
      if (target) target.classList.add('active');
      return;
    }

    // Handler untuk tombol "Save"
    const btnSave = ev.target.closest('.btn-save-story');
    if (btnSave) {
      const storyId = btnSave.getAttribute('data-story-id');
      const story = storiesData.find(s => s.id === storyId);

      if (!story) {
        alert('Story not found');
        return;
      }

      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      saveStoryToIndexedDB(story)
        .then(() => {
          btnSave.textContent = '✅ Saved';
          btnSave.style.background = '#4caf50';
          // Kita tidak perlu memanggil alert karena Ikon Hati sudah melakukan CRUD
          // alert('Story saved successfully! You can view it in the "Saved" page.');
        })
        .catch((err) => {
          alert(`Failed to save: ${err.message}`);
          btnSave.disabled = false;
          btnSave.textContent = '💾 Save';
        });
    }
  });

  listEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      const article = ev.target.closest('.story-card');
      if (!article) return;
      const id = article.getAttribute('data-story-id');
      openMarkerForId(id);
      document.querySelectorAll('.story-card.active').forEach((c) => c.classList.remove('active'));
      article.classList.add('active');
    }
  });

  return container;
}