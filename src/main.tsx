import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
if ('serviceWorker' in navigator && import.meta.env.PROD) addEventListener('load', async () => {
  const registration = await navigator.serviceWorker.register('./sw.js');
  const announce = () => dispatchEvent(new Event('aurora-update-available'));
  if (registration.waiting) announce();
  registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', () => { if (registration.installing?.state === 'installed' && navigator.serviceWorker.controller) announce(); }));
});
