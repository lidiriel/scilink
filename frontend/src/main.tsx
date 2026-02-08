import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'reactflow/dist/style.css'
import './css/index.css'
import App from './App.tsx'
import "./i18n.tsx";  //Initialize i18next before the app renders

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <React.Suspense fallback="loading">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.Suspense>
  </StrictMode>
);