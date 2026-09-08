import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Periodically check for updates
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available.');
            }
          });
        }
      });
    }).catch((err) => {
      console.warn('[PWA] Service Worker registration failed:', err);
    });
  });
}

