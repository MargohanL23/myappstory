// src/scripts/app.js
import '../styles/main.css';
import 'leaflet/dist/leaflet.css'; 
import router from './routes/router.js';
import Navbar from './components/navbar.js';   
import { createFooter } from './components/footer.js';
import { enableSkipToContent } from './utils/accessibility.js';

function renderLayout() {
  const root = document.getElementById('app') || document.body;

  root.innerHTML = `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <header id="site-header"></header>
    <main id="main-content" tabindex="-1" role="main" aria-live="polite"></main>
    <footer id="site-footer"></footer>
  `;
  const header = document.getElementById('site-header');
  header.appendChild(Navbar());   

  const footer = document.getElementById('site-footer');
  footer.appendChild(createFooter());
}

function init() {
  renderLayout();
  enableSkipToContent();

  window.addEventListener('hashchange', () => {
    router();
    const main = document.getElementById('main-content');
    if (main) main.focus();
  });

  window.addEventListener('load', () => {
    router();
  });
}

document.addEventListener('DOMContentLoaded', init);

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // ✨ PERBAIKAN KRITIS: Menggunakan path GitHub Pages yang benar.
    // Repo name adalah: /myappstory
    navigator.serviceWorker.register('/myappstory/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// Tambahkan Listener untuk Komunikasi SW (Untuk Sync Token)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    // Menanggapi permintaan token dari Service Worker
    if (event.data && event.data.type === 'REQUEST_TOKEN') { 
      const token = localStorage.getItem('token');
      // Mengirim kembali token ke SW
      event.source.postMessage({ type: 'TOKEN_RESPONSE', token: token });
    }
  });
}