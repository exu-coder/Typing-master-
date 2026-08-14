import { App } from './core/App';
import './styles/main.css';

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

// Boot the application
const app = new App();
app.init().then(() => {
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(() => {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 400);
    }, 600);
  }
}).catch((err) => {
  console.error('Failed to start Typing Master:', err);
  const splash = document.getElementById('splash');
  if (splash) {
    splash.innerHTML = `
      <h1 style="color:#f8fafc;font-family:system-ui">Typing Master</h1>
      <p style="color:#f87171;font-family:system-ui">Failed to load. Please refresh.</p>
    `;
  }
});
