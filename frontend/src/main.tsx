import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './styles/dark-mode.css';
import App from './App.tsx';
import { inicializarTemaGlobal } from './utils/preferencias.storage';

// Aplicamos el tema guardado antes del primer render para evitar parpadeos
inicializarTemaGlobal();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
