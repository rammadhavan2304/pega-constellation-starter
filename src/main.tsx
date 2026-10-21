import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { BrandProvider } from './branding/BrandProvider';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrandProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </BrandProvider>
  </React.StrictMode>
);
