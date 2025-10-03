// src/scripts/views/favorite.js
import { getAllOfflineStories, deleteOfflineStory } from '../services/indexeddb.js';
import { createStoryCard } from '../components/story-card.js';

export default function Favorite() {
  const container = document.createElement('div');
  container.innerHTML = `
    <h1>Favorite Stories (Saved Offline)</h1>
    <p>Stories yang tersimpan di perangkat Anda untuk sinkronisasi nanti</p>
    <button id="refresh-favorites" class="btn-refresh">Refresh</button>
    <div id="favorite-list" class="story-list" aria-live="polite"></div>
  `;

  const listEl = container.querySelector('#favorite-list');
  const refreshBtn = container.querySelector('#refresh-favorites');

  // Function untuk load dan tampilkan favorites
  const loadFavorites = async () => {
    listEl.innerHTML = '<p>Loading saved stories...</p>';

    try {
      const stories = await getAllOfflineStories();

      if (!stories || stories.length === 0) {
        listEl.innerHTML = '<p>No saved stories. Add a story offline or save online story to see it here!</p>';
        return;
      }

      listEl.innerHTML = '';

      for (const story of stories) {
        // Objek story harus disiapkan agar kompatibel dengan createStoryCard
        const storyForCard = {
          id: story.id,
          name: story.name || 'Offline Story',
          description: story.description,
          photoUrl: story.photoBase64 || story.photoUrl, // Ambil Base64 atau URL
          createdAt: story.createdAt,
          lat: story.lat,
          lon: story.lon,
        };

        const card = createStoryCard(storyForCard);

        // Tambahkan badge untuk story yang belum disinkronisasi (jika sync=false)
        if (story.sync === false) {
           const badge = document.createElement('span');
           badge.textContent = '☁️ UN-SYNCED';
           badge.style.cssText = `
             position: absolute;
             top: 10px;
             left: 10px;
             background: #ff9800;
             color: white;
             padding: 4px 8px;
             border-radius: 4px;
             font-size: 12px;
             z-index: 10;
           `;
           card.style.position = 'relative'; // Pastikan card memiliki positioning
           card.appendChild(badge);
        }

        listEl.appendChild(card);
      }
    } catch (err) {
      listEl.innerHTML = `<p>Error loading saved stories: ${err.message}</p>`;
    }
  };

  // Tangkap event saat story dihapus (dari like button di story-card.js)
  listEl.addEventListener('story-unfavorited', (e) => {
    // Hapus card dari DOM tanpa me-load ulang semua
    const cardToRemove = e.target.closest('.story-card');
    if(cardToRemove) cardToRemove.remove();
    
    // Cek jika list kosong
    if (listEl.children.length === 0) {
      listEl.innerHTML = '<p>No saved stories. Add a story offline or save online story to see it here!</p>';
    }
  });

  // Event listener untuk refresh button
  refreshBtn.addEventListener('click', loadFavorites);

  // Load favorites saat halaman pertama kali dimuat
  setTimeout(loadFavorites, 0);

  return container;
}