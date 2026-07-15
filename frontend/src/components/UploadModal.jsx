import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import useDashboardStore from '../store';
import { X, File, Database, UploadCloud, Globe } from 'lucide-react';
import Papa from 'papaparse';
import axios from 'axios';
import * as XLSX from 'xlsx';

Modal.setAppElement('#root');

export default function UploadModal({ isOpen, onRequestClose, destination }) {
  const [error, setError] = useState(null);

  // --- NEW STATE VARIABLES ---
  const [showDbModal, setShowDbModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [dbConfig, setDbConfig] = useState({
    host: '',
    port: '',
    username: '',
    password: '',
    database: '',
  });
  const [apiUrl, setApiUrl] = useState('');

  const navigate = useNavigate();
  const setFileInStore = useDashboardStore((state) => state.setFile);
  const setPipelineData = useDashboardStore((state) => state.setPipelineData);
  const fileInputRef = useRef(null);

  // --- FILE PARSER ---
  const parseFile = (file, extension) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      let headers = [];
      let jsonData = [];

      try {
        if (extension === 'csv') {
          const csvData = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
          headers = csvData.meta.fields;
          jsonData = csvData.data;
        } else if (extension === 'xls' || extension === 'xlsx') {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
          headers = Object.keys(jsonData[0] || {});
        } else {
          headers = [];
          jsonData = null;
        }

        setFileInStore(file, headers, jsonData);
        resetAndClose();
        navigate(destination);
      } catch (err) {
        setError(`Error parsing file: ${err.message}`);
        console.error(err);
      }
    };

    if (extension === 'xls' || extension === 'xlsx') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    const extension = selectedFile.name.split('.').pop().toLowerCase();
    parseFile(selectedFile, extension);
  };

  const onUploadClick = () => fileInputRef.current.click();

  // --- GOOGLE ANALYTICS HANDLER ---
  const handleGoogleAnalyticsConnect = async () => {
    try {
      const response = await axios.get(
        'http://127.0.0.1:8000/api/v1/auth/google'
      );

      localStorage.setItem('ga_redirect_destination', '/dashboard');

      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error(error);
    }
  };

  // --- DB CONNECT HANDLER ---
  const handleDbConnect = async () => {
    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/database/analyze',
        dbConfig
      );

      setAnalysisResult(response.data);
      setShowDbModal(false);
      resetAndClose();
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      setError(
        error?.response?.data?.detail ||
        'Database connection failed'
      );
    }
  };

  // --- API FETCH HANDLER ---
  const handleApiFetch = async () => {
    if (!apiUrl.trim()) {
      setError("Please provide a valid API endpoint URL.");
      return;
    }

    // SANITIZE INPUTS: Catch common user keyboard typos before dispatching to python requests
    let sanitizedUrl = apiUrl.trim();
    if (sanitizedUrl.startsWith('ttps://')) {
      sanitizedUrl = 'https://' + sanitizedUrl.substring(7);
    } else if (sanitizedUrl.startsWith('ttp://')) {
      sanitizedUrl = 'http://' + sanitizedUrl.substring(6);
    } else if (!sanitizedUrl.startsWith('http://') && !sanitizedUrl.startsWith('https://')) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    try {
      setError(null);

      // Hit the FastAPI backend API source processing gateway
      const response = await axios.post(
        'http://127.0.0.1:8000/api/v1/api-source/analyze',
        { api_url: sanitizedUrl }
      );

      // CRITICAL DATA COUPLING: Unpack all backend analytical structures 
      // (kpiData, insights, dictionary, columnDist, timeSeries, tableData, dataHealth)
      // and inject them straight into the application's layout parameters.
      setPipelineData(response.data);

      // Clean up modal states and forward the workspace environment directly to dashboard visuals
      setShowApiModal(false);
      onRequestClose();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error("API Fetch Gateway Error:", error);

      if (error?.response?.status === 422 && Array.isArray(error?.response?.data?.detail)) {
        const errorString = error.response.data.detail
          .map(err => `${err.loc.join('.')}: ${err.msg}`)
          .join(', ');
        setError(errorString);
      } else {
        setError(error?.response?.data?.detail || error?.message || 'API fetch metrics generation failed.');
      }
    }
  };
  const resetAndClose = () => {
    setError(null);
    onRequestClose();
  };

  return (
    <>
      {/* ── MAIN UPLOAD MODAL ── */}
      <Modal
        isOpen={isOpen}
        onRequestClose={resetAndClose}
        className="upload-modal"
        overlayClassName="upload-modal-overlay"
        contentLabel="Upload File Modal"
      >
        <div className="upload-modal-content">
          <div className="upload-modal-header">
            <h3>Add your data</h3>
            <p>Select a file to load into your workspace.</p>
            <button onClick={resetAndClose} className="modal-close-button">
              <X size={24} />
            </button>
          </div>

          <div className="upload-modal-bar">
            <button className="top-bar-button active">
              <File size={16} /> Files
            </button>
            <button className="top-bar-button">
              <Database size={16} /> Data Connections
            </button>
          </div>

          {/* STEP 1 — SOURCE SELECTOR GRID */}
          <div className="upload-modal-grid">

            {/* FILE UPLOAD */}
            <div className="upload-option-card" onClick={onUploadClick}>
              <div className="upload-option-icon excel">
                <UploadCloud size={24} />
              </div>

              <h4>Upload Files</h4>

              <p>
                Upload CSV, Excel, JSON, Parquet and more.
              </p>

              <button className="upload-option-button">
                Upload Files
              </button>
            </div>

            {/* GOOGLE ANALYTICS */}
            <div
              className="upload-option-card"
              onClick={handleGoogleAnalyticsConnect}
            >
              <div className="upload-option-icon sources">
                <Database size={24} />
              </div>

              <h4>Google Analytics</h4>

              <p>
                Connect GA4 website analytics instantly.
              </p>

              <button className="upload-option-button">
                Connect
              </button>
            </div>

            {/* DATABASE */}
            <div
              className="upload-option-card"
              onClick={() => setShowDbModal(true)}
            >
              <div className="upload-option-icon sources">
                <Database size={24} />
              </div>

              <h4>Database</h4>

              <p>
                Connect PostgreSQL, MySQL, MongoDB.
              </p>

              <button className="upload-option-button">
                Connect DB
              </button>
            </div>

            {/* REST API */}
            <div
              className="upload-option-card"
              onClick={() => setShowApiModal(true)}
            >
              <div className="upload-option-icon sources">
                <Globe size={24} />
              </div>

              <h4>REST API</h4>

              <p>
                Fetch analytics from external APIs.
              </p>

              <button className="upload-option-button">
                Connect API
              </button>
            </div>

          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls,.json,.parquet,.feather,.h5"
          />

          <div className="upload-modal-footer" style={{ justifyContent: 'flex-end' }}>
            {error && (
              <p className="error-status" style={{ marginRight: 'auto' }}>
                <strong>Error:</strong> {error}
              </p>
            )}
            <button className="primary-button" onClick={resetAndClose}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DATABASE CONFIG MODAL ── */}
      <Modal
        isOpen={showDbModal}
        onRequestClose={() => setShowDbModal(false)}
        className="upload-modal"
        overlayClassName="upload-modal-overlay"
        contentLabel="Database Connection Modal"
      >
        <div className="upload-modal-content">
          <div className="upload-modal-header">
            <h3>Connect a Database</h3>
            <p>Enter your connection credentials.</p>
            <button onClick={() => setShowDbModal(false)} className="modal-close-button">
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
            {['host', 'port', 'username', 'password', 'database'].map((field) => (
              <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize' }}>
                  {field}
                </label>
                <input
                  type={field === 'password' ? 'password' : 'text'}
                  placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                  value={dbConfig[field]}
                  onChange={(e) => setDbConfig((prev) => ({ ...prev, [field]: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e0e7f1',
                    fontSize: '14px',
                  }}
                />
              </div>
            ))}
          </div>

          {error && (
            <p className="error-status">
              <strong>Error:</strong> {error}
            </p>
          )}

          <div className="upload-modal-footer" style={{ justifyContent: 'flex-end', gap: '8px' }}>
            <button className="primary-button" onClick={() => setShowDbModal(false)}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={handleDbConnect}
              style={{ background: '#D07C5C', color: '#fff' }}
            >
              Connect
            </button>
          </div>
        </div>
      </Modal>

      {/* ── REST API CONFIG MODAL ── */}
      <Modal
        isOpen={showApiModal}
        onRequestClose={() => setShowApiModal(false)}
        className="upload-modal"
        overlayClassName="upload-modal-overlay"
        contentLabel="REST API Connection Modal"
      >
        <div className="upload-modal-content">
          <div className="upload-modal-header">
            <h3>Connect a REST API</h3>
            <p>Enter the endpoint URL to fetch data from.</p>
            <button onClick={() => setShowApiModal(false)} className="modal-close-button">
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '16px 0' }}>
            <label style={{ fontSize: '13px', fontWeight: 500 }}>API URL</label>
            <input
              type="text"
              placeholder="https://api.example.com/data"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #e0e7f1',
                fontSize: '14px',
              }}
            />
          </div>

          {error && (
            <p className="error-status">
              <strong>Error:</strong> {error}
            </p>
          )}

          <div className="upload-modal-footer" style={{ justifyContent: 'flex-end', gap: '8px' }}>
            <button className="primary-button" onClick={() => setShowApiModal(false)}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={handleApiFetch}
              style={{ background: '#D07C5C', color: '#fff' }}
            >
              Fetch Data
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}