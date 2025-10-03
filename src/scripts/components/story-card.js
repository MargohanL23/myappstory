// src/scripts/components/story-card.js
import { 
  saveStoryToIndexedDB, 
  isStorySaved, 
  deleteOfflineStory as deleteFavoriteStory
} from '../services/indexeddb.js';

// Buat wrapper object FavoriteStoryDb
const FavoriteStoryDb = {
  getStory: async (id) => isStorySaved(id), 
  putStory: saveStoryToIndexedDB,
  deleteStory: deleteFavoriteStory,
};

// SVG Icons
const likeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6" style="width: 24px; height: 24px; color: red;"><path d="M11.645 20.91l-.007-.003-.02-.012c-.326-.188-1.025-.54-1.752-.946C8.42 19.155 7.25 18.42 6.36 17.614 5.394 16.7 4.5 15.6 4.5 14.187c0-2.203 1.583-3.8 3.5-4.498 1.487-.52 2.594-.537 3.013-.01.373.456.486 1.09.486 1.637 0 .546.113 1.18.486 1.637.42.527 1.526.509 3.013-.01 1.917-.698 3.5-2.295 3.5-4.498 0-1.413-.895-2.523-1.86-3.43C16.75 5.58 15.58 4.845 14.852 4.44c-.727-.406-1.426-.758-1.752-.946l-.02-.012-.007-.003-.002-.001a40.723 40.723 0 01-1.286-.717 40.723 40.723 0 01-1.286-.717z" /></svg>`;
const unlikeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-6 h-6" style="width: 24px; height: 24px; color: grey;"><path d="M11.645 20.91l-.007-.003-.02-.012c-.326-.188-1.025-.54-1.752-.946C8.42 19.155 7.25 18.42 6.36 17.614 5.394 16.7 4.5 15.6 4.5 14.187c0-2.203 1.583-3.8 3.5-4.498 1.487-.52 2.594-.537 3.013-.01.373.456.486 1.09.486 1.637 0 .546.113 1.18.486 1.637.42.527 1.526.509 3.013-.01 1.917-.698 3.5-2.295 3.5-4.498 0-1.413-.895-2.523-1.86-3.43C16.75 5.58 15.58 4.845 14.852 4.44c-.727-.406-1.426-.758-1.752-.946l-.02-.012-.007-.003-.002-.001a40.723 40.723 0 01-1.286-.717 40.723 40.723 0 01-1.286-.717z" /></svg>`;

export const createStoryCard = (story) => {
  const card = document.createElement('article');
  card.className = 'story-card';
  const storyId = story.id || story._id || story.key || `s-${Math.random().toString(36).slice(2,9)}`; 
  card.setAttribute('data-story-id', storyId);
  card.setAttribute('tabindex', '0');
  
  const imageUrl = story.photoBase64 || story.photo || story.photoUrl || story.pictureUrl;
  
  card.innerHTML = `
    <img src="${imageUrl}" alt="Story by ${story.name}" class="story-image" loading="lazy">
    <div class="story-content">
      <h3 class="story-title">${story.name || 'Anonymous User'}</h3>
      <p class="story-description">${story.description.substring(0, 100)}...</p>
      <p class="story-date">${new Date(story.createdAt).toLocaleDateString()}</p>
      
      <div class="story-actions">
        <button class="btn-show-map" data-story-id="${storyId}" aria-label="Show story on map">
          Show on Map
        </button>
        <button 
          type="button" 
          class="btn-save-story" 
          data-story-id="${storyId}" 
          aria-label="Save ${story.name} for offline"
        >
          💾 Save
        </button>
        <button 
          id="likeButton-${storyId}" 
          class="like-button" 
          aria-label="Add to favorites"
          style="background: none; border: none; cursor: pointer; padding: 0 8px; margin-left: auto;"
        >
          ${unlikeIcon}
        </button>
      </div>
    </div>
  `;

  // Like Button Logic
  const likeButton = card.querySelector(`#likeButton-${storyId}`);
  let isLiked = false;

  const updateLikeButton = (liked) => {
    isLiked = liked;
    likeButton.innerHTML = liked ? likeIcon : unlikeIcon;
    likeButton.setAttribute('aria-label', liked ? 'Remove from favorites' : 'Add to favorites');
    // Hapus setting warna di sini karena sudah ada di SVG
  };

  // Cek status saat kartu dimuat
  FavoriteStoryDb.getStory(storyId).then(isSaved => {
    updateLikeButton(!!isSaved);
  });
  
  likeButton.addEventListener('click', async () => {
    if (isLiked) {
      // Hapus dari IndexedDB
      await FavoriteStoryDb.deleteStory(storyId);
      updateLikeButton(false);
      // Panggil event agar halaman Favorite me-refresh/update
      if (window.location.hash === '#/favorite') {
         card.dispatchEvent(new CustomEvent('story-unfavorited', { bubbles: true }));
      }
      alert('Story removed from favorites!');
    } else {
      // Simpan ke IndexedDB
      await FavoriteStoryDb.putStory(story);
      updateLikeButton(true);
      alert('Story saved for offline viewing!');
    }
  });

  return card;
};