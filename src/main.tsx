import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('My Paisa: #root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Remove the pre-hydration boot logo once React has painted.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot');
  if (boot) {
    boot.style.transition = 'opacity 260ms ease';
    boot.style.opacity = '0';
    setTimeout(() => boot.remove(), 300);
  }
});
