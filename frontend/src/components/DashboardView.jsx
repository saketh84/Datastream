import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useDashboardStore from '../store';
import axios from 'axios';
import PreprocessPage from '../pages/PreprocessPage';
import AIAnalysisPage from '../pages/AIAnalysisPage';

// Import all dashboard components
import KpiCard from './KpiCard';
import ActionableInsights from './ActionableInsights';
import DataDictionary from './DataDictionary';
import ColumnDistributionChart from './ColumnDistributionChart';
import TimeSeriesTrends from './TimeSeriesTrends';
import InteractiveDataTable from './InteractiveDataTable';
import DataHealthMonitoring from './DataHealthMonitoring';
import ReportAndAutomation from './ReportAndAutomation';
import CorrelationHeatmap from './CorrelationHeatmap';
import { Loader, LayoutDashboard, Settings, MessageSquare, Database } from 'lucide-react';
import '../styles/Dashboard.css';

// --- Helper function to check if a value is a date ---
function isValueDate(value) {
  if (typeof value !== 'string' || !value) {
    return false;
  }
  if (!isNaN(value) && !value.includes('-') && !value.includes('/')) {
    return false;
  }
  return !isNaN(new Date(value).getTime());
}

export default function DashboardView() {
  // Get data from the *pipeline* result
  const {
    file,
    pipeline_kpiData,
    pipeline_insights,
    pipeline_dictionary,
    pipeline_columnDist,
    pipeline_timeSeries,
    pipeline_tableData,
    pipeline_dataHealth,
    pipeline_correlationMatrix,
    rawData,
    fileHeaders,
    setPipelineData
  } = useDashboardStore();

  const navigate = useNavigate();
  const [selectedDistColumn, setSelectedDistColumn] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Section state for navigation ---
  const [activeSection, setActiveSection] = useState('overview');

  // --- Global filter state for cross-chart filtering ---
  const [globalFilter, setGlobalFilter] = useState(null);

  // --- Smart column detection logic ---
  const { categoricalHeaders, dateHeaders } = useMemo(() => {
    const cats = [];
    const dates = [];

    if (rawData && rawData.length > 0) {
      const firstRow = rawData[0];
      for (const header of fileHeaders) {
        const value = firstRow[header];

        if (typeof value === 'string') {
          if (isValueDate(value)) {
            dates.push(header);
          } else {
            cats.push(header);
          }
        }
      }
    }
    return { categoricalHeaders: cats, dateHeaders: dates };
  }, [rawData, fileHeaders]);

  // --- Filtered Data Logic ---
  const processedData = useMemo(() => {
    if (!pipeline_tableData?.rowData) return [];
    if (!globalFilter) return pipeline_tableData.rowData;

    return pipeline_tableData.rowData.filter(row =>
      row[globalFilter.column] === globalFilter.value
    );
  }, [pipeline_tableData, globalFilter]);

  // --- Guard & Auto-Analysis ---
  useEffect(() => {
    if (!file) {
      navigate('/dashboard');
      return;
    }

    if (file && !pipeline_kpiData && !isLoading) {
      const runInitialAnalysis = async () => {
        setIsLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('col_dist_target', categoricalHeaders[0] || null);
        formData.append('col_time_target', dateHeaders[0] || null);

        try {
          const response = await axios.post("http://127.0.0.1:8000/api/v1/analyze", formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          setPipelineData(response.data);
          setIsLoading(false);
        } catch (err) {
          setIsLoading(false);
          setError(err.response ? err.response.data.detail : "An error occurred during analysis.");
          console.error(err);
        }
      };

      runInitialAnalysis();
    }

    if (pipeline_columnDist) {
      setSelectedDistColumn(pipeline_columnDist.columnName);
    }
  }, [file, pipeline_kpiData, isLoading, navigate, setPipelineData, categoricalHeaders, dateHeaders]);

  // --- Single Navigation Bar Component ---
  const navTabs = (
    <nav className="dashboard-nav" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '40px',
      padding: '24px 0 20px 0',
      borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      marginBottom: '28px',
      background: 'transparent'
    }}>
      {/* Overview Tab */}
      <button
        onClick={() => setActiveSection('overview')}
        className={activeSection === 'overview' ? "nav-link-active" : "nav-link"}
        style={{
          color: activeSection === 'overview' ? '#10b981' : '#6b7280',
          fontSize: '13px',
          fontWeight: activeSection === 'overview' ? '600' : '500',
          letterSpacing: '0.8px',
          textDecoration: 'none',
          padding: '8px 4px',
          borderBottom: activeSection === 'overview' ? '2px solid #10b981' : '2px solid transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          textTransform: 'uppercase',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: 'transparent',
          cursor: 'pointer',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <LayoutDashboard size={16} />
        01 OVERVIEW
        {activeSection === 'overview' && (
          <span style={{
            position: 'absolute',
            bottom: '-2px',
            left: '0',
            right: '0',
            height: '2px',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            borderRadius: '2px'
          }} />
        )}
      </button>

      {/* Preprocess Tab */}
      <button
        onClick={() => setActiveSection('preprocess')}
        className={activeSection === 'preprocess' ? "nav-link-active" : "nav-link"}
        style={{
          color: activeSection === 'preprocess' ? '#10b981' : '#6b7280',
          fontSize: '13px',
          fontWeight: activeSection === 'preprocess' ? '600' : '500',
          letterSpacing: '0.8px',
          textDecoration: 'none',
          padding: '8px 4px',
          borderBottom: activeSection === 'preprocess' ? '2px solid #10b981' : '2px solid transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          textTransform: 'uppercase',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: 'transparent',
          cursor: 'pointer',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <Settings size={16} />
        02 PREPROCESS
        {activeSection === 'preprocess' && (
          <span style={{
            position: 'absolute',
            bottom: '-2px',
            left: '0',
            right: '0',
            height: '2px',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            borderRadius: '2px'
          }} />
        )}
      </button>

      {/* AI Chat Tab */}
      <button
        onClick={() => setActiveSection('chat')}
        className={activeSection === 'chat' ? "nav-link-active" : "nav-link"}
        style={{
          color: activeSection === 'chat' ? '#10b981' : '#6b7280',
          fontSize: '13px',
          fontWeight: activeSection === 'chat' ? '600' : '500',
          letterSpacing: '0.8px',
          textDecoration: 'none',
          padding: '8px 4px',
          borderBottom: activeSection === 'chat' ? '2px solid #10b981' : '2px solid transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          textTransform: 'uppercase',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          background: 'transparent',
          cursor: 'pointer',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <MessageSquare size={16} />
        03 AI CHAT
        {activeSection === 'chat' && (
          <span style={{
            position: 'absolute',
            bottom: '-2px',
            left: '0',
            right: '0',
            height: '2px',
            background: 'linear-gradient(90deg, #10b981, #34d399)',
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
            borderRadius: '2px'
          }} />
        )}
      </button>

      {/* Right side - File indicator */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 16px',
        background: 'rgba(16, 185, 129, 0.08)',
        borderRadius: '20px',
        border: '1px solid rgba(16, 185, 129, 0.15)'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#10b981',
          animation: 'pulse 2s infinite'
        }} />
        <span style={{
          color: '#9ca3af',
          fontSize: '12px',
          fontWeight: '400',
          letterSpacing: '0.3px'
        }}>
          {file?.name || 'No file loaded'}
        </span>
      </div>
    </nav>
  );

  // --- Section Content Renderer ---
  const renderSectionContent = () => {
    if (!file) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60vh',
          gap: '16px'
        }}>
          <div style={{
            padding: '48px',
            background: 'rgba(16, 185, 129, 0.05)',
            borderRadius: '16px',
            border: '2px dashed rgba(16, 185, 129, 0.2)',
            textAlign: 'center'
          }}>
            <Database size={48} color="#6b7280" />
            <h3 style={{ color: '#e5e7eb', marginTop: '16px' }}>No File Uploaded</h3>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Please upload a file to start the analysis
            </p>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return renderOverviewContent();
      case 'preprocess':
        return renderPreprocessContent();
      case 'chat':
        return renderChatContent();
      default:
        return renderOverviewContent();
    }
  };

  // --- Overview Content View ---
  const renderOverviewContent = () => {
    if (isLoading) {
      return (
        <div className="loading-container" style={{ height: '60vh' }}>
          <Loader className="spinner" />
          <h2>Running Initial Analysis...</h2>
        </div>
      );
    }

    if (error) {
      return (
        <div className="upload-box" style={{ width: '600px', margin: '5% auto' }}>
          <h2 style={{ marginBottom: '20px' }}>Analysis Failed</h2>
          <p style={{ color: 'var(--red-accent)' }}>
            <strong>Error:</strong> {error}
          </p>
        </div>
      );
    }

    if (pipeline_kpiData) {
      return (
        <div className="dashboard-layout" style={{ padding: '0' }}>
          <KpiCard
            gridArea="kpi-1"
            title="Total Records"
            value={pipeline_kpiData.totalRecords}
            delta={pipeline_kpiData.totalRecordsDelta}
          />
          <KpiCard
            gridArea="kpi-2"
            title="Data Quality"
            value={pipeline_kpiData.dataQuality}
            delta={pipeline_kpiData.dataQualityDelta}
          />
          <KpiCard
            gridArea="kpi-3"
            title="Columns"
            value={pipeline_kpiData.columns}
            delta={pipeline_kpiData.columnsDelta}
          />
          <KpiCard
            gridArea="kpi-4"
            title="Total Anomalies"
            value={
              Array.isArray(pipeline_kpiData.anomalies)
                ? pipeline_kpiData.anomalies.length
                : Number(pipeline_kpiData.anomalies || 0)
            }
            delta={pipeline_kpiData.anomaliesDelta}
            deltaType={pipeline_kpiData.anomaliesDeltaType}
          />

          <ActionableInsights insights={pipeline_insights} />
          <DataDictionary dictionary={pipeline_dictionary} />

          <ColumnDistributionChart
            initialColumn={pipeline_columnDist?.columnName}
            allColumns={categoricalHeaders}
            onColumnChange={(newColumn) => setSelectedDistColumn(newColumn)}
            onBarClick={(val) => setGlobalFilter({ column: selectedDistColumn, value: val })}
            data={processedData}
          />

          <TimeSeriesTrends
            initialColumn={pipeline_timeSeries?.timeColumn}
            initialData={
              Array.isArray(pipeline_timeSeries?.seriesData)
                ? pipeline_timeSeries.seriesData.map(item =>
                  typeof item === 'object' && item !== null ? item.value : item
                )
                : []
            }
            initialXAxis={
              Array.isArray(pipeline_timeSeries?.xAxisData)
                ? pipeline_timeSeries.xAxisData.map(item =>
                  typeof item === 'object' && item !== null ? (item.date || item.label || JSON.stringify(item)) : item
                )
                : []
            }
            allColumns={dateHeaders}
            showForecast={true}
            forecastData={
              Array.isArray(pipeline_kpiData?.forecast)
                ? pipeline_kpiData.forecast.map(item =>
                  typeof item === 'object' ? { date: item.date ?? '', value: item.value ?? 0 } : item
                )
                : []
            }
            anomalies={
              Array.isArray(pipeline_kpiData?.timeSeriesAnomalies)
                ? pipeline_kpiData.timeSeriesAnomalies.map(item =>
                  typeof item === 'object' ? { date: item.date ?? '', value: item.value ?? 0 } : item
                )
                : (Array.isArray(pipeline_kpiData?.anomalies)
                  ? pipeline_kpiData.anomalies.map(item =>
                    typeof item === 'object' ? { date: item.date ?? '', value: item.value ?? 0 } : item
                  )
                  : [])
            }
          />

          {globalFilter && (
            <button
              onClick={() => setGlobalFilter(null)}
              className="filter-chip"
              style={{
                border: 'none',
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                marginBottom: '15px',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <span>Filtering {globalFilter.column}: {globalFilter.value}</span>
              <span style={{ fontSize: '16px' }}>✕</span>
            </button>
          )}

          <InteractiveDataTable
            rowData={processedData}
            columnDefs={pipeline_tableData.columnDefs}
            onColumnHeaderClick={(col) => setSelectedDistColumn(col)}
          />

          <div className="correlation-heatmap">
            <CorrelationHeatmap heatmapData={pipeline_correlationMatrix} />
          </div>

          <div className="health-report-stack">
            <DataHealthMonitoring healthData={pipeline_dataHealth} />
            <ReportAndAutomation />
          </div>
        </div>
      );
    }

    return (
      <div className="loading-container" style={{ height: '60vh' }}>
        <Loader className="spinner" />
        <h2>Loading Dashboard...</h2>
      </div>
    );
  };

  // --- Preprocess Section View ---
  const renderPreprocessContent = () => {
    return <PreprocessPage />;
  };

  // --- AI Chat Section View ---
  const renderChatContent = () => {
    return <AIAnalysisPage />;
  };

  return (
    <div className="dashboard-page-container" style={{ padding: '0 32px', maxWidth: '1440px', margin: '0 auto', background: 'transparent' }}>
      {navTabs}
      <div className="page-content">
        {renderSectionContent()}
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.95); } }
        .nav-link:hover { color: #d1d5db !important; }
        .nav-link-active { text-shadow: 0 0 20px rgba(16, 185, 129, 0.15); }
        .dashboard-page-container::-webkit-scrollbar { width: 6px; }
        .dashboard-page-container::-webkit-scrollbar-track { background: transparent; }
        .dashboard-page-container::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.3); border-radius: 3px; }
        .dashboard-page-container::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.5); }
      `}</style>
    </div>
  );
}