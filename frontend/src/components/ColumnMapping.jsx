import React, { useState, useEffect } from 'react';
import useDashboardStore from '../store';
import axios from 'axios';
import { Loader, ArrowRight } from 'lucide-react';

export default function ColumnMapping() {
  const { file, fileHeaders, setPipelineData, pipeline_kpiData } = useDashboardStore();
  
  const [distColumn, setDistColumn] = useState('');
  const [timeColumn, setTimeColumn] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (fileHeaders && fileHeaders.length > 0) {
      setDistColumn(fileHeaders.find(h => h.toLowerCase().includes('category')) || fileHeaders[0]);
      setTimeColumn(fileHeaders.find(h => h.toLowerCase().includes('date')) || fileHeaders[0]);
    }
  }, [fileHeaders]);

  const handleRunAnalysis = async () => {
    // FIX: Short circuit immediately if this is an API call route
    if (!file && pipeline_kpiData) {
      return;
    }

    if (!file) {
      setError("No source file found to run analysis on.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('col_dist_target', distColumn);
    formData.append('col_time_target', timeColumn);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/v1/analyze", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPipelineData(response.data);
    } catch (error) {
      console.error("Analysis Request Pipeline Failed:", error);
      if (error?.response?.status === 422 && Array.isArray(error?.response?.data?.detail)) {
        const errorString = error.response.data.detail.map(err => `${err.loc.join('.')} : ${err.msg}`).join(', ');
        setError(errorString);
      } else {
        setError(error?.response?.data?.detail || error?.message || "Analysis generation error.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // FIX: If we are dealing with an API call, render nothing here to prevent unwanted side-effects
  if (!file && pipeline_kpiData) {
    return null;
  }

  return (
    <div className="card text-center" style={{ maxWidth: '500px', margin: '60px auto', padding: '30px' }}>
      <h2>Target Variable Configuration</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.9rem' }}>
        Configure specific axis target keys for distributing metrics.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.875rem' }}>
          Column for Distribution Visuals:
          <select value={distColumn} onChange={(e) => setDistColumn(e.target.value)} style={{ padding: '10px', borderRadius: '8px' }}>
            {fileHeaders.map(header => <option key={header} value={header}>{header}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.875rem' }}>
          Column for Trend Charting / Timelines:
          <select value={timeColumn} onChange={(e) => setTimeColumn(e.target.value)} style={{ padding: '10px', borderRadius: '8px' }}>
            {fileHeaders.map(header => <option key={header} value={header}>{header}</option>)}
          </select>
        </label>
      </div>
      
      {error && <p style={{ color: 'var(--red-accent)', marginTop: '20px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
        <button className="primary-button" onClick={handleRunAnalysis} disabled={isLoading} style={{ width: '100%', height: '44px' }}>
          {isLoading ? <Loader size={20} className="spinner" /> : <ArrowRight size={20} />}
          {isLoading ? 'Analyzing...' : 'Generate Live Dashboard Metrics'}
        </button>
      </div>
    </div>
  );
}
