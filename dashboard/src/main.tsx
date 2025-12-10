import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Error handler for unhandled promise rejections (like localization errors)
window.addEventListener('unhandledrejection', (event) => {
  // Suppress RegisterClientLocalizationsError as it's likely from a browser extension
  if (event.reason?.name === 'RegisterClientLocalizationsError') {
    event.preventDefault();
    return;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

