// src/scripts/routes/router.js
import routes from './routes.js';

function router() {
  const main = document.getElementById('main-content');
  const rawHash = window.location.hash || '#/home';
  const hash = rawHash.slice(1).toLowerCase() || '/home';
  const token = localStorage.getItem('token');
  
  // halaman yang butuh login
  const protectedRoutes = ['/home', '/add', '/about', '/favorite'];
  
  if (protectedRoutes.includes(hash) && !token) {
    window.location.hash = '#/login';
    return;
  }
  
  // Page is a function that returns a DOM element
  const Page = routes[hash] || routes['/home'];
  
  const render = () => {
    if (!main) return;
    main.innerHTML = '';
    const pageEl = Page();
    main.appendChild(pageEl);
  };
  
  // Gunakan View Transition API jika tersedia
  if (typeof document !== 'undefined' && typeof document.startViewTransition === 'function') {
    document.startViewTransition(render);
  } else {
    render();
  }
}

export default router;