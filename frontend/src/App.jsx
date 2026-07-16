import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ToolkitPage from './pages/ToolkitPage';
import DashboardPage from './pages/DashboardPage';
import PreprocessPage from "./pages/PreprocessPage";
import AIAnalysisPage from './pages/AIAnalysisPage';
import UploadPage from './pages/UploadPage';
import WorkspacePage from './pages/WorkspacePage';
import ConverterPage from './pages/ConverterPage';
import GoogleAnalyticsCallback from './pages/GoogleAnalyticsCallback';

// Simple temporary 404 page fallback 
function NotFound() {
  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn't exist.</p>
      <a href="/home" style={{ color: '#2563EB', textDecoration: 'none' }}>Go back home</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="/home" element={<ToolkitPage />} />

      <Route path="/dashboard/*" element={<DashboardPage />} />

      <Route
        path="/google/callback"
        element={<GoogleAnalyticsCallback />}
      />
      <Route path="/ai-analysis" element={<AIAnalysisPage />} />
      <Route path="/chat" element={<AIAnalysisPage />} />
      <Route path="/converter" element={<ConverterPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/workspace" element={<WorkspacePage />} />
      <Route
        path="/preprocess"
        element={<PreprocessPage />}
      />

      {/* CHANGED THIS LINE: Avoid direct redirect loops on local reload */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}