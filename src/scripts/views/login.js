import { login } from '../services/api.js';
import { initPushNotification } from '../app.js'; 

export default function Login() {
  const container = document.createElement('div');
  container.className = 'auth-page';

  container.innerHTML = `
    <h1>Login</h1>
    <form id="login-form" class="auth-form">
      <label>
        Email
        <input type="email" id="email" required />
      </label>
      <label>
        Password
        <input type="password" id="password" required />
      </label>
      <button type="submit">Login</button>
    </form>
    <p>Belum punya akun? <a href="#/register">Register</a></p>
    <div id="login-message" class="auth-message"></div>
  `;

  const form = container.querySelector('#login-form');
  const messageEl = container.querySelector('#login-message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = 'Processing...';

    const email = container.querySelector('#email').value;
    const password = container.querySelector('#password').value;

    try {
      const res = await fetch('https://story-api.dicoding.dev/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.loginResult.token);
      localStorage.setItem('name', data.loginResult.name);

      messageEl.textContent = 'Login successful! Redirecting...';
      
      // Setelah login, coba inisialisasi status push.
      // initPushNotification(true); // Panggil ini jika di-export

      setTimeout(() => {
        window.location.hash = '#/home';
      }, 1000);
    } catch (err) {
      messageEl.textContent = err.message;
    }
  });

  return container;
}
