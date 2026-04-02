import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/telegram.css';
import './styles/app.css';
import { initTelegram } from './telegram/init';

initTelegram();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
