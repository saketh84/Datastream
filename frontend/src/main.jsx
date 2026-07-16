import React from 'react';
import ReactDOM from 'react-dom/client';
// CHANGE THIS: Import HashRouter instead of BrowserRouter
import { HashRouter } from 'react-router-dom';
import App from './App';
import './App.css';
import './styles/UploadModal.css';
import { Toaster } from "react-hot-toast";
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* CHANGE THIS TOO */}
    <HashRouter>
      <App />
      <Toaster position="top-right" reverseOrder={false} />
    </HashRouter>
  </React.StrictMode>
);