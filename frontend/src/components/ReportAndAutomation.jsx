import React, { useState } from 'react';
import { Download, Loader, FileText } from 'lucide-react';
import useDashboardStore from '../store';
import axios from 'axios';

export default function ReportAndAutomation() {
  const [loading, setLoading] = useState(false);
  const { rawData, pipeline_kpiData, pipeline_dataHealth } = useDashboardStore();

  const handleGenerateReport = async () => {
    if (!rawData) return;
    setLoading(true);

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/generate-report',
        {
          rawData: rawData,
          kpiData: pipeline_kpiData?.kpis || [],
          healthData: pipeline_dataHealth || []
        },
        { responseType: 'blob' } // Important for PDF files
      );

      // Create download trigger
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Business_Intelligence_Report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card report-gen">
      <div className="card-title">
        <FileText size={18} style={{ marginRight: '8px', color: '#D07C5C' }} />
        Industry Reporting
      </div>
      <p style={{ fontSize: '0.8rem', color: '#666', marginBottom: '15px' }}>
        Export statistical analysis, KPI summaries, and data health audits as a professional document.
      </p>

      <button
        className="primary-button"
        onClick={handleGenerateReport}
        disabled={loading}
        style={{ width: '100%', gap: '10px' }}
      >
        {loading ? <Loader className="spinner" size={16} /> : <Download size={16} />}
        {loading ? "Generating PDF..." : "Generate PDF Report"}
      </button>
    </div>
  );
}