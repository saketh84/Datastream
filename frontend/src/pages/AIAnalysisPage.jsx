import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Sparkles, Loader2, Layers, ShieldAlert, RefreshCw } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import useDashboardStore from '../store'; // Zustand global state store boundary

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function AIAnalysisPage() {
  const { pipeline_tableData } = useDashboardStore(); // Hooks into post-preprocessed data matrix
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeChat, setActiveChat] = useState(1);

  useEffect(() => {
    // Automatically triggers sync & generation whenever Zustand changes
    const rows = pipeline_tableData?.rowData || pipeline_tableData?.rows || [];
    if (rows.length > 0) {
      syncAndGenerateAnalysis(rows);
    }
  }, [pipeline_tableData]);

  const syncAndGenerateAnalysis = async (rows) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/v1/sync_clean_data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: rows }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.detail || "Failed to finalize sync pipeline reporting context");
      }

      setAnalysisResult(data.analysis);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error occurred updating dataset workspace layers.');
    } finally {
      setIsLoading(false);
    }
  };

  const rows = pipeline_tableData?.rowData || pipeline_tableData?.rows || [];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F8FAFC', fontFamily: 'sans-serif' }}>
      <Sidebar activeChat={activeChat} onChatSelect={(chat) => setActiveChat(chat.id)} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Navigation Header Block */}
        <div style={{ padding: '16px 24px', backgroundColor: 'white', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#0F172A', margin: 0 }}>Automated Insights Dashboard</h1>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>AI calculations synchronized directly out of your active preprocessed table store</p>
          </div>
          {rows.length > 0 && (
            <button 
              onClick={() => syncAndGenerateAnalysis(rows)} 
              disabled={isLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: '8px', backgroundColor: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh Sync
            </button>
          )}
        </div>

        {/* Core Workspace Canvas */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {rows.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: '15vh', padding: '40px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', maxWidth: '600px', margin: '15vh auto 0' }}>
              <Layers size={40} color="#94A3B8" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B', marginBottom: '8px' }}>No Clean Preprocessed Data Detected</h3>
              <p style={{ color: '#64748B', fontSize: '14px', lineHeight: '1.5' }}>
                Please finalize your workspace transformations inside the preprocessing workspace first. Once the columns are successfully updated and committed to Zustand, your AI report will populate here.
              </p>
            </div>
          ) : isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
              <Loader2 size={36} color="#2563EB" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p style={{ color: '#64748B', fontSize: '14px', fontWeight: '500' }}>Synchronizing data tables and generating analysis structures...</p>
            </div>
          ) : error ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', backgroundColor: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '12px', color: '#991B1B', fontSize: '14px' }}>
              <ShieldAlert size={20} /> {error}
            </div>
          ) : analysisResult ? (
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Executive Cards row split */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2563EB', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>
                    <Sparkles size={16} /> Data Health & Context
                  </div>
                  <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.6', margin: 0 }}>{analysisResult.summary}</p>
                </div>

                <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#CA8A04', fontWeight: '600', fontSize: '14px', marginBottom: '12px' }}>
                    <TrendingUp size={16} /> Extracted Observations
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                    {analysisResult.trends.map((trend, i) => <li key={i} style={{ marginBottom: '6px' }}>{trend}</li>)}
                  </ul>
                </div>
              </div>

              {/* Chart Code Visualizer Component block */}
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', color: '#0F172A', marginBottom: '16px' }}>
                  <BarChart3 size={18} /> Visual Plot & Generation Snippets
                </div>

                {analysisResult.chartImage && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <img 
                      src={`data:image/png;base64,${analysisResult.chartImage}`} 
                      alt="Rendered Visualization Plot" 
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                    />
                  </div>
                )}

                <div style={{ backgroundColor: '#0F172A', borderRadius: '8px', padding: '16px', overflowX: 'auto' }}>
                  <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '13px', color: '#38BDF8' }}>
                    <code>{analysisResult.chartCode}</code>
                  </pre>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
