// src/scripts/components/navbar.js
import { subscribePush, unsubscribePush, getSubscription } from '../utils/push-notification';

export default function Navbar() {
  const container = document.createElement('nav');
  container.className = 'navbar';
  const token = localStorage.getItem('token');
  const name = localStorage.getItem('name');
  
  // elemen utama di sisi kiri
  const leftItems = `
    <div class="nav-links">
      <a href="#/home">Home</a>
      <a href="#/add">Add Story</a>
      <a href="#/favorite">Favorite</a>
      <a href="#/about">About</a>
    </div>
  `;
  
  // elemen aksi dan notifikasi di sisi kanan dalam satu container
  let rightItems = '';
  if (token) {
    rightItems = `
      <div class="navbar-right-actions">
        <span class="navbar-user">Hi, ${name || 'User'}</span> 
        <a href="#" id="logout-link">Logout</a>
        <button id="btn-push-toggle" aria-label="Toggle Push Notification" disabled>Loading...</button>
      </div>
    `;
  } else {
    rightItems = `
      <div class="navbar-right-actions">
        <a href="#/login">Login</a> 
        <a href="#/register">Register</a>
        <button id="btn-push-toggle" aria-label="Toggle Push Notification" disabled style="display:none;">Loading...</button>
      </div>
    `;
  }
  
  // Gabungkan semua
  container.innerHTML = leftItems + rightItems;
  
  // --- Logika Event Listener ---
  if (token) {
    const logoutLink = container.querySelector('#logout-link');
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('name');
      // Setelah logout, kita harus refresh atau redirect ke login
      window.location.hash = '#/login'; 
      // Atau paksa refresh jika service worker perlu direset (tidak wajib, tapi aman)
      // window.location.reload(); 
    });
  }

  const pushBtn = container.querySelector('#btn-push-toggle');
  
  // Function untuk update UI button
  const updatePushButton = async () => {
    if (!pushBtn || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      if (pushBtn) pushBtn.style.display = 'none';
      return;
    }

    // Hanya tampilkan button jika user sudah login
    if (!token) {
      pushBtn.style.display = 'none';
      return;
    }

    pushBtn.style.display = 'inline-block';
    pushBtn.disabled = true; // Set disabled selama pengecekan

    try {
      const subscription = await getSubscription();
      pushBtn.disabled = false; // Aktifkan setelah berhasil cek
      
      if (subscription) {
        pushBtn.textContent = '🔔 Disable Notification';
        pushBtn.classList.add('active'); 
      } else {
        pushBtn.textContent = '🔕 Enable Notification';
        pushBtn.classList.remove('active');
      }
    } catch(e) {
      console.error('Error checking subscription status:', e);
      // Ganti text error agar lebih jelas jika gagal inisialisasi
      pushBtn.textContent = '❌ Push Notif Not Ready'; 
      pushBtn.disabled = true; // Biarkan disabled jika ada error serius
    }
  };
  
  // Terapkan logika toggle saat diklik
  if (pushBtn) {
    pushBtn.addEventListener('click', async () => {
      pushBtn.disabled = true;
      pushBtn.textContent = 'Processing...';
      
      try {
        const isSubscribed = await getSubscription();
        
        if (isSubscribed) {
          await unsubscribePush();
          alert('✅ Push notification disabled successfully!');
        } else {
          try {
            await subscribePush();
            alert('✅ Push notification enabled successfully!');
          } catch (subscribeError) {
             // Tangkap error token atau permission secara spesifik
             if (subscribeError.message.includes('No login token found')) {
                 alert('⚠️ Failed: Please make sure you are logged in and your token is valid.');
             } else if (subscribeError.message.includes('permission denied')) {
                 alert('⚠️ Failed: Notification permission was denied by the browser.');
             } else {
                 throw subscribeError; // Lempar error lain
             }
          }
        }
        
        await updatePushButton();
      } catch (e) {
        alert(`❌ Failed: ${e.message}`); 
        console.error('Push operation failed:', e);
        await updatePushButton();
      }
    });
    
    // Panggil update saat navbar di-render
    updatePushButton();
  }

  return container;
}